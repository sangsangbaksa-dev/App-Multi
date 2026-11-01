// Account layer. The app talks only to the interface below; today it is backed by this device's localStorage.
// When Supabase is connected, write a second backend with the same methods and pass it to createAuth().
//
//   backend.signUp(email, password) -> { email }        throws AuthError
//   backend.signIn(email, password) -> { email }        throws AuthError
//   backend.signOut()               -> void
//   backend.current()               -> { email } | null
//
// Local-only caveat: passwords are salted and hashed with SHA-256 in the browser, but anyone with access to this
// device can read the stored hash. This is a placeholder for account flows, not a security boundary.

export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm = (e) => String(e || "").trim().toLowerCase();
const bytesToHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  return bytesToHex(await crypto.subtle.digest("SHA-256", data));
}

// storage: anything with getItem/setItem/removeItem (localStorage in the app, a Map-backed object in tests).
export function localBackend(storage, { key = "qb.accounts", sessionKey = "qb.session" } = {}) {
  const read = () => { try { return JSON.parse(storage.getItem(key)) || {}; } catch { return {}; } };
  const write = (users) => storage.setItem(key, JSON.stringify(users));
  return {
    async signUp(email, password) {
      const e = norm(email);
      if (!EMAIL.test(e)) throw new AuthError("email");
      if (String(password || "").length < 8) throw new AuthError("short");
      const users = read();
      if (users[e]) throw new AuthError("exists");
      const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      users[e] = { salt, hash: await hashPassword(password, salt), created: Date.now() };
      write(users);
      storage.setItem(sessionKey, JSON.stringify({ email: e }));
      return { email: e };
    },
    async signIn(email, password) {
      const e = norm(email);
      const u = read()[e];
      if (!u || (await hashPassword(password, u.salt)) !== u.hash) throw new AuthError("bad");
      storage.setItem(sessionKey, JSON.stringify({ email: e }));
      return { email: e };
    },
    async signOut() { storage.removeItem(sessionKey); },
    async current() {
      try {
        const s = JSON.parse(storage.getItem(sessionKey));
        return s && read()[s.email] ? { email: s.email } : null;
      } catch { return null; }
    },
  };
}

export function createAuth(backend) {
  let user = null;
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn(user));
  return {
    async init() { user = await backend.current(); emit(); return user; },
    get user() { return user; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async signUp(email, password) { user = await backend.signUp(email, password); emit(); return user; },
    async signIn(email, password) { user = await backend.signIn(email, password); emit(); return user; },
    async signOut() { await backend.signOut(); user = null; emit(); },
  };
}
