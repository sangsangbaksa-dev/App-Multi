/* Vercel/Node adapter for the Stampbook Pro licence check (logic in lib/license-core.js; Cloudflare Pages version: functions/api/license.js).
   Environment variables:
     LS_STORE_ID    the numeric store id that sells Stampbook
     LS_PRODUCT_ID  the numeric product id of Stampbook Pro
   If either is missing the function answers {configured:false} and the app keeps its built-in offline check.
   Lemon Squeezy's License API needs no secret key. Store/product ids are checked so a key bought for another product is refused.
   Request:  POST {action:'activate'|'validate', key, instanceId?}   Response: {configured, ok, instanceId?, reason?} */
const { check } = require('../lib/license-core.js');

function send(res, status, body) { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(body)); }

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > 4096) return null; }
  try { return JSON.parse(raw); } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') res.setHeader('allow', 'POST');
  const out = await check({ method: req.method, body: req.method === 'POST' ? await readBody(req) : null, env: process.env, fetchFn: (...a) => fetch(...a) });
  return send(res, out.status, out.body);
};
