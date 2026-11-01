import * as L from "./logic.js";
import * as I from "./i18n.js";
import { CONFIG, checkoutLive } from "./config.js";
import * as LS from "./license.js";
import { initWorkspace } from "./workspace.js";
import * as V from "./video.js";
import { ensureSchema } from "./storage.js";

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { $("#store-warn").hidden = false; return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
try { ensureSchema(localStorage); } catch {}
let invoices = store.get("qb.invoices", []);
let filters = { q: "", f: "all" };
try { localStorage.setItem("qb.probe", "1"); localStorage.removeItem("qb.probe"); } catch { document.addEventListener("DOMContentLoaded", () => ($("#store-warn").hidden = false)); }
let license = store.get("qb.license", "");
let logo = store.get("qb.logo", "");
let editing = null; // the document open in the form
let licRec = store.get("qb.licsrv", null); // set when the key was accepted by the license server
let srvMode = store.get("qb.srvmode", false); // the server checks keys; offline-format keys are then not accepted
const isPro = () => LS.proStatus(license, licRec, srvMode);
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
  document.body.classList.toggle("is-pro", isPro());
  $("#plan").textContent = isPro() ? "Pro" : `Free ${invoices.length}/${L.FREE_LIMIT}`;
  $("#btn-upgrade").hidden = isPro();
  $("#empty").hidden = invoices.length > 0;
  $("#clients").innerHTML = [...new Set(invoices.map((i) => i.client).filter(Boolean))]
    .map((c) => `<option value="${esc(c)}">`).join("");
  $("#filters").hidden = invoices.length < 4;
  const shown = invoices.length < 4 ? invoices : L.filterInvoices(invoices, filters, today());
  $("#nomatch").hidden = !(invoices.length && !shown.length);
  $("#list").innerHTML = shown.map((i) => {
    const q = L.isQuote(i), bal = L.balanceOf(i);
    return `<div class="card" data-id="${esc(i.id)}" role="button" tabindex="0"><div><b>${esc(i.number)}</b> · ${esc(i.client)}<br>
      <span class="muted">${q ? I.t("validUntil") : I.t("dueWord")} ${esc(I.formatDate(i.dueDate))} · ${I.t(i.status)}${i.recur ? " · " + I.t(i.recur) : ""}</span>
      ${L.overdue(i) ? `<span class="late"> ${I.t("overdue")}</span>` : ""}</div>
      <div class="r"><b>${money(L.totalOf(i), i.currency)}</b>${!q && i.paid > 0 && bal > 0 ? `<br><span class="muted">${I.t("balance")} ${money(bal, i.currency)}</span>` : ""}</div></div>`;
  }).join("");
  renderDash();
  renderAgeing();
}

function renderDash() {
  const sums = L.summarize(invoices, today());
  $("#dash").innerHTML = sums.map((x) => `<div class="pc"><b>${esc(x.currency)}</b>
    <p>${I.t("dashOutstanding")}: <b>${money(x.outstanding, x.currency)}</b></p>
    <p class="${x.overdue ? "late" : ""}">${I.t("dashOverdue")}: ${money(x.overdue, x.currency)}</p>
    <p>${I.t("dashCollected")}: ${money(x.collected, x.currency)}</p></div>`).join("");
  const rows = L.byClient(invoices);
  $("#clientsum").innerHTML = !rows.length ? "" : isPro()
    ? `<details open><summary>${I.t("byClient")}</summary><table class="mini">${rows.map((r) =>
        `<tr><td>${esc(r.client)}</td><td class="r">${r.count}× ${I.t("billed")} ${money(r.billed, r.currency)}</td><td class="r">${I.t("balance")} ${money(r.balance, r.currency)}</td></tr>`).join("")}</table></details>`
    : `<p class="muted">${I.t("byClientPro")}</p>`;
}

function renderAgeing() {
  const rows = L.ageing(invoices, today());
  $("#ageing").innerHTML = !rows.length || !isPro() ? "" : `<details open><summary>${I.t("ageingTitle")}</summary><table class="mini">
    <tr><th></th><th class="r">${I.t("d30")}</th><th class="r">${I.t("d60")}</th><th class="r">${I.t("d90")}</th><th class="r">${I.t("older")}</th></tr>
    ${rows.map((r) => `<tr><td>${esc(r.currency)}</td>${["d30", "d60", "d90", "older"].map((k) => `<td class="r">${money(r[k], r.currency)}</td>`).join("")}</tr>`).join("")}</table></details>`;
}

// ---- time tracker ----
let entries = store.get("qb.time", []);
let running = store.get("qb.timer", null); // { client, desc, at }
let rate = store.get("qb.rate", 0);
let tick;
const fmtClock = (secs) => [Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60].map((n) => String(n).padStart(2, "0")).join(":");
function renderTime() {
  $("#t-toggle").textContent = I.t(running ? "stop" : "start");
  $("#t-rate").value = rate;
  const groups = L.unbilledByClient(entries);
  $("#t-list").innerHTML = groups.length ? groups.map((g) =>
    `<button type="button" data-pro data-bill="${esc(g.client)}">${esc(I.t("billTime", { client: g.client, h: L.hoursOf(g.secs) }))}</button>`).join(" ")
    : `<p class="muted">${I.t("timeEmpty")}</p>`;
  clearInterval(tick);
  const clock = () => ($("#t-clock").textContent = running ? fmtClock(Math.floor((Date.now() - running.at) / 1000)) : "");
  clock();
  if (running) tick = setInterval(clock, 1000);
}
$("#t-toggle").onclick = () => {
  if (!running) {
    const client = $("#t-client").value.trim();
    if (!client) return $("#t-client").focus();
    running = { client, desc: $("#t-desc").value.trim(), at: Date.now() };
    store.set("qb.timer", running);
  } else {
    const secs = Math.max(1, Math.round((Date.now() - running.at) / 1000));
    entries.push({ id: crypto.randomUUID(), client: running.client, desc: running.desc, secs, billed: false });
    store.set("qb.time", entries);
    running = null;
    store.del("qb.timer");
  }
  renderTime();
};
$("#t-rate").onchange = (e) => { rate = Number(e.target.value) || 0; store.set("qb.rate", rate); };
$("#t-list").onclick = (e) => {
  const b = e.target.closest("[data-bill]");
  if (!b) return;
  if (!isPro()) return openUpgrade(I.t("timePro"));
  if (!L.canSave(invoices, true, null)) return;
  const client = b.dataset.bill;
  const items = L.timeItems(entries, client, rate);
  const n = items.length;
  const doc = newDoc("invoice", { client, items });
  entries = entries.map((x) => (x.client === client && !x.billed ? { ...x, billed: true } : x));
  store.set("qb.time", entries);
  renderTime();
  toast(I.t("timeBilled", { n, num: doc.number }));
};

function itemRow(it = { desc: "", qty: 1, price: 0 }) {
  const d = document.createElement("div");
  d.className = "item";
  if (it.lateFee) d.dataset.fee = "1";
  d.innerHTML = `<input placeholder="${esc(I.t("desc"))}" value="${esc(it.desc)}" data-k="desc">
    <input type="number" min="0" step="any" value="${esc(it.qty)}" data-k="qty" aria-label="${esc(I.t("qty"))}">
    <input type="number" min="0" step="any" value="${esc(it.price)}" data-k="price" aria-label="${esc(I.t("price"))}">
    <button type="button" class="danger" aria-label="Remove item">×</button>`;
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
  inv.paid = Number(inv.paid) || 0;
  inv.lateFeePct = Number(inv.lateFeePct) || 0;
  inv.items = [...document.querySelectorAll("#items .item")].map((r) => ({
    desc: r.querySelector('[data-k="desc"]').value,
    qty: Number(r.querySelector('[data-k="qty"]').value) || 0,
    price: Number(r.querySelector('[data-k="price"]').value) || 0,
    ...(r.dataset.fee ? { lateFee: true } : {}),
  }));
  return inv;
}

function renderPreview() {
  if (!editing) return;
  const i = readForm();
  const t = L.calcTotals(i.items, i.taxRate, i.discount);
  const m = (n) => money(n, i.currency);
  const late = L.overdue({ ...i, paid: L.isQuote(i) ? 0 : i.paid }, today());
  $("#btn-latefee").hidden = !late;
  $("#btn-remind").hidden = !late;
  const showLogo = logo && isPro();
  $("#btn-logo-rm").hidden = !logo;
  $("#preview").innerHTML = `${showLogo ? `<img class="logo" alt="" src="${esc(logo)}">` : ""}<h2>${I.t(L.isQuote(i) ? "quote" : "invoice")} ${esc(i.number)}</h2>
    <p><b>${I.t("fromL")}:</b> ${esc(i.from)}<br><b>${I.t("toL")}:</b> ${esc(i.client)}<br>
    ${I.t("issuedL")} ${esc(I.formatDate(i.issueDate))} · ${I.t(L.isQuote(i) ? "validUntil" : "dueL")} ${esc(I.formatDate(i.dueDate))}${i.convertedFrom ? `<br><small>${esc(I.t("quoteOf", { n: i.convertedFrom }))}</small>` : ""}</p>
    <table><tr><th>${I.t("desc")}</th><th class="r">${I.t("qty")}</th><th class="r">${I.t("price")}</th><th class="r">${I.t("total")}</th></tr>
    ${i.items.map((x) => `<tr><td>${esc(x.desc)}</td><td class="r">${x.qty}</td><td class="r">${m(x.price)}</td><td class="r">${m(x.qty * x.price)}</td></tr>`).join("")}</table>
    <p class="r">${I.t("subtotal")} ${m(t.subtotal)}<br>${t.discount ? `${I.t("discountL")} −${m(t.discount)}<br>` : ""}${I.t("taxL")} ${m(t.tax)}<br><b>${I.t("total")} ${m(t.total)}</b>${!L.isQuote(i) && i.paid > 0 ? `<br>− ${m(Math.min(i.paid, t.total))}<br><b>${I.t("balance")} ${m(L.balanceOf(i))}</b>` : ""}</p>
    <p>${esc(i.notes)}</p>${i.payinfo ? `<p><b>${I.t("payinfo").replace(/\s*[（(].*$/, "")}</b><br>${esc(i.payinfo).replace(/\n/g, "<br>")}</p>` : ""}
    ${isPro() ? "" : `<p class="wm">${I.t("watermark")}</p>`}`;
}

function openEditor(inv) {
  editing = inv;
  for (const el of $("#form").elements) if (el.name) el.value = inv[el.name] ?? "";
  $("#items").replaceChildren(...inv.items.map(itemRow));
  const q = L.isQuote(inv), saved = invoices.some((x) => x.id === inv.id);
  $("#btn-delete").hidden = !saved;
  $("#btn-convert").hidden = !(q && saved);
  $("#paid-wrap").hidden = q;
  $("#due-lbl").textContent = I.t(q ? "validUntil" : "due");
  for (const o of $("#form").elements.status.options) o.hidden = o.disabled = q ? o.value === "paid" : o.value === "accepted";
  $("#list-view").hidden = true;
  $("#new-row").hidden = true;
  $("#edit-view").hidden = false;
  renderPreview();
}
function closeEditor() {
  editing = null;
  $("#edit-view").hidden = true;
  $("#new-row").hidden = false;
  $("#list-view").hidden = false;
  renderList();
}

function openUpgrade(reason = "") {
  // Until a real checkout link is set, don't send people to the placeholder page.
  const live = checkoutLive();
  $("#price").textContent = CONFIG.price;
  $("#buy").href = CONFIG.checkoutUrl;
  $("#buy").hidden = !live;
  $("#price").hidden = !live;
  $("#buy-soon").hidden = live;
  $("#lic-msg").textContent = reason;
  $("#lic-msg").hidden = !reason;
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
  renderTime();
  ws?.render();
}

// ---- events ----
function newDoc(type, extra = {}) {
  if (!L.canSave(invoices, isPro(), null)) return openUpgrade(limitMsg());
  const last = invoices[0];
  const doc = {
    id: crypto.randomUUID(), type, number: L.nextNumber(invoices, type), from: last?.from ?? "", client: "",
    currency: last?.currency ?? I.LANGS[I.getLang()].currency, issueDate: today(), dueDate: L.addDays(today(), type === "quote" ? 30 : 14),
    taxRate: last?.taxRate ?? 0, discount: 0, paid: 0, status: "draft", notes: "", payinfo: last?.payinfo ?? "", recur: "", nextRun: "",
    items: [{ desc: "", qty: 1, price: 0 }], lateFeePct: last?.lateFeePct ?? 0, ...extra,
  };
  openEditor(doc);
  return doc;
}
$("#btn-new").onclick = () => newDoc("invoice");
$("#btn-new-quote").onclick = () => newDoc("quote");
$("#btn-convert").onclick = () => {
  if (!L.canSave(invoices, isPro(), null)) return openUpgrade(limitMsg());
  const q = readForm();
  const inv = L.convertQuote(q, invoices, () => crypto.randomUUID(), today());
  const i = invoices.findIndex((x) => x.id === q.id);
  invoices[i >= 0 ? i : invoices.length] = { ...q, status: "accepted" };
  invoices.unshift(inv);
  persist();
  closeEditor();
  toast(I.t("converted", { n: inv.number }));
  openEditor(structuredClone(inv));
};
$("#btn-latefee").onclick = () => {
  const inv = readForm();
  const next = L.applyLateFee(inv, today(), inv.lateFeePct, I.t("feeItem"));
  editing = next;
  $("#items").replaceChildren(...next.items.map(itemRow));
  renderPreview();
};
$("#btn-remind").onclick = async () => {
  const inv = readForm();
  const text = I.t("reminderText", { client: inv.client, number: inv.number, amount: money(L.balanceOf(inv), inv.currency), date: I.formatDate(inv.dueDate), from: inv.from });
  try { await navigator.clipboard.writeText(text); toast(I.t("reminderCopied")); }
  catch { window.prompt(I.t("reminder"), text); }
};
$("#btn-add").onclick = () => $("#items").append(itemRow());
$("#form").addEventListener("input", renderPreview);
$("#form").onsubmit = (e) => {
  e.preventDefault();
  const inv = L.settle(readForm());
  if (inv.recur && !isPro()) { $("#form").elements.recur.value = ""; renderPreview(); return openUpgrade(I.t("recurPro")); }
  if (!L.canSave(invoices, isPro(), inv.id)) return openUpgrade(limitMsg());
  const prev = invoices.find((x) => x.id === inv.id);
  if (!inv.recur) inv.nextRun = "";
  else if (!inv.nextRun || prev?.recur !== inv.recur) inv.nextRun = L.addPeriod(inv.issueDate, inv.recur);
  const idx = invoices.findIndex((x) => x.id === inv.id);
  if (idx >= 0) invoices[idx] = inv; else invoices.unshift(inv);
  persist();
  // Invoices started from a video project count their extra rounds as billed only once they are saved.
  if (inv.videoRef && !prev && !L.isQuote(inv)) ws.video.markBilled(inv.videoRef.id, inv.videoRef.upTo);
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
const openCard = (e) => {
  const c = e.target.closest(".card");
  if (c) openEditor(structuredClone(invoices.find((x) => x.id === c.dataset.id)));
};
$("#list").onclick = openCard;
$("#list").onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(e); } };
$("#q").oninput = (e) => { filters.q = e.target.value; renderList(); };
$("#f").onchange = (e) => { filters.f = e.target.value; renderList(); };
$("#btn-dup").onclick = () => {
  const src = readForm();
  const copy = newDoc(src.type, {
    from: src.from, client: src.client, currency: src.currency, taxRate: src.taxRate, discount: src.discount,
    notes: src.notes, payinfo: src.payinfo, lateFeePct: src.lateFeePct,
    items: src.items.filter((x) => !x.lateFee).map((x) => ({ ...x })),
  });
  if (copy) toast(I.t("dupNote"));
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
$("#btn-backup").onclick = () => download("quickbill-backup.json", "application/json", JSON.stringify({ app: "quickbill", v: 2, invoices, logo, video: ws.video.exportProjects() }));
$("#btn-restore").onclick = () => $("#file-restore").click();
$("#file-restore").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "quickbill" || !Array.isArray(data.invoices) || !data.invoices.every(L.validInvoice)) throw 0;
    // Backups from before the video module have no "video" key; those leave the current video projects alone.
    const hasVideo = data.video !== undefined;
    if (hasVideo && (!Array.isArray(data.video) || !data.video.every(V.validProject))) throw 0;
    if (!isPro() && (data.invoices.length > L.FREE_LIMIT || (hasVideo && data.video.length > V.FREE_VIDEO))) return openUpgrade(limitMsg());
    try { localStorage.setItem("qb.invoices.bak-restore", JSON.stringify(invoices)); } catch {}
    if (hasVideo) ws.video.replaceProjects(data.video);
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

const licFail = { network: "licNetwork", revoked: "licRevoked", unknown: "badKey" };
$("#dlg").addEventListener("close", async () => {
  if ($("#dlg").returnValue !== "ok") return;
  const k = $("#lic").value.trim();
  if (!k) return;
  toast(I.t("licChecking"));
  const r = await LS.activate(k, { fetchImpl: fetch.bind(window), api: CONFIG.licenseApi });
  if (!r.ok) return openUpgrade(I.t(licFail[r.reason] || "badKey"));
  license = k; store.set("qb.license", k);
  licRec = r.record; if (licRec) store.set("qb.licsrv", licRec); else store.del("qb.licsrv");
  if (r.server) { srvMode = true; store.set("qb.srvmode", true); }
  $("#toast").hidden = true;
  runRecurring(); renderList(); renderPreview();
});

// Ask the license server once per load whether it is switched on, and re-check a stored key about once a week.
// Being offline or having no server never removes Pro; only a clear "refunded/disabled" answer does.
if (/^https?:$/.test(location.protocol) && navigator.onLine !== false) (async () => {
  const m = await LS.serverMode(fetch.bind(window), CONFIG.licenseApi);
  if (m !== null && m !== srvMode) { srvMode = m; store.set("qb.srvmode", m); renderList(); renderPreview(); }
  if (licRec && LS.needsRecheck(licRec)) {
    const r = await LS.recheck(licRec, { fetchImpl: fetch.bind(window), api: CONFIG.licenseApi });
    if (r.keep) { licRec = r.record; store.set("qb.licsrv", licRec); }
    else { licRec = null; store.del("qb.licsrv"); toast(I.t("licLost")); renderList(); renderPreview(); }
  }
})();

let saved = null; try { saved = localStorage.getItem("qb.lang"); } catch {}
I.setLang(I.detectLang(saved));
I.langSelect($("#lang"), (l) => { I.setLang(l); try { localStorage.setItem("qb.lang", l); } catch {} fullRender(); });
runRecurring();
const ws = initWorkspace({
  store, toast, isPro, openUpgrade, download,
  getInvoices: () => invoices,
  getFrom: () => invoices.find((i) => i.from)?.from ?? "",
  createInvoice: (items, extra = {}) => newDoc("invoice", { items, ...extra }),
  createDoc: (type, extra = {}) => newDoc(type, extra),
});
fullRender();
renderTime();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
