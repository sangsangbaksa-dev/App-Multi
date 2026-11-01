// Line items you bill often. Saving an invoice teaches the catalog; typing a known description later offers it
// and fills the last price. DOM-free so it is unit tested.
export const MAX_ITEMS = 200;
const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
export const keyOf = (s) => norm(s).toLowerCase();

// catalog: { [key]: { desc, price, uses } }
export function learnItems(catalog, items) {
  const next = { ...catalog };
  for (const it of items || []) {
    const desc = norm(it.desc).slice(0, 160), price = Number(it.price);
    if (!desc || it.lateFee || !Number.isFinite(price) || price <= 0) continue;
    const k = keyOf(desc);
    next[k] = { desc, price, uses: (next[k]?.uses || 0) + 1 };
  }
  const keys = Object.keys(next);
  if (keys.length > MAX_ITEMS) {
    // Drop the least used first, so the list stays useful instead of growing forever.
    keys.sort((a, b) => next[a].uses - next[b].uses).slice(0, keys.length - MAX_ITEMS).forEach((k) => delete next[k]);
  }
  return next;
}

export function suggestions(catalog, limit = 30) {
  return Object.values(catalog).sort((a, b) => b.uses - a.uses || a.desc.localeCompare(b.desc)).slice(0, limit);
}

export function priceFor(catalog, desc) {
  return catalog[keyOf(desc)]?.price ?? null;
}

export function forgetItem(catalog, desc) {
  const { [keyOf(desc)]: _gone, ...rest } = catalog;
  return rest;
}

export function cleanCatalog(raw) {
  const out = {};
  for (const v of Object.values(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {})) {
    const desc = norm(v?.desc).slice(0, 160), price = Number(v?.price), uses = Math.round(Number(v?.uses));
    if (desc && Number.isFinite(price) && price > 0) out[keyOf(desc)] = { desc, price, uses: Number.isFinite(uses) && uses > 0 ? uses : 1 };
  }
  return out;
}
