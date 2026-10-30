// Browser side of license checking. Pure logic with injected fetch/storage so it can be tested.
// Server mode is on when /api/license says it is configured. In that case only keys the server accepted count
// as Pro; the offline PRO-XXXX-XXXX-XXXX keys (whose checksum anyone can read in logic.js) are not accepted any more.
import { validLicense } from "./logic.js";

const DAY = 864e5;
export const RECHECK_MS = 7 * DAY;

async function post(fetchImpl, api, body) {
  const r = await fetchImpl(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}

export async function serverMode(fetchImpl, api) {
  try {
    const r = await fetchImpl(api, { cache: "no-store" });
    if (!r.ok) return null;
    return !!(await r.json()).configured;
  } catch { return null; } // null = could not tell (offline, no function deployed)
}

// Returns { ok, record?, reason? }. `record` is what the app stores next to the key.
export async function activate(key, { fetchImpl, api, now = Date.now(), name = "QuickBill" }) {
  const k = String(key || "").trim();
  const mode = await serverMode(fetchImpl, api);
  if (mode === true) {
    try {
      const r = await post(fetchImpl, api, { action: "activate", key: k, name });
      if (r.valid) return { ok: true, record: { key: k, instance: r.instance || "", checkedAt: now }, server: true };
      return { ok: false, reason: r.reason || "invalid", server: true };
    } catch { return { ok: false, reason: "network", server: true }; }
  }
  // Not configured, or the function cannot be reached: offline keys keep working so nothing breaks before launch.
  if (validLicense(k)) return { ok: true, record: null, server: false };
  return { ok: false, reason: "invalid", server: false };
}

// Is the stored license still good? Only a clear "no" from the server removes Pro; any failure to ask keeps it.
export function needsRecheck(rec, now = Date.now()) {
  return !!rec && now - (rec.checkedAt || 0) > RECHECK_MS;
}
export async function recheck(rec, { fetchImpl, api, now = Date.now() }) {
  try {
    const r = await post(fetchImpl, api, { action: "validate", key: rec.key, instance: rec.instance });
    if (r.configured === false) return { keep: true, record: rec };
    if (r.valid === true) return { keep: true, record: { ...rec, checkedAt: now } };
    if (r.valid === false && r.reason && r.reason !== "format") return { keep: false };
    return { keep: true, record: rec };
  } catch { return { keep: true, record: rec }; }
}

// isPro for the app. `rec` is the stored server record (or null), `server` the cached server-mode flag.
export function proStatus(key, rec, server) {
  if (rec && rec.key === key) return true;
  return !server && validLicense(key);
}
