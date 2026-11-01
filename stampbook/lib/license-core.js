/* Platform-neutral licence check shared by api/license.js (Vercel/Node) and functions/api/license.js (Cloudflare Pages).
   check({ method, body, env, fetchFn }) -> { status, body }. The only I/O is the call to Gumroad's licence API
   (POST https://api.gumroad.com/v2/licenses/verify). Gumroad takes the product id and the key, so no secret is stored.
   See api/license.js for the request/response contract. The key is never logged or stored. */
const GUMROAD = 'https://api.gumroad.com/v2/licenses/verify';
const KEY_RE = /^[A-Za-z0-9-]{8,80}$/;

async function check({ method, body, env, fetchFn }) {
  const product = env && env.GUMROAD_PRODUCT_ID;
  if (method !== 'POST') return { status: 405, body: { ok: false, reason: 'method' } };
  if (!product) return { status: 200, body: { configured: false } };
  if (!body || typeof body.key !== 'string' || !KEY_RE.test(body.key.trim())) return { status: 400, body: { configured: true, ok: false, reason: 'bad_request' } };
  const key = body.key.trim();
  let j, status;
  try {
    const r = await fetchFn(GUMROAD, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ product_id: product, license_key: key, increment_uses_count: 'false' }).toString()
    });
    status = r.status;
    j = await r.json();
  } catch (e) { return { status: 502, body: { configured: true, ok: false, reason: 'unreachable' } }; }
  if (status >= 500) return { status: 502, body: { configured: true, ok: false, reason: 'unreachable' } };
  if (!j || j.success !== true) return { status: 200, body: { configured: true, ok: false, reason: 'invalid' } };
  // A refunded or charged-back purchase keeps the key on record but must not unlock Pro.
  const p = j.purchase || {};
  if (p.refunded || p.chargebacked) return { status: 200, body: { configured: true, ok: false, reason: 'refunded' } };
  // Gumroad has no activation step, so there is no instance id; the browser keeps the key alone.
  return { status: 200, body: { configured: true, ok: true, instanceId: '' } };
}
module.exports = { check, KEY_RE };
