// Pure business logic (no DOM) so it can be unit-tested with `node --test`.
export const FREE_LIMIT = 3;

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

// Offline license format: PRO-XXXX-XXXX-CCCC where CCCC is a checksum of the
// first two groups. Issue keys from your payment provider's fulfilment hook.
// NOTE: client-side only = soft gate; swap for a server check when you scale.
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

// Keeps status and paid amount consistent: fully paid <=> status "paid".
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

// Per-currency money summary over real invoices (quotes and drafts are not receivables).
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

// Creates a draft copy for every elapsed period of each recurring invoice.
// Returns { invoices, created } and never mutates the input.
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

// Shape check for restored backups (never trust imported JSON).
export function validInvoice(i) {
  return !!i && typeof i === "object" && typeof i.id === "string" && typeof i.number === "string" &&
    Array.isArray(i.items) && i.items.every((x) => x && typeof x === "object") &&
    ["draft", "sent", "paid", "accepted"].includes(i.status) && /^[A-Z]{3}$/.test(i.currency || "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(i.issueDate || "") && /^\d{4}-\d{2}-\d{2}$/.test(i.dueDate || "");
}
