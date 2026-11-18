import test from 'node:test';
import assert from 'node:assert/strict';
import { DISCORD_INVITE, bacaStatus, tampilDiLonceng, tampilDiBeranda, PERINGATAN_KOMUNITAS } from '../src/lib/komunitas.ts';

test('the invite is a permanent discord.gg link and the bell item opens it in a new tab', () => {
  assert.match(DISCORD_INVITE, /^https:\/\/discord\.gg\/[A-Za-z0-9]+$/);
  assert.equal(PERINGATAN_KOMUNITAS.aksi.href, DISCORD_INVITE);
  assert.equal(PERINGATAN_KOMUNITAS.aksi.eksternal, true);
});

test('unknown storage values count as never seen', () => {
  assert.equal(bacaStatus(null), null);
  assert.equal(bacaStatus('ngaco'), null);
  assert.equal(bacaStatus('dilihat'), 'dilihat');
  assert.equal(bacaStatus('selesai'), 'selesai');
});

test('the bell shows the invite once, keeping it while that first look is open', () => {
  assert.equal(tampilDiLonceng(null, false), true);
  assert.equal(tampilDiLonceng('dilihat', true), true);
  assert.equal(tampilDiLonceng('dilihat', false), false);
  assert.equal(tampilDiLonceng('selesai', true), false);
});

test('the Beranda card stays until joined or closed', () => {
  assert.equal(tampilDiBeranda(null), true);
  assert.equal(tampilDiBeranda('dilihat'), true);
  assert.equal(tampilDiBeranda('selesai'), false);
});
