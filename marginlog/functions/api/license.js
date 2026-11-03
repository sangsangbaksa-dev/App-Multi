// Cloudflare Pages Function. GET /api/license: is paid access on? POST { key }: check a licence key.
import { configured, verify } from '../../api/license.js';

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const reply = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: Object.assign({}, HEADERS, extra || {}) });

export async function onRequest({ request, env }) {
  if (request.method === 'GET') return reply(200, { configured: configured(env) });
  if (request.method !== 'POST') return reply(405, { error: 'method' }, { Allow: 'GET, POST' });
  if (!configured(env)) return reply(200, { configured: false });
  let body = null;
  try { body = await request.json(); } catch (e) { body = null; }
  const key = body && typeof body.key === 'string' ? body.key.trim() : '';
  if (!/^[A-Za-z0-9-]{8,100}$/.test(key)) return reply(400, { error: 'key' });
  try { return reply(200, await verify(key, env, fetch)); }
  catch (e) { return reply(502, { error: 'upstream' }); }
}
