// Schema bookkeeping for localStorage. Takes any object with getItem/setItem so tests can pass a plain Map wrapper.
// Rule: data written by an older version is copied to a ".bak-vN" key before anything new touches it, and
// data written by a newer version is never overwritten.
export const APP_SCHEMA = 2; // 1 = invoices, sheets, docs. 2 = keeps the old video key (qb.video) untouched; the app no longer reads it.

export function ensureSchema(ls) {
  let meta = null;
  try { meta = JSON.parse(ls.getItem("qb.meta")); } catch {}
  const have = Number(meta?.schema) || 1;
  if (have > APP_SCHEMA) return { schema: have, locked: true };
  if (have < APP_SCHEMA) {
    // One copy of everything the old version wrote, so a bad migration can always be undone by hand.
    for (const k of ["qb.invoices", "qb.sheets", "qb.docs", "qb.templates"]) {
      const raw = ls.getItem(k);
      if (raw != null && ls.getItem(`${k}.bak-v${have}`) == null) ls.setItem(`${k}.bak-v${have}`, raw);
    }
    ls.setItem("qb.meta", JSON.stringify({ schema: APP_SCHEMA }));
  }
  return { schema: APP_SCHEMA, locked: false };
}
