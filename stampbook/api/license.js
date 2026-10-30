/* Licence check for Stampbook Pro, backed by the Lemon Squeezy License API (https://docs.lemonsqueezy.com/api/license-api).
   Configure with environment variables in the Vercel project:
     LS_STORE_ID    the numeric store id that sells Stampbook
     LS_PRODUCT_ID  the numeric product id of Stampbook Pro
   If either is missing the function answers {configured:false} and the app keeps its built-in offline check.
   The License API needs no secret key. The store/product ids are checked so a key bought for another product is refused.
   Request:  POST {action:'activate'|'validate', key, instanceId?}   Response: {configured, ok, instanceId?, reason?}
   The key is never logged or stored here. */
const LS = 'https://api.lemonsqueezy.com/v1/licenses/';
const KEY_RE = /^[A-Za-z0-9-]{8,80}$/;

function send(res, status, body) { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(body)); }

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > 4096) return null; }
  try { return JSON.parse(raw); } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  const store = process.env.LS_STORE_ID, product = process.env.LS_PRODUCT_ID;
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return send(res, 405, { ok: false, reason: 'method' }); }
  if (!store || !product) return send(res, 200, { configured: false });
  const b = await readBody(req);
  if (!b || typeof b.key !== 'string' || !KEY_RE.test(b.key.trim())) return send(res, 400, { configured: true, ok: false, reason: 'bad_request' });
  const action = b.action === 'validate' ? 'validate' : 'activate';
  const form = new URLSearchParams({ license_key: b.key.trim() });
  if (action === 'activate') form.set('instance_name', 'stampbook-browser');
  else { if (typeof b.instanceId !== 'string' || !/^[\w-]{8,64}$/.test(b.instanceId)) return send(res, 400, { configured: true, ok: false, reason: 'bad_request' }); form.set('instance_id', b.instanceId); }
  let r, j;
  try {
    r = await fetch(LS + action, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' }, body: form });
    j = await r.json();
  } catch (e) { return send(res, 502, { configured: true, ok: false, reason: 'unreachable' }); }
  const good = action === 'activate' ? j && j.activated === true : j && j.valid === true;
  if (!good) return send(res, 200, { configured: true, ok: false, reason: 'invalid' });
  const m = j.meta || {};
  if (String(m.store_id) !== String(store) || String(m.product_id) !== String(product)) return send(res, 200, { configured: true, ok: false, reason: 'wrong_product' });
  const status = j.license_key && j.license_key.status;
  if (status && status !== 'active' && status !== 'inactive') return send(res, 200, { configured: true, ok: false, reason: 'invalid' });
  return send(res, 200, { configured: true, ok: true, instanceId: j.instance && j.instance.id ? String(j.instance.id) : (b.instanceId || '') });
};
