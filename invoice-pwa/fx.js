// Multi-currency totals with exchange rates the user types in (no network, no rate feed).
// A rate means "1 unit of this currency = rate units of the base currency".
import { round2 } from "./logic.js";

export const CURRENCIES = ["USD", "EUR", "GBP", "KRW", "JPY", "CNY", "CAD", "AUD"];

// Keeps only usable rates: finite, positive, 3-letter codes. Returns { base, rates }.
export function cleanRates(raw) {
  const base = /^[A-Z]{3}$/.test(raw?.base || "") ? raw.base : "USD";
  const rates = {};
  for (const [c, v] of Object.entries(raw?.rates || {})) {
    const n = Number(v);
    if (/^[A-Z]{3}$/.test(c) && c !== base && Number.isFinite(n) && n > 0 && n < 1e9) rates[c] = n;
  }
  return { base, rates };
}

export function convert(amount, from, { base, rates }) {
  if (from === base) return round2(amount);
  const r = rates[from];
  return r ? round2(amount * r) : null;
}

// Folds the per-currency rows from summarize() into one row in the base currency.
// Currencies with no rate are listed in `missing` and left out, never guessed.
export function combine(sums, fx) {
  const { base, rates } = cleanRates(fx);
  const out = { currency: base, outstanding: 0, overdue: 0, collected: 0, missing: [] };
  for (const s of sums) {
    if (s.currency !== base && !rates[s.currency]) { out.missing.push(s.currency); continue; }
    for (const k of ["outstanding", "overdue", "collected"]) out[k] = round2(out[k] + convert(s[k], s.currency, { base, rates }));
  }
  return out;
}

// Reading a possibly typed-in rate field: empty or invalid means "no rate".
export function parseRate(text) {
  const n = Number(String(text ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
