// Vercel serverless function: checks license keys against Polar's public license-key API (customer-portal endpoints).
// Needs two environment variables so a key bought for another organization or product is not accepted:
//   POLAR_ORGANIZATION_ID (the organization UUID), POLAR_BENEFIT_ID (the License Keys benefit attached to QuickBill Pro)
// Without them the function answers { configured: false } and the app keeps its offline keys.
// These endpoints take the key itself as the credential, so no access token is stored here.
// Only the key is forwarded; the buyer's name and email from Polar never reach the browser.

const API = "https://api.polar.sh/v1/customer-portal/license-keys";
const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export const configured = (env) => !!(env.POLAR_ORGANIZATION_ID && env.POLAR_BENEFIT_ID);

async function call(fetchImpl, path, payload) {
  const r = await fetchImpl(`${API}/${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

// The benefit id ties a key to QuickBill Pro (the same Polar organization may sell other products).
const ours = (lk, env) => String(lk?.benefit_id) === String(env.POLAR_BENEFIT_ID);

// Polar key statuses: "granted" is paid and usable; "revoked" (refund/cancel) and "disabled" are not. An expired key is not usable either.
const usable = (lk) => lk?.status === "granted" && !(Date.parse(lk.expires_at) <= Date.now());

// body: { action: "activate" | "validate", key, instance?, name? }. Returns { code, body }.
export async function check(body, env, fetchImpl = fetch) {
  if (!configured(env)) return { code: 200, body: { configured: false } };
  const key = String(body?.key || "").trim();
  if (!KEY_RE.test(key)) return { code: 200, body: { configured: true, valid: false, reason: "format" } };
  try {
    if (body.action === "activate") {
      const label = String(body.name || "browser").slice(0, 60);
      const { status, json } = await call(fetchImpl, "activate", { key, organization_id: env.POLAR_ORGANIZATION_ID, label });
      if (!json) return { code: 502, body: { configured: true, error: "upstream" } };
      if (status >= 500) return { code: 502, body: { configured: true, error: "upstream" } };
      // Polar answers the activation (with the key nested) on success; 404 = unknown key, 403 = activation limit reached.
      const lk = json.license_key;
      if (status === 403) return { code: 200, body: { configured: true, valid: false, reason: "limit" } };
      if (status >= 300 || !lk) return { code: 200, body: { configured: true, valid: false, reason: "unknown" } };
      if (!ours(lk, env)) return { code: 200, body: { configured: true, valid: false, reason: "product" } };
      if (!usable(lk)) return { code: 200, body: { configured: true, valid: false, reason: "revoked" } };
      return { code: 200, body: { configured: true, valid: true, instance: json.id || "" } };
    }
    if (body.action === "validate") {
      const instance = String(body.instance || "");
      const payload = { key, organization_id: env.POLAR_ORGANIZATION_ID, benefit_id: env.POLAR_BENEFIT_ID };
      if (ID_RE.test(instance)) payload.activation_id = instance;
      const { status, json } = await call(fetchImpl, "validate", payload);
      if (!json || status >= 500) return { code: 502, body: { configured: true, error: "upstream" } };
      if (status >= 300 || !json.status) return { code: 200, body: { configured: true, valid: false, reason: "unknown" } };
      const ok = ours(json, env) && usable(json);
      return { code: 200, body: { configured: true, valid: ok, reason: ok ? "" : !ours(json, env) ? "product" : "revoked" } };
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
