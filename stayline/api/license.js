/* Vercel serverless function: checks a Pro licence key with the Lemon Squeezy License API (POST /v1/licenses/validate).
   Env (optional): LEMONSQUEEZY_PRODUCT_ID pins keys to Stayline Pro; LEMONSQUEEZY_DISABLED answers { configured: false }
   so the app keeps using its built-in offline key check. No API key is needed: validate takes only the licence key. */
const URL_VERIFY = 'https://api.lemonsqueezy.com/v1/licenses/validate';
const configured = (env) => !(env && env.LEMONSQUEEZY_DISABLED);

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
  if (!configured(env)) return { configured: false };
  const product = env.LEMONSQUEEZY_PRODUCT_ID;
  const r = await fetchImpl(URL_VERIFY, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }).toString()
  });
  let d = null;
  try { d = await r.json(); } catch (e) { d = null; }
  if (r.status >= 500 || r.status === 429) throw new Error('upstream');
  // Refunds disable the key; only an active (or not yet activated) key for our product is valid.
  const st = d && d.license_key && d.license_key.status;
  const valid = !!d && d.valid === true && (st === 'active' || st === 'inactive') &&
    (!product || String(d.meta && d.meta.product_id) === String(product));
  return { configured: true, valid: valid };
}
async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  if (!configured(process.env)) return send(res, 200, { configured: false });
  const key = readKey(req);
  if (!key) return send(res, 400, { error: 'key' });
  try { return send(res, 200, await verify(key, process.env, fetch)); }
  catch (e) { return send(res, 502, { error: 'upstream' }); }
}
module.exports = handler;
module.exports.verify = verify;
module.exports.configured = configured;
