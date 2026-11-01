// Everything here is DOM-free so `npm test` can cover it directly.
export const FREE_LIMIT = 3;
export const FREE_SHEETS = 2;
export const FREE_DOCS = 2;

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcTotals(items, taxRate = 0, discount = 0) {
  const subtotal = round2(
    items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0)
  );
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const taxable = subtotal - disc;
  const tax = round2(taxable * ((Number(taxRate) || 0) / 100));
  return { subtotal, discount: round2(disc), tax, total: round2(taxable + tax) };
}

export function nextInvoiceNumber(invoices, prefix = "INV") {
  const nums = invoices
    .map((i) => /(\d+)$/.exec(i.number || ""))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

export function canSave(invoices, isPro, editingId) {
  if (isPro) return true;
  if (editingId && invoices.some((i) => i.id === editingId)) return true;
  return invoices.length < FREE_LIMIT;
}

export function formatMoney(n, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
}

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export function toCSV(invoices) {
  const head = ["type", "number", "client", "issueDate", "dueDate", "status", "currency", "total", "paid", "balance"];
  const rows = invoices.map((i) =>
    [i.type === "quote" ? "quote" : "invoice", i.number, i.client, i.issueDate, i.dueDate, i.status, i.currency,
     totalOf(i), Number(i.paid) || 0, balanceOf(i)].map(esc).join(",")
  );
  return [head.join(","), ...rows].join("\n");
}

// Keys look like PRO-AAAA-BBBB-CCCC, where CCCC is derived from the first two
// groups. It runs entirely in the browser, so it only keeps honest people honest;
// move the check to a server if piracy ever becomes a real cost.
function checksum(s) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 46656;
  return h.toString(36).toUpperCase().padStart(3, "0").padStart(4, "Z");
}
export function makeLicense(a, b) {
  return `PRO-${a}-${b}-${checksum(a + b)}`;
}
export function validLicense(key) {
  const m = /^PRO-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec((key || "").trim().toUpperCase());
  return !!m && checksum(m[1] + m[2]) === m[3];
}

export const isQuote = (i) => i.type === "quote";
export const totalOf = (i) => calcTotals(i.items || [], i.taxRate, i.discount).total;
export const balanceOf = (i) => Math.max(0, round2(totalOf(i) - (Number(i.paid) || 0)));

export function overdue(inv, today = new Date().toISOString().slice(0, 10)) {
  return !isQuote(inv) && inv.status !== "paid" && inv.status !== "draft" && balanceOf(inv) > 0 &&
    !!inv.dueDate && inv.dueDate < today;
}

// Makes status and paid amount agree: fully paid means status "paid" and vice versa.
export function settle(inv) {
  if (isQuote(inv)) return { ...inv, paid: 0 };
  const total = totalOf(inv);
  let paid = Math.min(Math.max(Number(inv.paid) || 0, 0), total);
  let status = inv.status;
  if (status === "paid") paid = total;
  else if (total > 0 && paid >= total) status = "paid";
  else if (status === "accepted") status = "sent";
  return { ...inv, paid: round2(paid), status };
}

export function nextNumber(invoices, type) {
  const prefix = type === "quote" ? "QUO" : "INV";
  return nextInvoiceNumber(invoices.filter((i) => (i.number || "").startsWith(prefix + "-")), prefix);
}

export function convertQuote(quote, invoices, newId, today) {
  return {
    ...quote, id: newId(), type: "invoice", number: nextNumber(invoices, "invoice"),
    issueDate: today, dueDate: addDays(today, 14), status: "draft", paid: 0, recur: "", nextRun: "",
    convertedFrom: quote.number, items: (quote.items || []).map((x) => ({ ...x })),
  };
}

// Money summary per currency. Quotes and drafts aren't owed to you yet, so they're skipped.
export function summarize(invoices, today = new Date().toISOString().slice(0, 10)) {
  const out = {};
  for (const i of invoices) {
    if (isQuote(i)) continue;
    const o = (out[i.currency] ??= { currency: i.currency, outstanding: 0, overdue: 0, collected: 0 });
    o.collected = round2(o.collected + (Number(i.paid) || 0));
    if (i.status === "draft") continue;
    const b = balanceOf(i);
    o.outstanding = round2(o.outstanding + b);
    if (overdue(i, today)) o.overdue = round2(o.overdue + b);
  }
  return Object.values(out);
}

export function byClient(invoices) {
  const m = new Map();
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft") continue;
    const k = `${i.client}\u0000${i.currency}`;
    const r = m.get(k) ?? { client: i.client, currency: i.currency, billed: 0, paid: 0, balance: 0, count: 0 };
    r.billed = round2(r.billed + totalOf(i));
    r.paid = round2(r.paid + (Number(i.paid) || 0));
    r.balance = round2(r.balance + balanceOf(i));
    r.count++;
    m.set(k, r);
  }
  return [...m.values()].sort((a, b) => b.billed - a.billed);
}

// ---- recurring invoices ----
export function addPeriod(date, freq) {
  const d = new Date(date + "T00:00:00Z");
  if (freq === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (freq === "monthly") {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, dim));
  }
  return d.toISOString().slice(0, 10);
}
export function addDays(date, n) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dayDiff(a, b) {
  return Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 864e5);
}

// For each recurring invoice, adds a draft for every period that has passed.
// Returns a new list; the input is left alone.
export function runRecurring(invoices, today, newId) {
  let list = invoices.map((i) => ({ ...i }));
  let created = 0;
  for (const inv of [...list]) {
    if (!inv.recur || !inv.nextRun) continue;
    const terms = dayDiff(inv.issueDate, inv.dueDate);
    let guard = 0;
    while (inv.nextRun <= today && guard++ < 12) {
      list.unshift({
        ...inv, id: newId(), number: nextInvoiceNumber(list), issueDate: inv.nextRun,
        dueDate: addDays(inv.nextRun, terms), status: "draft", paid: 0, recur: "", nextRun: "",
        items: inv.items.map((x) => ({ ...x })),
      });
      inv.nextRun = addPeriod(inv.nextRun, inv.recur);
      created++;
    }
  }
  return { invoices: list, created };
}

// Sanity check for backup files before we trust them.
export function validInvoice(i) {
  return !!i && typeof i === "object" && typeof i.id === "string" && typeof i.number === "string" &&
    Array.isArray(i.items) && i.items.every((x) => x && typeof x === "object") &&
    ["draft", "sent", "paid", "accepted"].includes(i.status) && /^[A-Z]{3}$/.test(i.currency || "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(i.issueDate || "") && /^\d{4}-\d{2}-\d{2}$/.test(i.dueDate || "");
}


// ---- late fees, ageing, tracked time ----
export function lateFeeAmount(inv, today, pctPerMonth) {
  const days = dayDiff(inv.dueDate, today);
  const bal = balanceOf(inv);
  if (days <= 0 || bal <= 0 || !(pctPerMonth > 0)) return 0;
  return round2(bal * (pctPerMonth / 100) * Math.ceil(days / 30));
}

// Adds (or refreshes) a single late-fee line. The fee is worked out on the
// balance without any earlier fee line, so pressing the button twice is harmless.
export function applyLateFee(inv, today, pctPerMonth, label) {
  const base = { ...inv, items: inv.items.filter((x) => !x.lateFee) };
  const fee = lateFeeAmount(base, today, pctPerMonth);
  if (!fee) return base;
  return { ...base, items: [...base.items, { desc: label, qty: 1, price: fee, lateFee: true }] };
}

export function ageing(invoices, today) {
  const out = {};
  for (const i of invoices) {
    if (!overdue(i, today)) continue;
    const days = dayDiff(i.dueDate, today);
    const o = (out[i.currency] ??= { currency: i.currency, d30: 0, d60: 0, d90: 0, older: 0 });
    const k = days <= 30 ? "d30" : days <= 60 ? "d60" : days <= 90 ? "d90" : "older";
    o[k] = round2(o[k] + balanceOf(i));
  }
  return Object.values(out);
}

export const hoursOf = (secs) => round2(secs / 3600);

export function unbilledByClient(entries) {
  const m = new Map();
  for (const e of entries) {
    if (e.billed) continue;
    const r = m.get(e.client) ?? { client: e.client, secs: 0, count: 0 };
    r.secs += e.secs;
    r.count++;
    m.set(e.client, r);
  }
  return [...m.values()];
}

export function timeItems(entries, client, rate) {
  return entries.filter((e) => !e.billed && e.client === client)
    .map((e) => ({ desc: e.desc || client, qty: hoursOf(e.secs), price: Number(rate) || 0 }));
}

// ---- list search and filters ----
// f: all | unpaid | overdue | paid | quotes. q matches number, client, notes and line descriptions.
export function filterInvoices(list, { q = "", f = "all" } = {}, today = new Date().toISOString().slice(0, 10)) {
  const needle = String(q).trim().toLowerCase();
  const has = (i) => !needle || [i.number, i.client, i.notes, ...(i.items || []).map((x) => x.desc)].some((s) => String(s ?? "").toLowerCase().includes(needle));
  const ok = {
    all: () => true,
    unpaid: (i) => !isQuote(i) && i.status !== "draft" && balanceOf(i) > 0,
    overdue: (i) => overdue(i, today),
    paid: (i) => !isQuote(i) && i.status === "paid",
    quotes: isQuote,
  }[f] ?? (() => true);
  return list.filter((i) => ok(i) && has(i));
}

// ---------- insights: monthly flow, forecast, calculators ----------
// Months are counted by issue date (payments carry no date in QuickBill). Only one currency is summed at a time.
const monthKey = (d) => String(d || "").slice(0, 7);
export function currencyOf(invoices) {
  const count = {};
  for (const i of invoices) if (!isQuote(i)) count[i.currency || "USD"] = (count[i.currency || "USD"] || 0) + 1;
  const ranked = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return { currency: ranked[0]?.[0] ?? "USD", others: ranked.slice(1).map(([c]) => c) };
}
export function monthsBack(today, n) {
  const [y, m] = String(today).slice(0, 7).split("-").map(Number);
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - k), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}
// One row per month: what was billed and what has been paid so far on invoices issued that month.
export function monthlyFlow(invoices, today, months = 12, currency = "USD") {
  const keys = monthsBack(today, months);
  const rows = Object.fromEntries(keys.map((k) => [k, { month: k, billed: 0, collected: 0 }]));
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft" || (i.currency || "USD") !== currency) continue;
    const r = rows[monthKey(i.issueDate)];
    if (!r) continue;
    r.billed = round2(r.billed + totalOf(i));
    r.collected = round2(r.collected + Math.min(totalOf(i), Number(i.paid) || 0));
  }
  return keys.map((k) => rows[k]);
}
// Average monthly collection over the last six months (empty months count as zero), and what is due in the next 30 days.
export function forecast(invoices, today, currency = "USD") {
  const flow = monthlyFlow(invoices, today, 6, currency);
  const avg = round2(flow.reduce((s, r) => s + r.collected, 0) / 6);
  const end = addDays(today, 30);
  let dueSoon = 0;
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft" || (i.currency || "USD") !== currency) continue;
    if (i.dueDate >= today && i.dueDate <= end) dueSoon = round2(dueSoon + balanceOf(i));
  }
  return { avgMonthly: avg, next3: round2(avg * 3), dueSoon };
}
// Gross amount needed so that `netTarget` is left after tax and fees, and the hourly rate that gets there.
export function hourlyRate({ netTarget, taxPct, hours }) {
  const n = Number(netTarget), t = Number(taxPct) || 0, h = Number(hours);
  if (!(n > 0) || !(h > 0) || t < 0 || t >= 100) return null;
  const gross = round2(n / (1 - t / 100));
  return { gross, rate: round2(gross / h) };
}
export function netAfter({ gross, taxPct, feePct }) {
  const g = Number(gross), t = Number(taxPct) || 0, f = Number(feePct) || 0;
  if (!(g >= 0) || t < 0 || f < 0 || t + f >= 100) return null;
  const tax = round2((g * t) / 100), fee = round2((g * f) / 100);
  return { tax, fee, net: round2(g - tax - fee) };
}
