// Vercel serverless function: checks QuickBill Pro license keys with Gumroad's license API.
// One environment variable is needed: GUMROAD_PRODUCT_ID (the Gumroad product ID of QuickBill Pro, with license keys enabled).
// Without it the function answers { configured: false } and the app keeps its offline keys.
// Gumroad's verify endpoint takes the key and product ID as the credential, so no access token is stored here.
// Only the key is forwarded; the buyer's name and email from Gumroad never reach the browser.

const API = "https://api.gumroad.com/v2/licenses/verify";
const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;

export const configured = (env) => !!env.GUMROAD_PRODUCT_ID;

// Gumroad answers { success, uses, purchase } for a valid key and { success: false, message } for an unknown one.
// A refunded or charged-back purchase is not usable any more.
const usable = (j) => j?.success === true && !j.purchase?.refunded && !j.purchase?.chargebacked;

async function verify(fetchImpl, env, key) {
  const r = await fetchImpl(API, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ product_id: env.GUMROAD_PRODUCT_ID, license_key: key, increment_uses_count: "false" }),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

// body: { action: "activate" | "validate", key, instance?, name? }. Returns { code, body }.
// Gumroad has no activation step, so "activate" and "validate" both check the key; "instance" stays empty.
export async function check(body, env, fetchImpl = fetch) {
  if (!configured(env)) return { code: 200, body: { configured: false } };
  const key = String(body?.key || "").trim();
  if (!KEY_RE.test(key)) return { code: 200, body: { configured: true, valid: false, reason: "format" } };
  if (body?.action !== "activate" && body?.action !== "validate") return { code: 400, body: { error: "action" } };
  try {
    const { status, json } = await verify(fetchImpl, env, key);
    if (!json || status >= 500) return { code: 502, body: { configured: true, error: "upstream" } };
    if (!json.success) return { code: 200, body: { configured: true, valid: false, reason: "unknown" } };
    if (!usable(json)) return { code: 200, body: { configured: true, valid: false, reason: "revoked" } };
    return { code: 200, body: { configured: true, valid: true, instance: "" } };
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
