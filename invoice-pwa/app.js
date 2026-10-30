import * as L from "./logic.js";
import * as I from "./i18n.js";
import { CONFIG } from "./config.js";

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
let invoices = store.get("qb.invoices", []);
let license = store.get("qb.license", "");
let logo = store.get("qb.logo", "");
let editing = null; // current invoice object
const isPro = () => L.validLicense(license);
const today = () => new Date().toISOString().slice(0, 10);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const persist = () => store.set("qb.invoices", invoices);
const money = (n, cur) => L.formatMoney(n, cur, I.locale());

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3500);
}

function renderList() {
  $("#plan").textContent = isPro() ? "Pro" : `Free ${invoices.length}/${L.FREE_LIMIT}`;
  $("#btn-upgrade").hidden = isPro();
  $("#empty").hidden = invoices.length > 0;
  $("#clients").innerHTML = [...new Set(invoices.map((i) => i.client).filter(Boolean))]
    .map((c) => `<option value="${esc(c)}">`).join("");
  $("#list").innerHTML = invoices.map((i) => {
    const t = L.calcTotals(i.items, i.taxRate, i.discount).total;
    return `<div class="card" data-id="${esc(i.id)}"><div><b>${esc(i.number)}</b> · ${esc(i.client)}<br>
      <span class="muted">${I.t("dueWord")} ${esc(I.formatDate(i.dueDate))} · ${I.t(i.status)}${i.recur ? " · ↻" : ""}</span>
      ${L.overdue(i) ? `<span class="late"> ${I.t("overdue")}</span>` : ""}</div>
      <b>${money(t, i.currency)}</b></div>`;
  }).join("");
}

function itemRow(it = { desc: "", qty: 1, price: 0 }) {
  const d = document.createElement("div");
  d.className = "item";
  d.innerHTML = `<input placeholder="${esc(I.t("desc"))}" value="${esc(it.desc)}" data-k="desc">
    <input type="number" min="0" step="any" value="${esc(it.qty)}" data-k="qty" aria-label="${esc(I.t("qty"))}">
    <input type="number" min="0" step="any" value="${esc(it.price)}" data-k="price" aria-label="${esc(I.t("price"))}">
    <button type="button" class="ghost danger" aria-label="Remove item">×</button>`;
  d.querySelector("button").onclick = () => { d.remove(); renderPreview(); };
  return d;
}

function readForm() {
  const f = new FormData($("#form"));
  const inv = { ...editing, ...Object.fromEntries(f) };
  delete inv[""];
  inv.taxRate = Number(inv.taxRate) || 0;
  inv.discount = Number(inv.discount) || 0;
  inv.recur = inv.recur || "";
  inv.items = [...document.querySelectorAll("#items .item")].map((r) => ({
    desc: r.querySelector('[data-k="desc"]').value,
    qty: Number(r.querySelector('[data-k="qty"]').value) || 0,
    price: Number(r.querySelector('[data-k="price"]').value) || 0,
  }));
  return inv;
}

function renderPreview() {
  if (!editing) return;
  const i = readForm();
  const t = L.calcTotals(i.items, i.taxRate, i.discount);
  const m = (n) => money(n, i.currency);
  const showLogo = logo && isPro();
  $("#btn-logo-rm").hidden = !logo;
  $("#preview").innerHTML = `${showLogo ? `<img class="logo" alt="" src="${esc(logo)}">` : ""}<h2>${I.t("invoice")} ${esc(i.number)}</h2>
    <p><b>${I.t("fromL")}:</b> ${esc(i.from)}<br><b>${I.t("toL")}:</b> ${esc(i.client)}<br>
    ${I.t("issuedL")} ${esc(I.formatDate(i.issueDate))} · ${I.t("dueL")} ${esc(I.formatDate(i.dueDate))}</p>
    <table><tr><th>${I.t("desc")}</th><th class="r">${I.t("qty")}</th><th class="r">${I.t("price")}</th><th class="r">${I.t("total")}</th></tr>
    ${i.items.map((x) => `<tr><td>${esc(x.desc)}</td><td class="r">${x.qty}</td><td class="r">${m(x.price)}</td><td class="r">${m(x.qty * x.price)}</td></tr>`).join("")}</table>
    <p class="r">${I.t("subtotal")} ${m(t.subtotal)}<br>${t.discount ? `${I.t("discountL")} −${m(t.discount)}<br>` : ""}${I.t("taxL")} ${m(t.tax)}<br><b>${I.t("total")} ${m(t.total)}</b></p>
    <p>${esc(i.notes)}</p>
    ${isPro() ? "" : `<p class="wm">${I.t("watermark")}</p>`}`;
}

function openEditor(inv) {
  editing = inv;
  for (const el of $("#form").elements) if (el.name) el.value = inv[el.name] ?? "";
  $("#items").replaceChildren(...inv.items.map(itemRow));
  $("#btn-delete").hidden = !invoices.some((x) => x.id === inv.id);
  $("#list-view").hidden = true;
  $("#edit-view").hidden = false;
  renderPreview();
}
function closeEditor() {
  editing = null;
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
const limitMsg = () => I.t("freeLimit", { n: L.FREE_LIMIT });

function runRecurring() {
  if (!isPro()) return;
  const r = L.runRecurring(invoices, today(), () => crypto.randomUUID());
  if (r.created) {
    invoices = r.invoices;
    persist();
    toast(I.t("generated", { n: r.created }));
  }
}

function fullRender() {
  I.applyI18n();
  document.title = "QuickBill";
  renderList();
  renderPreview();
}

// ---- events ----
$("#btn-new").onclick = () => {
  if (!L.canSave(invoices, isPro(), null)) return openUpgrade(limitMsg());
  const last = invoices[0];
  openEditor({
    id: crypto.randomUUID(), number: L.nextInvoiceNumber(invoices), from: last?.from ?? "", client: "",
    currency: last?.currency ?? I.LANGS[I.getLang()].currency, issueDate: today(), dueDate: L.addDays(today(), 14),
    taxRate: last?.taxRate ?? 0, discount: 0, status: "draft", notes: "", recur: "", nextRun: "",
    items: [{ desc: "", qty: 1, price: 0 }],
  });
};
$("#btn-add").onclick = () => $("#items").append(itemRow());
$("#form").addEventListener("input", renderPreview);
$("#form").onsubmit = (e) => {
  e.preventDefault();
  const inv = readForm();
  if (inv.recur && !isPro()) { $("#form").elements.recur.value = ""; renderPreview(); return openUpgrade(I.t("recurPro")); }
  if (!L.canSave(invoices, isPro(), inv.id)) return openUpgrade(limitMsg());
  const prev = invoices.find((x) => x.id === inv.id);
  if (!inv.recur) inv.nextRun = "";
  else if (!inv.nextRun || prev?.recur !== inv.recur) inv.nextRun = L.addPeriod(inv.issueDate, inv.recur);
  const idx = invoices.findIndex((x) => x.id === inv.id);
  if (idx >= 0) invoices[idx] = inv; else invoices.unshift(inv);
  persist();
  runRecurring();
  closeEditor();
};
$("#btn-back").onclick = closeEditor;
$("#btn-print").onclick = () => window.print();
$("#btn-delete").onclick = () => {
  if (!confirm(I.t("confirmDelete"))) return;
  invoices = invoices.filter((x) => x.id !== editing.id);
  persist();
  closeEditor();
};
$("#list").onclick = (e) => {
  const c = e.target.closest(".card");
  if (c) openEditor(structuredClone(invoices.find((x) => x.id === c.dataset.id)));
};
$("#btn-upgrade").onclick = () => openUpgrade();

function download(name, type, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$("#btn-csv").onclick = () => {
  if (!isPro()) return openUpgrade(I.t("csvPro"));
  download("invoices.csv", "text/csv", L.toCSV(invoices));
};
$("#btn-backup").onclick = () => download("quickbill-backup.json", "application/json", JSON.stringify({ app: "quickbill", v: 1, invoices, logo }));
$("#btn-restore").onclick = () => $("#file-restore").click();
$("#file-restore").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "quickbill" || !Array.isArray(data.invoices) || !data.invoices.every(L.validInvoice)) throw 0;
    if (!isPro() && data.invoices.length > L.FREE_LIMIT) return openUpgrade(limitMsg());
    invoices = data.invoices;
    if (typeof data.logo === "string" && data.logo.startsWith("data:image/")) { logo = data.logo; store.set("qb.logo", logo); }
    persist();
    renderList();
    toast(I.t("restoreOk", { n: invoices.length }));
  } catch { toast(I.t("restoreBad")); }
};

function shrinkImage(file, max = 240) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}
$("#logo-file").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (!isPro()) return openUpgrade(I.t("logoPro"));
  try { logo = await shrinkImage(file); store.set("qb.logo", logo); renderPreview(); } catch { toast(I.t("restoreBad")); }
};
$("#btn-logo-rm").onclick = () => { logo = ""; store.del("qb.logo"); renderPreview(); };

$("#dlg").addEventListener("close", () => {
  if ($("#dlg").returnValue !== "ok") return;
  const k = $("#lic").value.trim().toUpperCase();
  if (L.validLicense(k)) { license = k; store.set("qb.license", k); runRecurring(); renderList(); renderPreview(); }
  else openUpgrade(I.t("badKey"));
});

let saved = null; try { saved = localStorage.getItem("qb.lang"); } catch {}
I.setLang(I.detectLang(saved));
I.langSelect($("#lang"), (l) => { I.setLang(l); try { localStorage.setItem("qb.lang", l); } catch {} fullRender(); });
runRecurring();
fullRender();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
