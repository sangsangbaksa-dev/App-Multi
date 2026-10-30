// Vercel serverless function: checks license keys against the Lemon Squeezy License API.
// Needs two environment variables so a key bought for another store or product is not accepted:
//   LS_STORE_ID, LS_PRODUCT_ID
// Without them the function answers { configured: false } and the app keeps its offline keys.
// The license endpoints take the key itself as the credential, so no API secret is stored here.
// Only the key is forwarded; the buyer's name and email from Lemon Squeezy never reach the browser.

const API = "https://api.lemonsqueezy.com/v1/licenses";
const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export const configured = (env) => !!(env.LS_STORE_ID && env.LS_PRODUCT_ID);

async function call(fetchImpl, path, fields) {
  const r = await fetchImpl(`${API}/${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

const ours = (json, env) =>
  String(json?.meta?.store_id) === String(env.LS_STORE_ID) && String(json?.meta?.product_id) === String(env.LS_PRODUCT_ID);

// "active" and "inactive" (not yet activated on any device) both count as paid. "expired" and "disabled"
// (refunded or revoked) do not.
const usable = (json) => ["active", "inactive"].includes(json?.license_key?.status);

// body: { action: "activate" | "validate", key, instance?, name? }. Returns { code, body }.
export async function check(body, env, fetchImpl = fetch) {
  if (!configured(env)) return { code: 200, body: { configured: false } };
  const key = String(body?.key || "").trim();
  if (!KEY_RE.test(key)) return { code: 200, body: { configured: true, valid: false, reason: "format" } };
  try {
    if (body.action === "activate") {
      const name = String(body.name || "browser").slice(0, 60);
      const { json } = await call(fetchImpl, "activate", { license_key: key, instance_name: name });
      if (!json) return { code: 502, body: { configured: true, error: "upstream" } };
      if (json.activated && ours(json, env) && usable(json)) return { code: 200, body: { configured: true, valid: true, instance: json.instance?.id || "" } };
      // Found but not usable (wrong product, limit reached, revoked): say why, but never accept.
      const reason = !json.license_key ? "unknown" : !ours(json, env) ? "product" : !usable(json) ? "revoked" : "limit";
      return { code: 200, body: { configured: true, valid: false, reason } };
    }
    if (body.action === "validate") {
      const instance = String(body.instance || "");
      const fields = { license_key: key };
      if (ID_RE.test(instance)) fields.instance_id = instance;
      const { json } = await call(fetchImpl, "validate", fields);
      if (!json) return { code: 502, body: { configured: true, error: "upstream" } };
      const ok = !!json.valid && ours(json, env) && usable(json);
      return { code: 200, body: { configured: true, valid: ok, reason: ok ? "" : !json.license_key ? "unknown" : !usable(json) ? "revoked" : "product" } };
    }
  } catch {
    return { code: 502, body: { configured: true, error: "upstream" } };
  }
  return { code: 400, body: { error: "action" } };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ configured: configured(process.env) });
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const { code, body } = await check(req.body && typeof req.body === "object" ? req.body : {}, process.env);
  return res.status(code).json(body);
}
