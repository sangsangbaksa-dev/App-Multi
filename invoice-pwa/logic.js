// Everything here is DOM-free so `npm test` can cover it directly.
export const FREE_LIMIT = 3;
export const FREE_SHEETS = 2;
export const FREE_DOCS = 2;

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// withholdingRate: tax the client holds back and pays to the tax office for you (e.g. 3.3% in Korea, 10.21% in Japan).
// It is a share of the amount before tax, so it never changes `total`; `payable` is what actually reaches you.
export const MAX_WITHHOLDING = 50;
export function calcTotals(items, taxRate = 0, discount = 0, withholdingRate = 0) {
  const subtotal = round2(
    items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0)
  );
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const taxable = subtotal - disc;
  const tax = round2(taxable * ((Number(taxRate) || 0) / 100));
  const wr = Math.min(Math.max(Number(withholdingRate) || 0, 0), MAX_WITHHOLDING);
  const withholding = round2(taxable * (wr / 100));
  const total = round2(taxable + tax);
  return { subtotal, discount: round2(disc), tax, total, withholding, payable: round2(total - withholding) };
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
  const head = ["type", "number", "client", "issueDate", "dueDate", "status", "currency", "total", "withheld", "paid", "balance"];
  const rows = invoices.map((i) =>
    [i.type === "quote" ? "quote" : "invoice", i.number, i.client, i.issueDate, i.dueDate, i.status, i.currency,
     totalOf(i), withheldOf(i), Number(i.paid) || 0, balanceOf(i)].map(esc).join(",")
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
const totalsOf = (i) => calcTotals(i.items || [], i.taxRate, i.discount, i.withholdingRate);
export const totalOf = (i) => totalsOf(i).total;
export const withheldOf = (i) => totalsOf(i).withholding;
// What the client actually pays: the total minus tax they withhold. `paid` and the balance are measured against this.
export const payableOf = (i) => totalsOf(i).payable;
export const balanceOf = (i) => Math.max(0, round2(payableOf(i) - (Number(i.paid) || 0)));
// The part of the invoice total that counts as received: cash paid plus the matching share of withheld tax.
export function grossPaidOf(i) {
  const t = totalsOf(i);
  if (!(t.payable > 0)) return 0;
  return round2((Math.min(Number(i.paid) || 0, t.payable) / t.payable) * t.total);
}

export function overdue(inv, today = new Date().toISOString().slice(0, 10)) {
  return !isQuote(inv) && inv.status !== "paid" && inv.status !== "draft" && balanceOf(inv) > 0 &&
    !!inv.dueDate && inv.dueDate < today;
}

// Makes status and paid amount agree: fully paid means status "paid" and vice versa.
export function settle(inv) {
  if (isQuote(inv)) return { ...inv, paid: 0, payments: [] };
  const total = payableOf(inv);
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
    issueDate: today, dueDate: addDays(today, 14), status: "draft", paid: 0, payments: [], recur: "", nextRun: "",
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
    const r = m.get(k) ?? { client: i.client, currency: i.currency, billed: 0, withheld: 0, paid: 0, balance: 0, count: 0 };
    r.billed = round2(r.billed + payableOf(i));
    r.withheld = round2(r.withheld + withheldOf(i));
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
        dueDate: addDays(inv.nextRun, terms), status: "draft", paid: 0, payments: [], recur: "", nextRun: "",
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
    r.collected = round2(r.collected + grossPaidOf(i));
  }
  return keys.map((k) => rows[k]);
}
// Clients ranked by what was billed in the last `months` months (single currency), with their share of the total.
export function topClients(invoices, today, currency = "USD", n = 5, months = 12) {
  const keys = new Set(monthsBack(today, months));
  const m = new Map();
  let total = 0;
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft" || (i.currency || "USD") !== currency || !keys.has(monthKey(i.issueDate))) continue;
    const t = totalOf(i);
    m.set(i.client, round2((m.get(i.client) || 0) + t));
    total = round2(total + t);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n)
    .map(([client, billed]) => ({ client, billed, share: total > 0 ? Math.round((billed / total) * 100) : 0 }));
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

// ---------- expenses, profit and a rough tax estimate ----------
export const EXPENSE_LIMIT = 2000;
export function validExpense(e) {
  return !!e && typeof e.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ""))
    && typeof e.desc === "string" && e.desc.length <= 120
    && Number(e.amount) >= 0 && Number.isFinite(Number(e.amount)) && typeof e.currency === "string"
    && (e.category === undefined || EXPENSE_CATEGORIES.includes(e.category));
}
export const EXPENSE_CATEGORIES = ["software", "equipment", "travel", "meals", "office", "marketing", "fees", "other"];
// Income is what has been paid on invoices issued in `year`; expenses are dated expenses in `year`. Both in one currency.
export function yearSummary(invoices, expenses, year, currency = "USD") {
  const y = String(year);
  let income = 0, spent = 0, withheld = 0;
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft" || (i.currency || "USD") !== currency || !String(i.issueDate).startsWith(y)) continue;
    const g = grossPaidOf(i);
    income = round2(income + g);
    withheld = round2(withheld + (g - Math.min(Number(i.paid) || 0, payableOf(i))));
  }
  for (const e of expenses) {
    if ((e.currency || "USD") !== currency || !String(e.date).startsWith(y)) continue;
    spent = round2(spent + Number(e.amount));
  }
  const profit = round2(income - spent);
  return { income, expenses: spent, profit, withheld };
}
// Years that have any invoice or expense, newest first; the current year is always offered.
export function taxYears(invoices, expenses, today) {
  const ys = new Set([String(today).slice(0, 4)]);
  for (const i of invoices) if (!isQuote(i) && /^\d{4}/.test(i.issueDate || "")) ys.add(i.issueDate.slice(0, 4));
  for (const e of expenses) ys.add(String(e.date).slice(0, 4));
  return [...ys].sort().reverse();
}
const quarterOf = (date) => Math.floor((Number(String(date).slice(5, 7)) - 1) / 3);
// Income, expenses and profit per quarter. Income is counted by invoice issue date, like yearSummary, so the four rows add up to it.
export function quarterlySummary(invoices, expenses, year, currency = "USD") {
  const y = String(year);
  const q = [0, 1, 2, 3].map((k) => ({ quarter: k + 1, income: 0, expenses: 0, profit: 0 }));
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft" || (i.currency || "USD") !== currency || !String(i.issueDate).startsWith(y)) continue;
    const r = q[quarterOf(i.issueDate)];
    r.income = round2(r.income + grossPaidOf(i));
  }
  for (const e of expenses) {
    if ((e.currency || "USD") !== currency || !String(e.date).startsWith(y)) continue;
    const r = q[quarterOf(e.date)];
    r.expenses = round2(r.expenses + Number(e.amount));
  }
  for (const r of q) r.profit = round2(r.income - r.expenses);
  return q;
}
// Spending by category for one year and currency, biggest first. Expenses saved before categories existed count as "other".
export function expensesByCategory(expenses, year, currency = "USD") {
  const sums = {};
  for (const e of expenses) {
    if ((e.currency || "USD") !== currency || !String(e.date).startsWith(String(year))) continue;
    const c = EXPENSE_CATEGORIES.includes(e.category) ? e.category : "other";
    sums[c] = round2((sums[c] || 0) + Number(e.amount));
  }
  return Object.entries(sums).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}
const safeCell = (v) => { if (typeof v === "number") return esc(v); const s = String(v ?? ""); return esc(/^[=+\-@\t\r]/.test(s) ? "'" + s : s); };
export function expensesCSV(expenses, year) {
  const rows = expenses.filter((e) => !year || String(e.date).startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.desc.localeCompare(b.desc))
    .map((e) => [e.date, e.desc, EXPENSE_CATEGORIES.includes(e.category) ? e.category : "other", e.currency, e.amount]);
  return [["date", "description", "category", "currency", "amount"].join(","), ...rows.map((r) => r.map(safeCell).join(","))].join("\n");
}
// One sheet for the accountant: quarters, totals, spending by category and the tax set-aside at the user's rate.
export function taxReportCSV(invoices, expenses, year, currency, pct) {
  const q = quarterlySummary(invoices, expenses, year, currency);
  const sum = yearSummary(invoices, expenses, year, currency);
  const tax = taxEstimate(sum.profit, pct);
  const rows = [["section", "label", "income", "expenses", "profit"],
    ...q.map((r) => ["quarter", `Q${r.quarter} ${year}`, r.income, r.expenses, r.profit]),
    ["total", `${year} ${currency}`, sum.income, sum.expenses, sum.profit],
    ...(sum.withheld > 0 ? [["tax-withheld-by-clients", `${year} ${currency}`, sum.withheld, "", ""]] : []),
    ...expensesByCategory(expenses, year, currency).map((c) => ["category", c.category, "", c.total, ""]),
    ["tax-set-aside", `${Number(pct) || 0}%`, "", "", tax ?? ""]];
  return rows.map((r) => r.map(safeCell).join(",")).join("\n");
}

// A rough estimate only: a percentage of profit, never below zero. The user sets the percentage and checks it with an adviser.
export function taxEstimate(profit, pct) {
  const p = Number(pct);
  if (!(p >= 0) || p >= 100) return null;
  return round2(Math.max(0, Number(profit) || 0) * (p / 100));
}

// ---- dated payments ----
// `paid` stays the number everything else reads. The log only adds dates, so older invoices (no log) keep working
// and a hand-typed "amount paid" is never overwritten.
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
export function recordPayment(inv, date, amount) {
  if (isQuote(inv) || !validDate(date)) return inv;
  const amt = Math.min(round2(Number(amount) || 0), balanceOf(inv));
  if (!(amt > 0)) return inv;
  const next = { ...inv, paid: round2((Number(inv.paid) || 0) + amt), payments: [...(inv.payments || []), { date, amount: amt }] };
  if (next.status === "draft") next.status = "sent";
  return settle(next);
}
export function removePayment(inv, index) {
  const list = inv.payments || [];
  if (!list[index]) return inv;
  const gone = list[index];
  const wasPaid = inv.status === "paid";
  return { ...inv, paid: Math.max(0, round2((Number(inv.paid) || 0) - gone.amount)), payments: list.filter((_, k) => k !== index), status: wasPaid ? "sent" : inv.status };
}

// How fast people pay: only invoices that are fully paid and have at least one dated payment.
export function paymentStats(invoices) {
  const rows = [];
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft" || !(totalOf(i) > 0) || balanceOf(i) > 0) continue;
    const dates = (i.payments || []).map((p) => p.date).filter(validDate);
    if (!dates.length) continue;
    const last = dates.sort().at(-1);
    rows.push({ client: i.client, days: Math.max(0, dayDiff(i.issueDate, last)), onTime: last <= i.dueDate });
  }
  const avg = (a) => (a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : 0);
  const by = new Map();
  for (const r of rows) by.set(r.client, [...(by.get(r.client) || []), r.days]);
  return {
    count: rows.length, avgDays: avg(rows.map((r) => r.days)),
    onTimePct: rows.length ? Math.round((100 * rows.filter((r) => r.onTime).length) / rows.length) : 0,
    byClient: [...by].map(([client, d]) => ({ client, count: d.length, avgDays: avg(d) })).sort((a, b) => b.avgDays - a.avgDays),
  };
}

// Same normalisation as the remembered-client profiles: "Acme" and " acme " are one client.
export const habitKey = (name) => String(name ?? "").trim().toLowerCase();
// Per-client payment habit from fully paid invoices with dated payments: days from issue to last payment, and how often on time.
export function clientHabits(invoices) {
  const m = new Map();
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft" || !(payableOf(i) > 0) || balanceOf(i) > 0) continue;
    const dates = (i.payments || []).map((p) => p.date).filter(validDate);
    if (!dates.length) continue;
    const last = dates.sort().at(-1);
    const r = m.get(habitKey(i.client)) ?? { days: [], onTime: 0 };
    r.days.push(Math.max(0, dayDiff(i.issueDate, last)));
    if (last <= i.dueDate) r.onTime++;
    m.set(habitKey(i.client), r);
  }
  const out = Object.create(null);
  for (const [client, r] of m) out[client] = { count: r.days.length, avgDays: Math.round(r.days.reduce((a, b) => a + b, 0) / r.days.length), onTimePct: Math.round((100 * r.onTime) / r.days.length) };
  return out;
}

// When open invoices will probably be paid: issue date plus that client's usual days to pay (never in the past),
// or the due date for a client with no history. Grouped into months for the next `months` months, plus a flag for
// invoices expected after their due date. An estimate from your own records, nothing is fetched.
export function expectedCash(invoices, today, currency = "USD", months = 3) {
  const habits = clientHabits(invoices);
  const rows = [];
  for (const i of invoices) {
    if (isQuote(i) || i.status === "draft" || (i.currency || "USD") !== currency) continue;
    const bal = balanceOf(i);
    if (!(bal > 0) || !validDate(i.issueDate) || !validDate(i.dueDate)) continue;
    const h = habits[habitKey(i.client)];
    let when = h ? addDays(i.issueDate, h.avgDays) : i.dueDate;
    if (when < today) when = today;
    rows.push({ id: i.id, number: i.number, client: i.client, balance: bal, due: i.dueDate, expected: when, basis: h ? "history" : "due", slow: when > i.dueDate && when > today });
  }
  rows.sort((a, b) => a.expected.localeCompare(b.expected) || String(a.number).localeCompare(String(b.number)));
  const keys = monthsBack(addMonthsIso(today, months - 1), months);
  const byMonth = keys.map((month) => ({ month, amount: round2(rows.filter((r) => r.expected.slice(0, 7) === month).reduce((s, r) => s + r.balance, 0)) }));
  const later = round2(rows.filter((r) => r.expected.slice(0, 7) > keys.at(-1)).reduce((s, r) => s + r.balance, 0));
  return { rows, byMonth, later, total: round2(rows.reduce((s, r) => s + r.balance, 0)) };
}

// "Nov 2026" style label for a YYYY-MM key, in the viewer's locale (falls back to the key).
export function monthLabel(month, locale = "en-US") {
  if (!/^\d{4}-\d{2}$/.test(month || "")) return String(month ?? "");
  try { return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", timeZone: "UTC" }).format(new Date(month + "-01T00:00:00Z")); } catch { return month; }
}

// Cash that arrived per payment month (by the payment's own date), one currency.
export function receivedByMonth(invoices, today, months = 6, currency = "USD") {
  const keys = monthsBack(today, months);
  const sums = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const i of invoices) {
    if (isQuote(i) || (i.currency || "USD") !== currency) continue;
    for (const p of i.payments || []) {
      const k = String(p.date || "").slice(0, 7);
      if (k in sums) sums[k] = round2(sums[k] + (Number(p.amount) || 0));
    }
  }
  return keys.map((month) => ({ month, received: sums[month] }));
}

// ---- upcoming recurring invoices ----
// Projects each recurring invoice forward from its nextRun, so the owner can see what will be billed.
// Capped per invoice; the amount is the template's current total.
export function upcomingRecurring(invoices, today, months = 3, cap = 24) {
  const end = addMonthsIso(today, months);
  const rows = [];
  for (const inv of invoices) {
    if (isQuote(inv) || !inv.recur || !inv.nextRun) continue;
    let run = inv.nextRun, n = 0;
    while (run <= end && n++ < cap) {
      if (run >= today) rows.push({ date: run, client: inv.client, number: inv.number, currency: inv.currency, amount: payableOf(inv), freq: inv.recur });
      run = addPeriod(run, inv.recur);
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.client.localeCompare(b.client));
}
function addMonthsIso(date, n) {
  let d = date;
  for (let k = 0; k < n; k++) d = addPeriod(d, "monthly");
  return d;
}
export function upcomingTotals(rows) {
  const out = {};
  for (const r of rows) out[r.currency] = round2((out[r.currency] || 0) + r.amount);
  return out;
}

// One row per dated payment, for an accountant. Cells that start with = + - @ are prefixed so spreadsheets don't run them.
export function paymentsCSV(invoices) {
  const cell = (v) => { const s = String(v ?? ""); return esc(/^[=+\-@\t\r]/.test(s) ? "'" + s : s); };
  const rows = [];
  for (const i of invoices) {
    if (isQuote(i)) continue;
    for (const p of i.payments || []) rows.push([p.date, i.number, i.client, i.currency, p.amount, i.dueDate, totalOf(i), withheldOf(i), balanceOf(i)]);
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));
  return [["paymentDate", "invoice", "client", "currency", "amount", "dueDate", "invoiceTotal", "invoiceWithheld", "invoiceBalance"].join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n");
}

// Statement of account for one client and currency: every sent invoice with what is still owed, plus dated payments.
// Drafts and quotes are skipped. Oldest invoice first, so the page reads like a ledger.
export function statement(invoices, client, currency, today = new Date().toISOString().slice(0, 10)) {
  const rows = invoices
    .filter((i) => !isQuote(i) && i.status !== "draft" && i.client === client && i.currency === currency)
    .sort((a, b) => (a.issueDate + a.number).localeCompare(b.issueDate + b.number))
    .map((i) => ({
      number: i.number, issueDate: i.issueDate, dueDate: i.dueDate, total: totalOf(i), withheld: withheldOf(i),
      payable: payableOf(i), paid: round2(Number(i.paid) || 0), balance: balanceOf(i), overdue: overdue(i, today),
      payments: (i.payments || []).filter((p) => validDate(p.date)).map((p) => ({ date: p.date, amount: p.amount })),
    }));
  const sum = (k) => round2(rows.reduce((s, r) => s + r[k], 0));
  return {
    client, currency, asOf: today, rows,
    totals: { billed: sum("total"), withheld: sum("withheld"), payable: sum("payable"), paid: sum("paid"), balance: sum("balance"),
      overdue: round2(rows.filter((r) => r.overdue).reduce((s, r) => s + r.balance, 0)) },
  };
}
export function statementCSV(st) {
  const head = ["number", "issueDate", "dueDate", "total", "withheld", "paid", "balance"];
  const rows = st.rows.map((r) => [r.number, r.issueDate, r.dueDate, r.total, r.withheld, r.paid, r.balance].map(esc).join(","));
  return [head.join(","), ...rows].join("\n");
}
