import test from 'node:test';
import assert from 'node:assert/strict';
import { peringatanKurikulum, seninIni, bacaAdaUlangan } from '../src/lib/peringatan-kurikulum.ts';

const live = { kurikulum: true, penempatan: true, ulangan: true };
const dasar = { live, level: 'N2', kurikulumJalan: true, hariIni: '2026-11-17', adaUlangan: true, ulanganSelesai: false, ulanganDilewati: false };
// 2026-11-16 = Senin, 17 = Selasa, 18 = Rabu, 19 = Kamis

test('an account without a running curriculum is asked to take the placement test', () => {
  const [p] = peringatanKurikulum({ ...dasar, kurikulumJalan: false });
  assert.equal(p.id, 'kurikulum-belum-mulai');
  assert.match(p.judul, /Kurikulum N2 belum jalan/);
  assert.equal(p.aksi.href, '/penempatan');
  assert.equal(p.aksi.label, 'Mulai tes penempatan');
  assert.equal(p.hanyaLonceng, true);
});

test('nothing is said when the curriculum state could not be read or the feature is off', () => {
  assert.deepEqual(peringatanKurikulum({ ...dasar, kurikulumJalan: null }), []);
  assert.deepEqual(peringatanKurikulum({ ...dasar, kurikulumJalan: false, live: { ...live, kurikulum: false } }), []);
});

test('a missed Monday test is chased on Tuesday and Wednesday only', () => {
  assert.deepEqual(peringatanKurikulum({ ...dasar, hariIni: '2026-11-16' }), []); // Senin: kartu Misi
  assert.equal(peringatanKurikulum({ ...dasar, hariIni: '2026-11-17' })[0].id, 'ulangan-2026-11-16');
  assert.match(peringatanKurikulum({ ...dasar, hariIni: '2026-11-18' })[0].pesan, /Hari terakhir/);
  assert.deepEqual(peringatanKurikulum({ ...dasar, hariIni: '2026-11-19' }), []);
});

test('the test reminder stays quiet once done, skipped, or when there is nothing to test', () => {
  assert.deepEqual(peringatanKurikulum({ ...dasar, ulanganSelesai: true }), []);
  assert.deepEqual(peringatanKurikulum({ ...dasar, ulanganDilewati: true }), []);
  assert.deepEqual(peringatanKurikulum({ ...dasar, adaUlangan: false }), []);
  assert.deepEqual(peringatanKurikulum({ ...dasar, adaUlangan: null }), []);
});

test('week markers belong to this week only', () => {
  assert.equal(seninIni('2026-11-18'), '2026-11-16');
  assert.equal(seninIni('2026-11-22'), '2026-11-16'); // Minggu masih minggu yang sama
  assert.equal(bacaAdaUlangan('2026-11-16:1', '2026-11-16'), true);
  assert.equal(bacaAdaUlangan('2026-11-09:1', '2026-11-16'), null);
  assert.equal(bacaAdaUlangan(null, '2026-11-16'), null);
});
