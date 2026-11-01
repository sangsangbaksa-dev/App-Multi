// Vercel serverless function: checks QuickBill Pro license keys with the Lemon Squeezy License API.
// POST https://api.lemonsqueezy.com/v1/licenses/validate takes only the key, so no API key or secret is stored.
// Optional environment variable LEMONSQUEEZY_PRODUCT_ID pins keys to the QuickBill product; set
// LEMONSQUEEZY_DISABLED=1 to answer { configured: false } so the app falls back to its offline keys.
// Only the key is forwarded; the buyer's name and email from Lemon Squeezy never reach the browser.

const API = "https://api.lemonsqueezy.com/v1/licenses/validate";
const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;

export const configured = (env) => !(env && env.LEMONSQUEEZY_DISABLED);

// Lemon Squeezy answers { valid, license_key: { status }, meta: { product_id } }. Refunds disable the key,
// so only an "active" or "inactive" (not yet activated) key for our product counts.
const known = (j) => j?.valid === true;
const usable = (j, env) => known(j) && ["active", "inactive"].includes(j.license_key?.status) &&
  (!env.LEMONSQUEEZY_PRODUCT_ID || String(j.meta?.product_id) === String(env.LEMONSQUEEZY_PRODUCT_ID));

// Lemon Squeezy rate-limits (60/min), and serverless/Pages functions share egress IPs, so a 429 is expected now and then.
// Retry once after Retry-After (capped at 2s), and cache a verdict for a few minutes so repeat checks cost nothing.
const CACHE_MS = 5 * 60e3;
const cache = new Map(); // key -> { at, result }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const _clearCache = () => cache.clear();

async function verify(fetchImpl, env, key) {
  let res = await verifyOnce(fetchImpl, env, key);
  if (res.status === 429) {
    await sleep(Math.min(Math.max(res.retryAfter, 0.5), 2) * 1000);
    res = await verifyOnce(fetchImpl, env, key);
  }
  return res;
}

async function verifyOnce(fetchImpl, env, key) {
  const r = await fetchImpl(API, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ license_key: key }),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json, retryAfter: Number(r.headers?.get?.("retry-after")) || 1 };
}

// body: { action: "activate" | "validate", key, instance?, name? }. Returns { code, body }.
// No activation slot is used, so "activate" and "validate" both validate the key; "instance" stays empty.
export async function check(body, env, fetchImpl = fetch) {
  if (!configured(env)) return { code: 200, body: { configured: false } };
  const key = String(body?.key || "").trim();
  if (!KEY_RE.test(key)) return { code: 200, body: { configured: true, valid: false, reason: "format" } };
  if (body?.action !== "activate" && body?.action !== "validate") return { code: 400, body: { error: "action" } };
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;
  try {
    const { status, json, retryAfter } = await verify(fetchImpl, env, key);
    // Rate limited: say so (not "invalid key"), so the browser keeps Pro and tries again later.
    if (status === 429) return { code: 429, body: { configured: true, error: "rate_limited", retryAfter } };
    if (!json || status >= 500 || (status >= 400 && status !== 404 && status !== 400 && status !== 422)) return { code: 502, body: { configured: true, error: "upstream" } };
    if (!known(json)) return { code: 200, body: { configured: true, valid: false, reason: "unknown" } };
    if (!usable(json, env)) return { code: 200, body: { configured: true, valid: false, reason: "revoked" } };
    const result = { code: 200, body: { configured: true, valid: true, instance: "" } };
    cache.set(key, { at: Date.now(), result });
    return result;
  } catch {
    return { code: 502, body: { configured: true, error: "upstream" } };
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ configured: configured(process.env) });
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const { code, body } = await check(req.body && typeof req.body === "object" ? req.body : {}, process.env);
  return res.status(code).json(body);
}
