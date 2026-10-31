/* Vercel serverless function: checks a Pro licence key with the Polar public licence-key API (customer portal endpoint).
   Env: POLAR_ORGANIZATION_ID, POLAR_BENEFIT_ID (both required; the benefit is the "License Keys" benefit attached to the Stayline Pro product).
   If either is missing the function answers { configured: false } and the app keeps using its built-in offline key check.
   No access token is needed: this Polar endpoint takes the key itself as the credential. */
const URL_VALIDATE = 'https://api.polar.sh/v1/customer-portal/license-keys/validate';

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
  const org = env.POLAR_ORGANIZATION_ID, benefit = env.POLAR_BENEFIT_ID;
  if (!org || !benefit) return { configured: false };
  const r = await fetchImpl(URL_VALIDATE, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: key, organization_id: org, benefit_id: benefit })
  });
  let d = null;
  try { d = await r.json(); } catch (e) { d = null; }
  const exp = d && d.expires_at ? Date.parse(d.expires_at) : NaN;
  const valid = !!d && d.status === 'granted' && String(d.benefit_id) === String(benefit) && !(exp <= Date.now());
  return { configured: true, valid: valid };
}
async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  if (!process.env.POLAR_ORGANIZATION_ID || !process.env.POLAR_BENEFIT_ID) return send(res, 200, { configured: false });
  const key = readKey(req);
  if (!key) return send(res, 400, { error: 'key' });
  try { return send(res, 200, await verify(key, process.env, fetch)); }
  catch (e) { return send(res, 502, { error: 'upstream' }); }
}
module.exports = handler;
module.exports.verify = verify;
