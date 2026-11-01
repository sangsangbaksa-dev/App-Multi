/* Cloudflare Pages Function: POST /api/license  (same URL and behaviour as the Vercel api/license.js).
   Env (Pages project settings → Variables): GUMROAD_PRODUCT_ID. Without it: { configured: false }.
   The Gumroad call itself lives in ../../api/license.js (`verify`) so both hosts share one implementation. */
import licence from '../../api/license.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const reply = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: Object.assign({}, JSON_HEADERS, extra) });

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return reply(405, { error: 'method' }, { Allow: 'POST' });
  if (!env.GUMROAD_PRODUCT_ID) return reply(200, { configured: false });
  let body = null;
  try { body = await request.json(); } catch (e) { body = null; }
  const key = body && typeof body.key === 'string' ? body.key.trim() : '';
  if (!/^[A-Za-z0-9-]{8,100}$/.test(key)) return reply(400, { error: 'key' });
  try { return reply(200, await licence.verify(key, env, fetch)); }
  catch (e) { return reply(502, { error: 'upstream' }); }
}
