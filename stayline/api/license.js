/* Vercel serverless function: checks a Pro licence key with the Lemon Squeezy public licence API.
   Env: LS_STORE_ID, LS_PRODUCT_ID (both required). If either is missing the function answers { configured: false }
   and the app keeps using its built-in offline key check. No secret key is needed for validate. */
const URL_VALIDATE = 'https://api.lemonsqueezy.com/v1/licenses/validate';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
function readKey(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  const k = b && typeof b.key === 'string' ? b.key.trim() : '';
  return /^[A-Za-z0-9-]{8,100}$/.test(k) ? k : '';
}
/* pure part, injectable fetch so it can be tested: resolves { configured, valid } */
async function verify(key, env, fetchImpl) {
  const store = env.LS_STORE_ID, product = env.LS_PRODUCT_ID;
  if (!store || !product) return { configured: false };
  const r = await fetchImpl(URL_VALIDATE, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }).toString()
  });
  let d = null;
  try { d = await r.json(); } catch (e) { d = null; }
  const m = (d && d.meta) || {};
  const valid = !!d && d.valid === true && String(m.store_id) === String(store) && String(m.product_id) === String(product);
  return { configured: true, valid: valid };
}
async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  if (!process.env.LS_STORE_ID || !process.env.LS_PRODUCT_ID) return send(res, 200, { configured: false });
  const key = readKey(req);
  if (!key) return send(res, 400, { error: 'key' });
  try { return send(res, 200, await verify(key, process.env, fetch)); }
  catch (e) { return send(res, 502, { error: 'upstream' }); }
}
module.exports = handler;
module.exports.verify = verify;
