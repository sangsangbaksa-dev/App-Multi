// Client share links. DOM-free so `npm test` covers it.
// A link carries a compact snapshot of one invoice in the URL fragment (#d=...). The fragment is never sent
// to a server, so no customer data leaves the sender's and the client's browsers. The page it opens
// (view.html) is read-only; sending a changed invoice means sending a new link.
import { balanceOf, calcTotals, dayDiff, isQuote, lateFeeAmount, round2, totalOf } from "./logic.js";

export const SHARE_VERSION = 1;
export const MAX_PAYLOAD = 20000; // characters of base64url a viewer will try to decode
export const WARN_LINK = 7000; // some chat apps and mail clients cut long links; the editor warns above this
const MAX_ITEMS = 100;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LANGS = ["en", "ko", "ja", "zh", "es"];

const clip = (v, n) => String(v ?? "").slice(0, n);
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

// Only https links are allowed on the client page, with no embedded credentials.
export function safeLink(url) {
  try {
    const u = new URL(String(url ?? "").trim());
    return u.protocol === "https:" && !u.username && !u.password ? u.href : "";
  } catch { return ""; }
}

function toB64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s) {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// Compact keys keep the link short. Payments are included so the client sees the balance, not only the total.
export function toSnapshot(inv, lang = "en") {
  return {
    v: SHARE_VERSION, t: isQuote(inv) ? "q" : "i", n: clip(inv.number, 40), f: clip(inv.from, 120), c: clip(inv.client, 120),
    cur: inv.currency, is: inv.issueDate, du: inv.dueDate, tx: num(inv.taxRate), ds: num(inv.discount),
    pd: isQuote(inv) ? 0 : num(inv.paid), st: inv.status, no: clip(inv.notes, 600), pi: clip(inv.payinfo, 600),
    pl: safeLink(inv.payLink), fe: num(inv.lateFeePct), l: LANGS.includes(lang) ? lang : "en",
    it: (inv.items || []).slice(0, MAX_ITEMS).map((x) => [clip(x.desc, 160), num(x.qty), num(x.price), x.lateFee ? 1 : 0]),
  };
}

export function encodeShare(inv, lang) {
  return toB64Url(JSON.stringify(toSnapshot(inv, lang)));
}

// Returns { ok: true, inv } with an invoice-shaped object, or { ok: false, reason }.
export function decodeShare(payload) {
  if (typeof payload !== "string" || !payload) return { ok: false, reason: "empty" };
  if (payload.length > MAX_PAYLOAD || !/^[A-Za-z0-9_-]+$/.test(payload)) return { ok: false, reason: "bad" };
  let d;
  try { d = JSON.parse(fromB64Url(payload)); } catch { return { ok: false, reason: "bad" }; }
  if (!d || typeof d !== "object" || d.v !== SHARE_VERSION) return { ok: false, reason: d && d.v > SHARE_VERSION ? "newer" : "bad" };
  if (!/^[A-Z]{3}$/.test(d.cur || "") || !DATE.test(d.is || "") || !DATE.test(d.du || "")) return { ok: false, reason: "bad" };
  if (!Array.isArray(d.it) || d.it.length > MAX_ITEMS) return { ok: false, reason: "bad" };
  const items = d.it.map((r) => Array.isArray(r) ? { desc: clip(r[0], 160), qty: num(r[1]), price: num(r[2]), ...(r[3] ? { lateFee: true } : {}) } : null);
  if (items.includes(null)) return { ok: false, reason: "bad" };
  try { new Intl.NumberFormat("en", { style: "currency", currency: d.cur }); } catch { return { ok: false, reason: "bad" }; }
  const quote = d.t === "q";
  const status = ["draft", "sent", "paid", "accepted"].includes(d.st) ? d.st : "sent";
  return {
    ok: true,
    inv: {
      type: quote ? "quote" : "invoice", number: clip(d.n, 40), from: clip(d.f, 120), client: clip(d.c, 120), currency: d.cur,
      issueDate: d.is, dueDate: d.du, taxRate: num(d.tx), discount: num(d.ds), paid: quote ? 0 : num(d.pd), status,
      notes: clip(d.no, 600), payinfo: clip(d.pi, 600), payLink: safeLink(d.pl), lateFeePct: num(d.fe), items,
      lang: LANGS.includes(d.l) ? d.l : "en",
    },
  };
}

// base is the viewer page address without a fragment, e.g. https://example.com/view.
export function shareUrl(base, inv, lang) {
  const url = `${String(base).replace(/#.*$/, "")}#d=${encodeShare(inv, lang)}`;
  return { url, length: url.length, long: url.length > WARN_LINK };
}

export function payloadFromHash(hash) {
  const m = /(?:^#|&)d=([A-Za-z0-9_-]+)/.exec(String(hash || ""));
  return m ? m[1] : "";
}

// What the client page headlines: quote, paid, overdue (with days and optional late fee), due soon, or open.
export function shareStatus(inv, today) {
  const total = totalOf(inv), balance = balanceOf(inv);
  if (isQuote(inv)) {
    const days = dayDiff(today, inv.dueDate);
    return { kind: days < 0 ? "quoteExpired" : "quote", days: Math.abs(days), total, balance: 0, lateFee: 0 };
  }
  if (balance <= 0 && total > 0 || inv.status === "paid") return { kind: "paid", days: 0, total, balance: 0, lateFee: 0 };
  if (inv.status === "draft") return { kind: "draft", days: dayDiff(today, inv.dueDate), total, balance, lateFee: 0 };
  const days = dayDiff(inv.dueDate, today);
  if (days > 0) {
    // A late-fee line the sender already added is part of the balance; adding the fee again would double count it.
    const lateFee = inv.items.some((x) => x.lateFee) ? 0 : lateFeeAmount(inv, today, inv.lateFeePct);
    return { kind: "overdue", days, total, balance, lateFee, payable: round2(balance + lateFee) };
  }
  return { kind: days === 0 ? "dueToday" : "due", days: Math.abs(days), total, balance, lateFee: 0 };
}

// Totals for the page; late-fee lines the sender already added are part of the items, so nothing is double counted.
export const shareTotals = (inv) => calcTotals(inv.items, inv.taxRate, inv.discount);
