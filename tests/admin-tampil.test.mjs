import test from 'node:test';
import assert from 'node:assert/strict';
import { tren, atasRapi, jalurArea, perluDicek } from '../src/lib/admin/tampil.ts';

const hari = (ns) => ns.map((n, i) => ({ tanggal: `2026-11-${String(i + 1).padStart(2, '0')}`, n }));

test('trend compares the last 7 days with the 7 before', () => {
  const d = hari([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]);
  assert.deepEqual(tren(d), { ini: 14, lalu: 7, persen: 100 });
  assert.equal(tren(hari([0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0])).persen, null);
});

test('axis top rounds up to a readable number', () => {
  assert.equal(atasRapi(0), 4);
  assert.equal(atasRapi(5), 5);
  assert.equal(atasRapi(14), 20);
  assert.equal(atasRapi(230), 250);
  assert.equal(atasRapi(1000), 1000);
});

test('area path spans the full width and closes on the baseline', () => {
  const { titik, area, atas } = jalurArea(hari([0, 5, 10]), 200, 100);
  assert.equal(atas, 10);
  assert.deepEqual(titik.map(t => [t.x, t.y]), [[0, 100], [100, 50], [200, 0]]);
  assert.match(area, /L200 100 L0 100 Z$/);
});

test('things to check are ordered by severity and empty when all is well', () => {
  const kosong = { pendingNyangkut: 0, errorHari: 0, sesiReview: 0, segeraHabis: 0, bankKosong: [] };
  assert.deepEqual(perluDicek(kosong), []);
  assert.deepEqual(perluDicek({ ...kosong, errorHari: null, sesiReview: null }), []);
  const c = perluDicek({ ...kosong, segeraHabis: 2, pendingNyangkut: 1, bankKosong: ['N5 読解'] });
  assert.deepEqual(c.map(x => x.nada), ['bad', 'warn', 'warn']);
  assert.match(c[0].judul, /PENDING/);
});
