/* Vercel serverless function: checks a Pro licence key with Gumroad's licence API (POST /v2/licenses/verify).
   Env: GUMROAD_PRODUCT_ID (the Gumroad product id of Stayline Pro, with license keys enabled).
   If it is missing the function answers { configured: false } and the app keeps using its built-in offline key check.
   No access token is needed: Gumroad's verify call takes the product id and the key. */
const URL_VERIFY = 'https://api.gumroad.com/v2/licenses/verify';

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
  const product = env.GUMROAD_PRODUCT_ID;
  if (!product) return { configured: false };
  const r = await fetchImpl(URL_VERIFY, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ product_id: product, license_key: key, increment_uses_count: 'false' }).toString()
  });
  let d = null;
  try { d = await r.json(); } catch (e) { d = null; }
  // A refunded or charged-back purchase keeps the key on record but is no longer valid.
  const p = (d && d.purchase) || {};
  const valid = !!d && d.success === true && !p.refunded && !p.chargebacked;
  return { configured: true, valid: valid };
}
async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  if (!process.env.GUMROAD_PRODUCT_ID) return send(res, 200, { configured: false });
  const key = readKey(req);
  if (!key) return send(res, 400, { error: 'key' });
  try { return send(res, 200, await verify(key, process.env, fetch)); }
  catch (e) { return send(res, 502, { error: 'upstream' }); }
}
module.exports = handler;
module.exports.verify = verify;
