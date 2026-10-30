import * as L from "./logic.js";
import { CONFIG } from "./config.js";

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
let invoices = store.get("qb.invoices", []);
let license = store.get("qb.license", "");
let editing = null; // current invoice object
const isPro = () => L.validLicense(license);
const today = () => new Date().toISOString().slice(0, 10);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const persist = () => store.set("qb.invoices", invoices);

function renderList() {
  $("#plan").textContent = isPro() ? "Pro" : `Free ${invoices.length}/${L.FREE_LIMIT}`;
  $("#btn-upgrade").hidden = isPro();
  $("#empty").hidden = invoices.length > 0;
  $("#list").innerHTML = invoices.map((i) => {
    const t = L.calcTotals(i.items, i.taxRate, i.discount).total;
    return `<div class="card" data-id="${esc(i.id)}"><div><b>${esc(i.number)}</b> · ${esc(i.client)}<br>
      <span class="muted">due ${esc(i.dueDate)} · ${esc(i.status)}</span>
      ${L.overdue(i) ? '<span class="late"> overdue</span>' : ""}</div>
      <b>${L.formatMoney(t, i.currency)}</b></div>`;
  }).join("");
}

function itemRow(it = { desc: "", qty: 1, price: 0 }) {
  const d = document.createElement("div");
  d.className = "item";
  d.innerHTML = `<input placeholder="Description" value="${esc(it.desc)}" data-k="desc">
    <input type="number" min="0" step="any" value="${esc(it.qty)}" data-k="qty">
    <input type="number" min="0" step="any" value="${esc(it.price)}" data-k="price">
    <button type="button" class="ghost danger" aria-label="Remove item">×</button>`;
  d.querySelector("button").onclick = () => { d.remove(); renderPreview(); };
  return d;
}

function readForm() {
  const f = new FormData($("#form"));
  const inv = { ...editing, ...Object.fromEntries(f) };
  inv.taxRate = Number(inv.taxRate) || 0;
  inv.discount = Number(inv.discount) || 0;
  inv.items = [...document.querySelectorAll("#items .item")].map((r) => ({
    desc: r.querySelector('[data-k="desc"]').value,
    qty: Number(r.querySelector('[data-k="qty"]').value) || 0,
    price: Number(r.querySelector('[data-k="price"]').value) || 0,
  }));
  return inv;
}

function renderPreview() {
  const i = readForm();
  const t = L.calcTotals(i.items, i.taxRate, i.discount);
  const m = (n) => L.formatMoney(n, i.currency);
  $("#preview").innerHTML = `<h2>Invoice ${esc(i.number)}</h2>
    <p><b>From:</b> ${esc(i.from)}<br><b>To:</b> ${esc(i.client)}<br>
    Issued ${esc(i.issueDate)} · Due ${esc(i.dueDate)}</p>
    <table><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr>
    ${i.items.map((x) => `<tr><td>${esc(x.desc)}</td><td class="r">${x.qty}</td><td class="r">${m(x.price)}</td><td class="r">${m(x.qty * x.price)}</td></tr>`).join("")}</table>
    <p class="r">Subtotal ${m(t.subtotal)}<br>${t.discount ? `Discount −${m(t.discount)}<br>` : ""}Tax ${m(t.tax)}<br><b>Total ${m(t.total)}</b></p>
    <p>${esc(i.notes)}</p>
    ${isPro() ? "" : `<p class="wm">Made with ${CONFIG.appName} – upgrade to remove this line</p>`}`;
}

function openEditor(inv) {
  editing = inv;
  const form = $("#form");
  for (const el of form.elements) if (el.name) el.value = inv[el.name] ?? "";
  $("#items").replaceChildren(...inv.items.map(itemRow));
  $("#btn-delete").hidden = !invoices.some((x) => x.id === inv.id);
  $("#list-view").hidden = true;
  $("#edit-view").hidden = false;
  renderPreview();
}
function closeEditor() {
  $("#edit-view").hidden = true;
  $("#list-view").hidden = false;
  renderList();
}

function openUpgrade(reason = "") {
  $("#price").textContent = CONFIG.price;
  $("#buy").href = CONFIG.checkoutUrl;
  $("#lic-msg").textContent = reason;
  $("#dlg").showModal();
}

$("#btn-new").onclick = () => {
  if (!L.canSave(invoices, isPro(), null)) return openUpgrade(`Free plan is limited to ${L.FREE_LIMIT} invoices.`);
  const last = invoices[0];
  openEditor({
    id: crypto.randomUUID(), number: L.nextInvoiceNumber(invoices), from: last?.from ?? "", client: "",
    currency: last?.currency ?? "USD", issueDate: today(),
    dueDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    taxRate: 0, discount: 0, status: "draft", notes: "", items: [{ desc: "", qty: 1, price: 0 }],
  });
};
$("#btn-add").onclick = () => $("#items").append(itemRow());
$("#form").addEventListener("input", renderPreview);
$("#form").onsubmit = (e) => {
  e.preventDefault();
  const inv = readForm();
  if (!L.canSave(invoices, isPro(), inv.id)) return openUpgrade(`Free plan is limited to ${L.FREE_LIMIT} invoices.`);
  const idx = invoices.findIndex((x) => x.id === inv.id);
  if (idx >= 0) invoices[idx] = inv; else invoices.unshift(inv);
  persist();
  closeEditor();
};
$("#btn-back").onclick = closeEditor;
$("#btn-print").onclick = () => window.print();
$("#btn-delete").onclick = () => {
  if (!confirm("Delete this invoice?")) return;
  invoices = invoices.filter((x) => x.id !== editing.id);
  persist();
  closeEditor();
};
$("#list").onclick = (e) => {
  const c = e.target.closest(".card");
  if (c) openEditor(structuredClone(invoices.find((x) => x.id === c.dataset.id)));
};
$("#btn-upgrade").onclick = () => openUpgrade();
$("#btn-csv").onclick = () => {
  if (!isPro()) return openUpgrade("CSV export is a Pro feature.");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([L.toCSV(invoices)], { type: "text/csv" }));
  a.download = "invoices.csv";
  a.click();
};
$("#dlg").addEventListener("close", () => {
  if ($("#dlg").returnValue !== "ok") return;
  const k = $("#lic").value.trim().toUpperCase();
  if (L.validLicense(k)) { license = k; store.set("qb.license", k); renderList(); }
  else openUpgrade("Invalid license key.");
});

renderList();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
