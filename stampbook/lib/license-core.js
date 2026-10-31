/* Platform-neutral licence check shared by api/license.js (Vercel/Node) and functions/api/license.js (Cloudflare Pages).
   check({ method, body, env, fetchFn }) -> { status, body }. No I/O except the call to the Polar licence-key API
   (customer-portal endpoints, which take the key itself as the credential, so no access token is stored).
   See api/license.js for the request/response contract. The key is never logged or stored. */
const POLAR = 'https://api.polar.sh/v1/customer-portal/license-keys/';
const KEY_RE = /^[A-Za-z0-9-]{8,80}$/;
const ID_RE = /^[\w-]{8,64}$/;

async function check({ method, body, env, fetchFn }) {
  const org = env && env.POLAR_ORGANIZATION_ID, benefit = env && env.POLAR_BENEFIT_ID;
  if (method !== 'POST') return { status: 405, body: { ok: false, reason: 'method' } };
  if (!org || !benefit) return { status: 200, body: { configured: false } };
  const b = body;
  if (!b || typeof b.key !== 'string' || !KEY_RE.test(b.key.trim())) return { status: 400, body: { configured: true, ok: false, reason: 'bad_request' } };
  const action = b.action === 'validate' ? 'validate' : 'activate';
  const req = { key: b.key.trim(), organization_id: org };
  if (action === 'activate') req.label = 'stampbook-browser';
  else {
    if (typeof b.instanceId !== 'string' || !ID_RE.test(b.instanceId)) return { status: 400, body: { configured: true, ok: false, reason: 'bad_request' } };
    req.activation_id = b.instanceId; req.benefit_id = benefit;
  }
  let j, httpOk;
  try {
    const r = await fetchFn(POLAR + action, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(req) });
    httpOk = r.ok !== false && (r.status === undefined || r.status < 300);
    j = await r.json();
  } catch (e) { return { status: 502, body: { configured: true, ok: false, reason: 'unreachable' } }; }
  if (!httpOk || !j) return { status: 200, body: { configured: true, ok: false, reason: 'invalid' } };
  // activate returns the activation with the licence key nested; validate returns the licence key itself
  const lk = action === 'activate' ? j.license_key : j;
  if (!lk) return { status: 200, body: { configured: true, ok: false, reason: 'invalid' } };
  if (String(lk.benefit_id) !== String(benefit)) return { status: 200, body: { configured: true, ok: false, reason: 'wrong_product' } };
  const exp = lk.expires_at ? Date.parse(lk.expires_at) : NaN;
  if (lk.status !== 'granted' || exp <= Date.now()) return { status: 200, body: { configured: true, ok: false, reason: 'invalid' } };
  const id = action === 'activate' ? j.id : (j.activation && j.activation.id) || b.instanceId;
  return { status: 200, body: { configured: true, ok: true, instanceId: id ? String(id) : '' } };
}
module.exports = { check, KEY_RE };
