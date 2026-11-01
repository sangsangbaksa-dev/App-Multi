const test = require('node:test'), assert = require('node:assert'), api = require('../api/license.js');
const ENV = { LEMONSQUEEZY_PRODUCT_ID: 'prod-1' };
const fake = (body, calls) => async (url, opts) => { if (calls) calls.push({ url, opts }); return { json: async () => body }; };
const GOOD = { valid: true, license_key: { status: 'active' }, meta: { product_id: 'prod-1' } };

test('not configured when disabled: no upstream call', async () => {
  const calls = []; const r = await api.verify('ABCD-EFGH-1234', { LEMONSQUEEZY_DISABLED: '1' }, fake({}, calls));
  assert.deepEqual(r, { configured: false }); assert.equal(calls.length, 0);
});
test('paid key for our product is valid', async () => {
  const calls = []; const r = await api.verify('ABCD-EFGH-1234', ENV, fake(GOOD, calls));
  assert.deepEqual(r, { configured: true, valid: true });
  assert.equal(calls[0].url, 'https://api.lemonsqueezy.com/v1/licenses/validate');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].opts.body)), { license_key: 'ABCD-EFGH-1234' });
});
test('refunded, charged-back or unknown keys are not valid', async () => {
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ valid: true, license_key: { status: 'disabled' }, meta: { product_id: 'prod-1' } }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ valid: true, license_key: { status: 'expired' }, meta: { product_id: 'prod-1' } }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ ...GOOD, meta: { product_id: 'other' } }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ valid: false, error: 'license_key not found' }))).valid, false);
});
test('malformed or error responses are not valid', async () => {
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, async () => ({ json: async () => { throw new Error('x'); } }))).valid, false);
});
function run(req, env) {
  const old = { ...process.env }; Object.assign(process.env, env);
  const out = { headers: {} }, res = { setHeader: (k, v) => { out.headers[k] = v; }, end: b => { out.body = JSON.parse(b); } };
  return api(req, res).then(() => { process.env = old; return Object.assign(out, { status: res.statusCode }); });
}
test('handler: method, disabled, bad key', async () => {
  delete process.env.LEMONSQUEEZY_PRODUCT_ID;
  assert.equal((await run({ method: 'GET' }, {})).status, 405);
  const a = await run({ method: 'POST', body: { key: 'ABCD-EFGH-1234' } }, { LEMONSQUEEZY_DISABLED: '1' }); assert.deepEqual(a.body, { configured: false }); assert.equal(a.headers['Cache-Control'], 'no-store');
  assert.equal((await run({ method: 'POST', body: { key: 'bad key!' } }, ENV)).status, 400);
  assert.equal((await run({ method: 'POST', body: '{not json' }, ENV)).status, 400);
});
