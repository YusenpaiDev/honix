import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { tandaTanganPermintaan, waktuIpaymu, tandaTanganCallback, samaAman, statusDariKode, bacaIsiCallback } from '../src/lib/ipaymu-aturan.ts';

test('request signature follows METHOD:VA:sha256(body):APIKEY signed with the API key', () => {
  const body = JSON.stringify({ product: ['Pro'], qty: ['1'], price: ['129000'] });
  const hash = createHash('sha256').update(body).digest('hex');
  const harus = createHmac('sha256', 'KUNCI').update(`POST:1179000:${hash}:KUNCI`).digest('hex');
  assert.equal(tandaTanganPermintaan('post', '1179000', body, 'KUNCI'), harus);
});

test('timestamp is 14 digits in Jakarta time', () => {
  assert.equal(waktuIpaymu(new Date('2026-11-23T13:05:09Z')), '20261123200509');
});

test('callback signature: types normalised, keys sorted, PHP-style JSON, keyed by VA', () => {
  const form = 'trx_id=123&status=berhasil&status_code=1&reference_id=SJLPT-x&url=https://a.b/c&sid=S1&signature=abc&is_escrow=0';
  const isi = bacaIsiCallback(form, 'application/x-www-form-urlencoded');
  const json = '{"additional_info":[],"is_escrow":false,"reference_id":"SJLPT-x","sid":"S1","status":"berhasil","status_code":1,"trx_id":123,"url":"https:\\/\\/a.b\\/c"}';
  const harus = createHmac('sha256', 'VA1').update(json).digest('hex');
  assert.equal(tandaTanganCallback(isi, 'VA1'), harus);
  assert.ok(samaAman(harus.toUpperCase(), harus));
  assert.ok(!samaAman(harus, harus.slice(1)));
});

test('non-ASCII in callbacks is escaped the way PHP does', () => {
  const json = '{"additional_info":[],"buyer_name":"Y\\u016bsuf"}';
  assert.equal(tandaTanganCallback({ buyer_name: 'Yūsuf' }, 'V'), createHmac('sha256', 'V').update(json).digest('hex'));
});

test('status codes map to our transaction states, unknown waits', () => {
  assert.equal(statusDariKode(1), 'lunas');
  assert.equal(statusDariKode('6'), 'lunas');
  assert.equal(statusDariKode(0), 'pending');
  assert.equal(statusDariKode(-2), 'kadaluarsa');
  assert.equal(statusDariKode(3), 'refund');
  assert.equal(statusDariKode(5), 'gagal');
  assert.equal(statusDariKode(99), 'pending');
  assert.equal(statusDariKode(undefined), 'pending');
});

test('JSON callbacks are read too', () => {
  assert.deepEqual(bacaIsiCallback('{"trx_id":5}', 'application/json; charset=utf-8'), { trx_id: 5 });
});
