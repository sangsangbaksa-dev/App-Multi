// What QuickBill puts in the optional cloud copy. License keys, language and other per-device settings are left out on purpose.
export const SYNC_KEYS = ["qb.invoices", "qb.sheets", "qb.docs", "qb.templates", "qb.expenses", "qb.logo", "qb.time", "qb.rate", "qb.me"];
const LISTS = new Set(["qb.invoices", "qb.sheets", "qb.docs", "qb.templates", "qb.expenses", "qb.time"]);

// True when the snapshot holds no user data (a fresh device), so the first sync can just take the cloud copy.
export const isEmpty = (snap) => ![...LISTS].some((k) => Array.isArray(snap?.[k]) && snap[k].length);

// storage: anything with getItem/setItem/removeItem. Missing or unreadable keys are simply left out.
export function snapshot(storage) {
  const out = {};
  for (const k of SYNC_KEYS) {
    let raw = null;
    try { raw = storage.getItem(k); } catch {}
    if (raw == null) continue;
    try { out[k] = JSON.parse(raw); } catch {}
  }
  return out;
}

// Replaces the synced keys with the snapshot. Unknown keys and wrong types are ignored; a key the snapshot lacks is removed,
// so the device ends up exactly as the snapshot says. Returns false (touching nothing) if the snapshot is not usable.
export function apply(storage, snap) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return false;
  for (const k of Object.keys(snap)) if (LISTS.has(k) && !Array.isArray(snap[k])) return false;
  try { storage.setItem("qb.invoices.bak-cloud", storage.getItem("qb.invoices") ?? "[]"); } catch {}
  for (const k of SYNC_KEYS) {
    try {
      if (k in snap && snap[k] != null) storage.setItem(k, JSON.stringify(snap[k]));
      else storage.removeItem(k);
    } catch { return false; }
  }
  return true;
}
