/* In-memory stand-in for Supabase (password auth + app_snapshots with revision rules). For tests only. */
const URL_ = 'https://abc.supabase.co', KEY = 'k'.repeat(30);
function fakeServer() {
  const users = {}, rows = {}; let n = 0, confirm = false;
  const res = (status, body) => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
  const fn = async (u, init) => {
    const p = u.slice(URL_.length), body = init.body ? JSON.parse(init.body) : null, h = init.headers;
    const tok = (h.authorization || '').replace('Bearer ', '');
    if (h.apikey !== KEY) return res(401, { message: 'no apikey' });
    if (p.startsWith('/auth/v1/signup')) {
      if (users[body.email]) return res(200, { user: { identities: [] } });
      if (body.password.length < 6) return res(422, { msg: 'Password should be at least 6 characters' });
      users[body.email] = { pw: body.password, id: 'u' + ++n };
      return confirm ? res(200, { user: { id: 'u', identities: [{}] } }) : res(200, { access_token: 'at-' + users[body.email].id, refresh_token: 'rt-' + users[body.email].id, expires_in: 3600, user: { id: users[body.email].id, email: body.email } });
    }
    if (p.startsWith('/auth/v1/token?grant_type=password')) {
      const x = users[body.email];
      return x && x.pw === body.password ? res(200, { access_token: 'at-' + x.id, refresh_token: 'rt-' + x.id, expires_in: 3600, user: { id: x.id, email: body.email } }) : res(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    }
    if (p.startsWith('/auth/v1/token?grant_type=refresh_token')) return body.refresh_token.startsWith('rt-') ? res(200, { access_token: tok + 'x', refresh_token: body.refresh_token, expires_in: 3600 }) : res(400, {});
    if (p.startsWith('/auth/v1/logout')) return res(204);
    if (p.startsWith('/rest/v1/app_snapshots')) {
      if (!tok.startsWith('at-')) return res(401, { message: 'JWT required' }); // anon role: no policy, no access
      const uid = tok.split('-')[1].replace(/x+$/, ''), m = /app=eq\.(\w+)/.exec(p), app = m && m[1], k = uid + '/' + app;
      if (init.method === 'GET') return res(200, rows[k] ? [rows[k]] : []);
      if (init.method === 'POST') { if (rows[body.app ? uid + '/' + body.app : k]) return res(409, {}); const r = { ...body, revision: 1, updated_at: 'now' }; rows[uid + '/' + body.app] = r; return res(201, [r]); }
      if (init.method === 'PATCH') { const rv = Number(/revision=eq\.(\d+)/.exec(p)[1]); const r = rows[k]; if (!r || r.revision !== rv) return res(200, []); Object.assign(r, body); return res(200, [r]); }
    }
    return res(404, {});
  };
  return { fn, rows, setConfirm: (v) => (confirm = v) };
}
module.exports = { fakeServer, URL_, KEY };
