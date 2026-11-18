import test from 'node:test';
import assert from 'node:assert/strict';

const isi = new Map();
globalThis.localStorage = {
  getItem: k => (isi.has(k) ? isi.get(k) : null),
  setItem: (k, v) => isi.set(k, String(v)),
  removeItem: k => isi.delete(k),
  clear: () => isi.clear(),
  key: i => [...isi.keys()][i] ?? null,
  get length() { return isi.size; },
};
// Object.keys(localStorage) di browser = daftar kunci; tiru buat hapusCacheLokal
const asli = Object.keys;
Object.keys = o => (o === globalThis.localStorage ? [...isi.keys()] : asli(o));

const { bacaCache, simpanCache, hapusCacheLokal } = await import('../src/lib/cache-lokal.ts');

test('a saved copy comes back for the same account', () => {
  isi.clear();
  simpanCache('stats-v1', 'akun-a', { streak: 13, level: 'N2' });
  assert.deepEqual(bacaCache('stats-v1', 'akun-a'), { streak: 13, level: 'N2' });
});

test("another account never sees the previous account's copy", () => {
  isi.clear();
  simpanCache('beranda-v1', 'akun-a', { name: 'Yusuf' });
  assert.equal(bacaCache('beranda-v1', 'akun-b'), null);
  assert.equal(bacaCache('beranda-v1', null), null);
});

test('logging out removes every copy but leaves other app settings', () => {
  isi.clear();
  simpanCache('stats-v1', 'akun-a', { x: 1 });
  simpanCache('misi-v1', 'akun-a', { y: 2 });
  localStorage.setItem('honix-komunitas', 'selesai');
  hapusCacheLokal();
  assert.equal(bacaCache('stats-v1', 'akun-a'), null);
  assert.equal(bacaCache('misi-v1', 'akun-a'), null);
  assert.equal(localStorage.getItem('honix-komunitas'), 'selesai');
});

test('oversized copies are dropped instead of filling storage', () => {
  isi.clear();
  simpanCache('beranda-v1', 'akun-a', { kecil: true });
  simpanCache('beranda-v1', 'akun-a', { besar: 'x'.repeat(500_000) });
  assert.equal(bacaCache('beranda-v1', 'akun-a'), null);
});

test('corrupt storage reads as empty, not as a crash', () => {
  isi.clear();
  localStorage.setItem('honix-c:stats-v1', '{rusak');
  assert.equal(bacaCache('stats-v1', 'akun-a'), null);
});
