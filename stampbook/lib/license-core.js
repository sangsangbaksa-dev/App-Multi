/* Platform-neutral licence check shared by api/license.js (Vercel/Node) and functions/api/license.js (Cloudflare Pages).
   check({ method, body, env, fetchFn }) -> { status, body }. No I/O except the call to the Lemon Squeezy License API.
   See api/license.js for the request/response contract. The key is never logged or stored. */
const LS = 'https://api.lemonsqueezy.com/v1/licenses/';
const KEY_RE = /^[A-Za-z0-9-]{8,80}$/;

async function check({ method, body, env, fetchFn }) {
  const store = env && env.LS_STORE_ID, product = env && env.LS_PRODUCT_ID;
  if (method !== 'POST') return { status: 405, body: { ok: false, reason: 'method' } };
  if (!store || !product) return { status: 200, body: { configured: false } };
  const b = body;
  if (!b || typeof b.key !== 'string' || !KEY_RE.test(b.key.trim())) return { status: 400, body: { configured: true, ok: false, reason: 'bad_request' } };
  const action = b.action === 'validate' ? 'validate' : 'activate';
  const form = new URLSearchParams({ license_key: b.key.trim() });
  if (action === 'activate') form.set('instance_name', 'stampbook-browser');
  else {
    if (typeof b.instanceId !== 'string' || !/^[\w-]{8,64}$/.test(b.instanceId)) return { status: 400, body: { configured: true, ok: false, reason: 'bad_request' } };
    form.set('instance_id', b.instanceId);
  }
  let j;
  try {
    const r = await fetchFn(LS + action, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' }, body: form });
    j = await r.json();
  } catch (e) { return { status: 502, body: { configured: true, ok: false, reason: 'unreachable' } }; }
  const good = action === 'activate' ? j && j.activated === true : j && j.valid === true;
  if (!good) return { status: 200, body: { configured: true, ok: false, reason: 'invalid' } };
  const m = j.meta || {};
  if (String(m.store_id) !== String(store) || String(m.product_id) !== String(product)) return { status: 200, body: { configured: true, ok: false, reason: 'wrong_product' } };
  const status = j.license_key && j.license_key.status;
  if (status && status !== 'active' && status !== 'inactive') return { status: 200, body: { configured: true, ok: false, reason: 'invalid' } };
  return { status: 200, body: { configured: true, ok: true, instanceId: j.instance && j.instance.id ? String(j.instance.id) : (b.instanceId || '') } };
}
module.exports = { check, KEY_RE };
