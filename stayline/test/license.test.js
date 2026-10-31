const test = require('node:test'), assert = require('node:assert'), api = require('../api/license.js');
const ENV = { POLAR_ORGANIZATION_ID: 'org-1', POLAR_BENEFIT_ID: 'ben-1' };
const fake = (body, calls) => async (url, opts) => { if (calls) calls.push({ url, opts }); return { json: async () => body }; };

test('not configured without env vars: no upstream call', async () => {
  const calls = []; const r = await api.verify('ABCD-EFGH-1234', {}, fake({}, calls));
  assert.deepEqual(r, { configured: false }); assert.equal(calls.length, 0);
  assert.deepEqual(await api.verify('ABCD-EFGH-1234', { POLAR_ORGANIZATION_ID: 'org-1' }, fake({})), { configured: false });
});
test('granted key for our benefit', async () => {
  const calls = []; const r = await api.verify('ABCD-EFGH-1234', ENV, fake({ status: 'granted', benefit_id: 'ben-1' }, calls));
  assert.deepEqual(r, { configured: true, valid: true });
  assert.equal(calls[0].url, 'https://api.polar.sh/v1/customer-portal/license-keys/validate');
  assert.deepEqual(JSON.parse(calls[0].opts.body), { key: 'ABCD-EFGH-1234', organization_id: 'org-1', benefit_id: 'ben-1' });
});
test('key of another benefit, revoked, disabled or expired is rejected', async () => {
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ status: 'granted', benefit_id: 'other' }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ status: 'granted' }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ status: 'revoked', benefit_id: 'ben-1' }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ status: 'disabled', benefit_id: 'ben-1' }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ status: 'granted', benefit_id: 'ben-1', expires_at: '2000-01-01T00:00:00Z' }))).valid, false);
});
test('invalid, malformed or error responses are not valid', async () => {
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ detail: 'Not found' }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, async () => ({ json: async () => { throw new Error('x'); } }))).valid, false);
});
function run(req, env) {
  const old = { ...process.env }; Object.assign(process.env, env);
  const out = { headers: {} }, res = { setHeader: (k, v) => { out.headers[k] = v; }, end: b => { out.body = JSON.parse(b); } };
  return api(req, res).then(() => { process.env = old; return Object.assign(out, { status: res.statusCode }); });
}
test('handler: method, missing env, bad key', async () => {
  delete process.env.POLAR_ORGANIZATION_ID; delete process.env.POLAR_BENEFIT_ID;
  assert.equal((await run({ method: 'GET' }, {})).status, 405);
  const a = await run({ method: 'POST', body: { key: 'ABCD-EFGH-1234' } }, {}); assert.deepEqual(a.body, { configured: false }); assert.equal(a.headers['Cache-Control'], 'no-store');
  assert.equal((await run({ method: 'POST', body: { key: 'bad key!' } }, ENV)).status, 400);
  assert.equal((await run({ method: 'POST', body: '{not json' }, ENV)).status, 400);
});
