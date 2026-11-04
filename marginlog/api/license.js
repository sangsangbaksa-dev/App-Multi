/* Licence check for the paid Marginlog, via the Lemon Squeezy License API (no secret needed).
   Env: LEMONSQUEEZY_PRODUCT_ID turns paid access on and pins keys to this product.
   Without it, configured() is false and the app stays unlocked (launch mode). */
const URL_VERIFY = 'https://api.lemonsqueezy.com/v1/licenses/validate';
function configured(env) { return !!(env && env.LEMONSQUEEZY_PRODUCT_ID); }
/* resolves { configured, valid }; throws on upstream trouble so the caller can answer 502 */
async function verify(key, env, fetchImpl) {
  if (!configured(env)) return { configured: false };
  const r = await fetchImpl(URL_VERIFY, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }).toString()
  });
  let d = null;
  try { d = await r.json(); } catch (e) { d = null; }
  if (r.status >= 500 || r.status === 429) throw new Error('upstream');
  // Refunded keys are disabled upstream; only active or not-yet-activated keys for this product count.
  const st = d && d.license_key && d.license_key.status;
  const valid = !!d && d.valid === true && (st === 'active' || st === 'inactive') &&
    String(d.meta && d.meta.product_id) === String(env.LEMONSQUEEZY_PRODUCT_ID);
  return { configured: true, valid: valid };
}
module.exports = { configured, verify, URL_VERIFY };
