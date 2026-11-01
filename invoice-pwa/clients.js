// Remembered client terms. A profile is learned from the last saved invoice for that client, and is applied to
// new invoices when the client name is picked. DOM-free so it is unit tested.
import { addDays, dayDiff } from "./logic.js";
import { safeLink } from "./share.js";

export const keyOf = (name) => String(name ?? "").trim().toLowerCase();
export const validEmail = (e) => /^[^\s@<>,;"]{1,64}@[^\s@<>,;"]{1,190}\.[^\s@<>,;"]{2,}$/.test(String(e ?? "").trim());

export function cleanProfile(p) {
  const terms = Math.round(Number(p?.terms));
  const tax = Number(p?.taxRate);
  return {
    email: validEmail(p?.email) ? String(p.email).trim() : "",
    terms: Number.isFinite(terms) && terms >= 0 && terms <= 365 ? terms : 14,
    taxRate: Number.isFinite(tax) && tax >= 0 && tax <= 100 ? tax : 0,
    currency: /^[A-Z]{3}$/.test(p?.currency || "") ? p.currency : "",
    payinfo: String(p?.payinfo ?? "").slice(0, 600),
    payLink: safeLink(p?.payLink),
  };
}

export function profileFrom(inv) {
  return cleanProfile({
    email: inv.clientEmail, terms: dayDiff(inv.issueDate, inv.dueDate), taxRate: inv.taxRate,
    currency: inv.currency, payinfo: inv.payinfo, payLink: inv.payLink,
  });
}

// Returns the profile map with this invoice's client updated. Quotes and nameless invoices teach nothing.
export function learn(map, inv) {
  const k = keyOf(inv.client);
  if (!k || inv.type === "quote") return map;
  return { ...map, [k]: profileFrom(inv) };
}

export function forget(map, name) {
  const { [keyOf(name)]: _gone, ...rest } = map;
  return rest;
}

// Fills a new invoice from the client's profile; the invoice's own dates and items are never touched except the due date.
export function applyDefaults(inv, profile) {
  if (!profile) return inv;
  const p = cleanProfile(profile);
  return {
    ...inv, clientEmail: p.email || inv.clientEmail || "", currency: p.currency || inv.currency, taxRate: p.taxRate,
    dueDate: addDays(inv.issueDate, p.terms), payinfo: p.payinfo || inv.payinfo || "", payLink: p.payLink || inv.payLink || "",
  };
}

export function mailtoUrl(email, subject, body) {
  if (!validEmail(email)) return "";
  return `mailto:${encodeURIComponent(String(email).trim()).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
