/* Cloudflare Pages Function: POST /api/license  (same contract as api/license.js on Vercel).
   Set LS_STORE_ID and LS_PRODUCT_ID as environment variables (Pages > Settings > Variables and Secrets). */
import licenseCore from '../../lib/license-core.js';

const json = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: Object.assign({ 'content-type': 'application/json', 'cache-control': 'no-store' }, extra) });

export async function onRequest(context) {
  const { request, env } = context;
  let body = null;
  if (request.method === 'POST') {
    try { const raw = await request.text(); if (raw.length <= 4096) body = JSON.parse(raw); } catch (e) { body = null; }
  }
  const out = await licenseCore.check({ method: request.method, body, env, fetchFn: (...a) => fetch(...a) });
  return json(out.status, out.body, request.method !== 'POST' ? { allow: 'POST' } : undefined);
}
