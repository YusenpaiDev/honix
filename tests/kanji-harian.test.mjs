import test from 'node:test';
import assert from 'node:assert/strict';
import { hariKe, susunKanjiPool, toRomaji, okuriDot } from '../src/lib/kanji-harian.ts';
import n5 from '../src/data/kotoba/N5.json' with { type: 'json' };
import n4 from '../src/data/kotoba/N4.json' with { type: 'json' };
import n3 from '../src/data/kotoba/N3.json' with { type: 'json' };
import n2 from '../src/data/kotoba/N2.json' with { type: 'json' };
import n1 from '../src/data/kotoba/N1.json' with { type: 'json' };

const pool = susunKanjiPool([n5, n4, n3, n2, n1].flatMap(d => d.vocabulary ?? []));

test('day of year counts from 1 January as day 1', () => {
  assert.equal(hariKe(new Date(2026, 0, 1, 9)), 1);
  assert.equal(hariKe(new Date(2026, 10, 18, 21)), 322);
});

test('moving the kanji to the server keeps the same card per date', () => {
  // 18 Nov 2026 di Beranda produksi sebelum dipindah: 出口 (でぐち)
  const k = pool[hariKe(new Date(2026, 10, 18, 21)) % pool.length];
  assert.equal(k.word, '出口');
  assert.equal(k.romaji, 'deguchi');
  assert.equal(k.level, 'N5');
});

test('the pool only holds words with kanji and an example sentence', () => {
  assert.ok(pool.length > 366);
  assert.ok(pool.every(k => /[一-龿]/.test(k.word) && k.example));
});

test('romaji and okurigana split read naturally', () => {
  assert.equal(toRomaji('きって'), 'kitte');
  assert.equal(toRomaji('しゃしん'), 'shashin');
  assert.equal(okuriDot('挑む', 'いどむ'), 'いど・む');
});
