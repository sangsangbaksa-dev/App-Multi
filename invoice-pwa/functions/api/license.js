// Cloudflare Pages Function for /api/license. Same behaviour as api/license.js (the Vercel version): both call the
// shared check() so the Polar rules live in one place. Environment variables come from context.env:
// POLAR_ORGANIZATION_ID and POLAR_BENEFIT_ID (Pages project settings -> Variables and Secrets).
import { check, configured } from "../../api/license.js";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers });

export async function handle(request, env, fetchImpl = fetch) {
  if (request.method === "GET") return json({ configured: configured(env) });
  if (request.method !== "POST") return json({ error: "method" }, 405);
  let body = {};
  try { body = await request.json(); } catch {}
  const r = await check(body && typeof body === "object" ? body : {}, env, fetchImpl);
  return json(r.body, r.code);
}

export const onRequest = ({ request, env }) => handle(request, env);
