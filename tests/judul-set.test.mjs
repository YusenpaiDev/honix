import test from 'node:test';
import assert from 'node:assert/strict';
import { judulSet } from '../src/lib/judul-set.ts';

test('exam session names are hidden', () => {
  assert.equal(judulSet('JLPT N2 2024年12月'), 'Set latihan N2');
  assert.equal(judulSet('JLPT N2 2024年12月 聴解'), 'Set latihan N2 · 聴解');
  assert.equal(judulSet('2024年12月 筆記'), 'Set latihan · 筆記');
  assert.equal(judulSet('2024年12月 筆記 · retry'), 'Set latihan · 筆記 · retry');
  assert.equal(judulSet('JLPT N2 — 2025年7月 過去問'), 'Set latihan N2');
  assert.equal(judulSet('JLPT N3 2016 年 7 月 聴解'), 'Set latihan N3 · 聴解');
  assert.equal(judulSet('N1 過去問'), 'Set latihan N1');
});

test('titles without an exam session stay as they are', () => {
  for (const t of ['Drill Bunpou N2', '文法問題 #14', 'Lembar Tugas N3 文法', 'Set latihan N2 · 文法・読解 #3', 'JLPT N2 Mock']) assert.equal(judulSet(t), t);
  assert.equal(judulSet(null), '');
  assert.equal(judulSet('  '), '');
});

test('no year or month digits survive', () => {
  for (const t of ['JLPT N2 2024年12月 聴解', '2023年7月 筆記', 'JLPT N1 — 2010年12月 過去問 · 読解']) {
    assert.doesNotMatch(judulSet(t), /\d{4}|年|月|過去問|JLPT/);
  }
});
