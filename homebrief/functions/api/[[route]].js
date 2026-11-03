/* Cloudflare Pages Function: POST /api/status | /api/report | /api/reply | /api/summary */
import core from '../../lib/core.js';

const out = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequest({ request, env, params }) {
  const route = [].concat(params.route || [])[0] || '';
  let body = null;
  if (request.method === 'POST') {
    try { const raw = await request.text(); if (raw.length <= 60000) body = JSON.parse(raw); } catch (e) { body = null; }
  }
  const r = await core.handle({ route, method: request.method, body, auth: request.headers.get('authorization') || '', env, fetchFn: (...a) => fetch(...a) });
  return out(r.status, r.body);
}
