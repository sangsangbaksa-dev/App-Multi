// Insights tab (monthly chart, forecast, calculators) and the freelancer playbook tab.
// Everything is computed on the device from the invoices already stored; nothing is sent anywhere.
import * as L from "./logic.js";
import * as I from "./i18n.js";
import { PLAYBOOK, entryFor } from "./playbook.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fill = (tpl, vars) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), tpl);

export function initInsights({ getInvoices, isPro, openUpgrade, today, store }) {
  const getExpenses = () => store.get("qb.expenses", []).filter(L.validExpense);
  const saveExpenses = (list) => store.set("qb.expenses", list);
  const money = (n, cur) => L.formatMoney(n, cur, I.locale());

  function renderChart(flow, cur) {
    const W = 600, H = 220, pad = 26, top = 8;
    const max = Math.max(1, ...flow.flatMap((r) => [r.billed, r.collected]));
    const slot = (W - 2 * 8) / flow.length;
    const bw = Math.max(4, Math.min(18, slot * 0.36));
    const y = (v) => H - pad - ((H - pad - top) * v) / max;
    const bars = flow.map((r, k) => {
      const x0 = 8 + k * slot + slot / 2;
      const hb = H - pad - y(r.billed), hc = H - pad - y(r.collected);
      return `<g><title>${esc(r.month)}: ${esc(I.t("insBilled"))} ${esc(money(r.billed, cur))} · ${esc(I.t("insCollected"))} ${esc(money(r.collected, cur))}</title>
        <rect class="bar-b" x="${(x0 - bw - 1).toFixed(1)}" y="${y(r.billed).toFixed(1)}" width="${bw}" height="${Math.max(0, hb).toFixed(1)}"></rect>
        <rect class="bar-c" x="${(x0 + 1).toFixed(1)}" y="${y(r.collected).toFixed(1)}" width="${bw}" height="${Math.max(0, hc).toFixed(1)}"></rect>
        <text x="${x0.toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(r.month.slice(5))}</text></g>`;
    }).join("");
    $("#ins-chart").innerHTML = `<title id="ins-chart-t">${esc(I.t("insChartLabel"))}</title><line class="axis" x1="8" x2="${W - 8}" y1="${H - pad}" y2="${H - pad}"></line>${bars}`;
  }

  function renderTable(flow, cur) {
    const t = $("#ins-table");
    t.hidden = false;
    t.innerHTML = `<thead><tr><th>${esc(I.t("insMonth"))}</th><th class="r">${esc(I.t("insBilled"))}</th><th class="r">${esc(I.t("insCollected"))}</th></tr></thead><tbody>${flow.map((r) =>
      `<tr><td>${esc(r.month)}</td><td class="r">${esc(money(r.billed, cur))}</td><td class="r">${esc(money(r.collected, cur))}</td></tr>`).join("")}</tbody>`;
  }

  function renderTop(rows, cur) {
    const t = $("#ins-top");
    t.hidden = !rows.length;
    t.innerHTML = `<caption>${esc(I.t("insTop"))}</caption><thead><tr><th>${esc(I.t("insClient"))}</th><th class="r">${esc(I.t("insBilled"))}</th><th class="r">${esc(I.t("insShare"))}</th></tr></thead><tbody>${rows.map((r) =>
      `<tr><td>${esc(r.client)}</td><td class="r">${esc(money(r.billed, cur))}</td><td class="r">${r.share}%</td></tr>`).join("")}</tbody>`;
  }

  function renderInsights() {
    const invoices = getInvoices();
    const hasAny = invoices.some((i) => !L.isQuote(i));
    const { currency, others } = L.currencyOf(invoices);
    $("#ins-empty").hidden = hasAny;
    $("#ins-fig").hidden = !hasAny;
    $("#ins-table").hidden = !hasAny;
    $("#ins-cards").hidden = !hasAny;
    $("#ins-other").hidden = !others.length;
    $("#ins-top").hidden = !hasAny;
    if (!hasAny) return;
    const flow = L.monthlyFlow(invoices, today(), 12, currency);
    renderChart(flow, currency);
    renderTable(flow, currency);
    renderTop(L.topClients(invoices, today(), currency), currency);
    $("#ins-other").textContent = fill(I.raw("insOther"), { list: others.join(", ") });
    const f = L.forecast(invoices, today(), currency);
    $("#ins-cards").innerHTML = [
      [I.t("insAvg"), f.avgMonthly],
      [I.t("insNext3"), f.next3],
      [I.t("insDueSoon"), f.dueSoon],
    ].map(([label, v]) => `<div class="pc"><p>${esc(label)}</p><b>${esc(money(v, currency))}</b></div>`).join("");
  }

  // Calculators show amounts in the same currency as the charts: the one used most on the invoices.
  const cur = () => L.currencyOf(getInvoices()).currency;
  function calcRate() {
    const r = L.hourlyRate({ netTarget: $("#cr-net").value, taxPct: $("#cr-tax").value, hours: $("#cr-hours").value });
    $("#cr-out").textContent = r
      ? fill(I.raw("calcRateOut"), { rate: money(r.rate, cur()), gross: money(r.gross, cur()) })
      : I.t("calcInvalid");
  }
  function calcNet() {
    const r = L.netAfter({ gross: $("#cn-gross").value, taxPct: $("#cn-tax").value, feePct: $("#cn-fee").value });
    $("#cn-out").textContent = r
      ? fill(I.raw("calcNetOut"), { net: money(r.net, cur()), tax: money(r.tax, cur()), fee: money(r.fee, cur()) })
      : I.t("calcInvalid");
  }
  $("#calc-rate").addEventListener("input", calcRate);
  $("#calc-net").addEventListener("input", calcNet);
  $("#calc-rate").addEventListener("submit", (e) => e.preventDefault());
  $("#calc-net").addEventListener("submit", (e) => e.preventDefault());

  function renderTips() {
    const pro = isPro();
    $("#tips-list").innerHTML = PLAYBOOK.map((e) => {
      const x = entryFor(e, I.getLang());
      const open = e.free || pro;
      const head = `<h3 class="h tip-h">${esc(x.title)} ${e.free ? `<span class="badge">${esc(I.t("tipsFree"))}</span>` : (pro ? "" : `<span class="badge">${esc(I.t("tipsProBadge"))}</span>`)}</h3>`;
      if (!open) return `<article class="tip locked" data-tip="${esc(e.id)}">${head}<p class="muted">${esc(I.t("tipsLocked"))}</p><button type="button" class="accent" data-tip-up>${esc(I.t("goPro"))}</button></article>`;
      return `<article class="tip">${head}<ul class="ticks">${x.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></article>`;
    }).join("");
    document.querySelectorAll("[data-tip-up]").forEach((b) => (b.onclick = () => openUpgrade(I.t("tipsLocked"))));
  }

  // ---------- expenses, profit and tax estimate (Pro) ----------
  function renderExpenses() {
    const pro = isPro();
    $("#exp-locked").hidden = pro;
    $("#exp-body").hidden = !pro;
    if (!pro) return;
    const invoices = getInvoices();
    const { currency } = L.currencyOf(invoices);
    const year = today().slice(0, 4);
    const list = getExpenses().filter((e) => e.date.startsWith(year)).sort((a, b) => (a.date < b.date ? 1 : -1));
    $("#exp-empty").hidden = list.length > 0;
    const table = $("#exp-table");
    table.hidden = !list.length;
    table.innerHTML = list.length ? `<tbody>${list.map((e) => `<tr><td>${esc(e.date)}</td><td>${esc(e.desc)}</td><td class="r">${esc(money(e.amount, e.currency))}</td><td class="r"><button type="button" data-exp-del="${esc(e.id)}" aria-label="${esc(I.t("expDelete"))}: ${esc(e.desc)}">${esc(I.t("expDelete"))}</button></td></tr>`).join("")}</tbody>` : "";
    const sum = L.yearSummary(invoices, getExpenses(), year, currency);
    $("#exp-sum").textContent = fill(I.raw("expSummary"), { year, income: money(sum.income, currency), expenses: money(sum.expenses, currency), profit: money(sum.profit, currency) });
    const tax = L.taxEstimate(sum.profit, $("#tax-pct").value);
    $("#tax-out").textContent = tax === null ? I.t("calcInvalid") : fill(I.raw("taxOut"), { tax: money(tax, currency) });
  }

  $("#exp-up").onclick = () => openUpgrade(I.t("expLocked"));
  $("#exp-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isPro()) return openUpgrade(I.t("expLocked"));
    const date = $("#exp-date").value, desc = $("#exp-desc").value.trim(), amount = Number($("#exp-amount").value);
    const expense = { id: crypto.randomUUID(), date, desc, amount, currency: L.currencyOf(getInvoices()).currency };
    if (!L.validExpense(expense) || !date) { $("#exp-err").textContent = I.t("expErr"); return; }
    if (getExpenses().length >= L.EXPENSE_LIMIT) { $("#exp-err").textContent = I.t("expErr"); return; }
    $("#exp-err").textContent = "";
    saveExpenses([...getExpenses(), expense]);
    e.target.reset();
    renderExpenses();
  });
  $("#exp-table").addEventListener("click", (e) => {
    const id = e.target.dataset?.expDel;
    if (!id) return;
    saveExpenses(getExpenses().filter((x) => x.id !== id));
    renderExpenses();
  });
  $("#tax-pct").addEventListener("input", renderExpenses);

  // ---------- payment reminders (free) ----------
  function renderReminders() {
    const invoices = getInvoices();
    const open = invoices
      .filter((i) => !L.isQuote(i) && i.status !== "draft" && L.balanceOf(i) > 0)
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    $("#rem-empty").hidden = open.length > 0;
    $("#rem-list").innerHTML = open.map((i) => `<article class="tip">
      <h3 class="h tip-h">${esc(i.number)} · ${esc(i.client || "")}</h3>
      <p class="muted">${esc(money(L.balanceOf(i), i.currency))} · ${esc(I.formatDate(i.dueDate))}</p>
      <button type="button" data-rem="${esc(i.id)}">${esc(I.t("remCopy"))}</button></article>`).join("");
  }
  $("#rem-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-rem]");
    if (!btn) return;
    const i = getInvoices().find((x) => x.id === btn.dataset.rem);
    if (!i) return;
    const text = fill(I.raw("remTpl"), { client: i.client || "", number: i.number || "", amount: money(L.balanceOf(i), i.currency), due: I.formatDate(i.dueDate) });
    try { await navigator.clipboard.writeText(text); } catch { window.prompt(I.t("remCopy"), text); }
    btn.textContent = I.t("remCopied");
    setTimeout(() => (btn.textContent = I.t("remCopy")), 1600);
  });

  return {
    render() {
      renderInsights();
      renderExpenses();
      renderReminders();
      calcRate();
      calcNet();
      renderTips();
    },
  };
}
