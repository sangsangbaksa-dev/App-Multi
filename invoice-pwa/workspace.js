// Sheets and Documents tabs. App-level concerns (plan, toasts, invoices) come in through `ctx`.
import * as S from "./sheet.js";
import * as D from "./docs.js";
import * as L from "./logic.js";
import * as I from "./i18n.js";
import { initVideo } from "./video-ui.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TABS = ["invoices", "sheets", "docs", "video"];

export function initWorkspace(ctx) {
  const { store, toast, isPro, openUpgrade } = ctx;
  let sheets = store.get("qb.sheets", []);
  let docs = store.get("qb.docs", []);
  let templates = store.get("qb.templates", []);
  let sheetId = store.get("qb.sheetId", null);
  let doc = null; // document open in the editor
  const id = () => crypto.randomUUID();
  const sheet = () => sheets.find((x) => x.id === sheetId) ?? sheets[0] ?? null;

  const video = initVideo({ ...ctx, showTab: (n) => showTab(n) });

  // ---------- tabs ----------
  function showTab(name) {
    for (const t of TABS) {
      $(`#tab-${t}`).hidden = t !== name;
      const b = document.querySelector(`[data-tab="${t}"]`);
      b.setAttribute("aria-current", String(t === name));
    }
    store.set("qb.tab", name);
    render();
  }
  document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

  // ---------- sheets ----------
  function newSheet(name, cells = {}) {
    if (!isPro() && sheets.length >= L.FREE_SHEETS) { openUpgrade(I.t("sheetLimit", { n: L.FREE_SHEETS })); return null; }
    const sz = S.sheetSize(cells);
    const sh = { id: id(), name: name || `${I.t("sheetDefault")} ${sheets.length + 1}`, cells, rows: sz.rows, cols: sz.cols };
    sheets.push(sh);
    sheetId = sh.id;
    saveSheets();
    return sh;
  }
  const saveSheets = () => { store.set("qb.sheets", sheets); store.set("qb.sheetId", sheetId); };

  function renderSheets() {
    const sh = sheet();
    $("#sh-select").innerHTML = sheets.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
    $("#sh-empty").hidden = !!sh;
    $("#sh-body").hidden = !sh;
    if (!sh) return;
    $("#sh-select").value = sh.id;
    $("#sh-name").value = sh.name;
    const head = Array.from({ length: sh.cols }, (_, c) => `<th>${S.colName(c)}</th>`).join("");
    const rows = Array.from({ length: sh.rows }, (_, r) =>
      `<tr><th>${r + 1}</th>${Array.from({ length: sh.cols }, (_, c) => `<td><input data-ref="${S.refOf(c, r)}" autocomplete="off" spellcheck="false"></td>`).join("")}</tr>`).join("");
    $("#sh-grid").innerHTML = `<table class="sheet"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    refreshCells();
  }
  function refreshCells() {
    const sh = sheet();
    if (!sh) return;
    const get = S.evaluate(sh.cells);
    for (const inp of document.querySelectorAll("#sh-grid input")) {
      if (inp === document.activeElement) continue;
      const ref = inp.dataset.ref, raw = sh.cells[ref] ?? "";
      inp.value = raw === "" ? "" : S.display(get(ref));
      inp.classList.toggle("calc", raw[0] === "=");
      inp.classList.toggle("err", /^#/.test(inp.value));
      inp.classList.toggle("num", typeof get(ref) === "number");
      inp.title = raw[0] === "=" ? raw : "";
    }
  }
  const grid = $("#sh-grid");
  grid.addEventListener("focusin", (e) => {
    const sh = sheet();
    if (e.target.dataset.ref) { e.target.value = sh.cells[e.target.dataset.ref] ?? ""; e.target.select(); }
  });
  grid.addEventListener("focusout", (e) => {
    const sh = sheet();
    const ref = e.target.dataset.ref;
    if (!ref) return;
    const v = e.target.value;
    if (v === "") delete sh.cells[ref]; else sh.cells[ref] = v;
    saveSheets();
    // The field still counts as focused during focusout, so refresh after it has gone.
    setTimeout(refreshCells, 0);
  });
  grid.addEventListener("keydown", (e) => {
    const ref = e.target.dataset?.ref;
    if (!ref || !["Enter", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    const m = /^([A-Z]+)(\d+)$/.exec(ref);
    const r = Number(m[2]) + (e.key === "ArrowUp" ? -1 : 1);
    const next = grid.querySelector(`[data-ref="${m[1]}${r}"]`);
    if (next) { e.preventDefault(); next.focus(); }
  });

  $("#sh-select").onchange = (e) => { sheetId = e.target.value; saveSheets(); renderSheets(); };
  $("#sh-name").onchange = (e) => { sheet().name = e.target.value.trim() || sheet().name; saveSheets(); renderSheets(); };
  $("#sh-new").onclick = () => { if (newSheet()) renderSheets(); };
  $("#sh-row").onclick = () => { sheet().rows += 5; saveSheets(); renderSheets(); };
  $("#sh-col").onclick = () => { sheet().cols = Math.min(26, sheet().cols + 1); saveSheets(); renderSheets(); };
  $("#sh-del").onclick = () => {
    if (!confirm(I.t("confirmDelete"))) return;
    sheets = sheets.filter((x) => x.id !== sheet().id);
    sheetId = sheets[0]?.id ?? null;
    saveSheets();
    renderSheets();
  };
  $("#sh-fill").onclick = () => {
    const inv = ctx.getInvoices();
    const t = I.t;
    const rows = [[t("number"), t("client"), t("issue"), t("due"), t("total"), t("paid"), t("balance")]];
    inv.filter((i) => !L.isQuote(i)).forEach((i) => rows.push([i.number, i.client, i.issueDate, i.dueDate, String(L.totalOf(i)), String(Number(i.paid) || 0), String(L.balanceOf(i))]));
    const n = rows.length;
    rows.push(["", "", "", "", `=SUM(E2:E${n})`, `=SUM(F2:F${n})`, `=SUM(G2:G${n})`]);
    if (newSheet(t("tabInvoices"), S.rowsToCells(rows))) renderSheets();
  };
  $("#sh-export").onclick = () => {
    if (!isPro()) return openUpgrade(I.t("sheetCsvPro"));
    const sh = sheet();
    ctx.download(`${sh.name}.csv`, "text/csv", S.toCSV(S.trimRows(S.computedRows(sh.cells, sh.rows, sh.cols))));
  };
  $("#sh-import").onclick = () => { if (!isPro()) return openUpgrade(I.t("sheetCsvPro")); $("#sh-file").click(); };
  $("#sh-file").onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const rows = S.parseCSV(await f.text());
    if (newSheet(f.name.replace(/\.csv$/i, ""), S.rowsToCells(rows))) renderSheets();
  };
  $("#sh-invoice").onclick = () => {
    if (!isPro()) return openUpgrade(I.t("sheetInvPro"));
    const sh = sheet();
    const items = S.invoiceLines(sh.cells, sh.rows);
    if (!items.length) return toast(I.t("sheetNoLines"));
    ctx.createInvoice(items);
    showTab("invoices");
  };

  // ---------- documents ----------
  const saveDocs = () => store.set("qb.docs", docs);
  const BUILTIN = { tplProposal: "tplProposalBody", tplAgreement: "tplAgreementBody", tplScope: "tplScopeBody" };

  function vars(d) {
    return { client: d?.client ?? "", from: $("#doc-from").value.trim() || ctx.getFrom(), date: I.formatDate(new Date().toISOString().slice(0, 10)) };
  }
  function renderDocList() {
    $("#doc-list").innerHTML = docs.map((d) => `<div class="card" data-doc="${esc(d.id)}"><div><b>${esc(d.title || "—")}</b><br><span class="muted">${esc(d.client || "")}</span></div></div>`).join("");
    $("#doc-empty").hidden = docs.length > 0;
  }
  function templateOptions() {
    const own = templates.map((t) => `<option value="own:${esc(t.id)}">${esc(t.name)}</option>`).join("");
    return `<option value="">${I.t("tplBlank")}</option>` +
      Object.keys(BUILTIN).map((k) => `<option value="${k}">${I.t(k)}</option>`).join("") +
      (own ? `<optgroup label="${esc(I.t("myTemplate", { n: templates.length }))}">${own}</optgroup>` : "");
  }
  function renderDocPreview() {
    if (!doc) return;
    const body = D.fill($("#doc-body").value, vars({ client: $("#doc-client").value }));
    $("#doc-preview").innerHTML = D.render(body);
    const miss = D.missing(body);
    $("#doc-missing").textContent = miss.length ? I.t("docMissing", { list: miss.map((m) => `{{${m}}}`).join(" ") }) : "";
  }
  function openDoc(d) {
    doc = d;
    $("#doc-title").value = d.title;
    $("#doc-client").value = d.client || "";
    $("#doc-body").value = d.body;
    $("#doc-from").value = store.get("qb.me", "") || ctx.getFrom();
    $("#doc-template").innerHTML = templateOptions();
    $("#doc-template").value = "";
    $("#doc-list-view").hidden = true;
    $("#doc-edit").hidden = false;
    $("#doc-delete").hidden = !docs.some((x) => x.id === d.id);
    renderDocPreview();
  }
  function closeDoc() {
    doc = null;
    $("#doc-edit").hidden = true;
    $("#doc-list-view").hidden = false;
    renderDocList();
  }
  $("#doc-new").onclick = () => {
    if (!isPro() && docs.length >= L.FREE_DOCS) return openUpgrade(I.t("docLimit", { n: L.FREE_DOCS }));
    openDoc({ id: id(), title: "", client: "", body: "" });
  };
  $("#doc-list").onclick = (e) => {
    const c = e.target.closest("[data-doc]");
    if (c) openDoc(structuredClone(docs.find((x) => x.id === c.dataset.doc)));
  };
  $("#doc-from").addEventListener("change", (e) => store.set("qb.me", e.target.value.trim()));
  for (const sel of ["#doc-title", "#doc-client", "#doc-from", "#doc-body"]) $(sel).addEventListener("input", renderDocPreview);
  $("#doc-template").onchange = (e) => {
    const v = e.target.value;
    if (!v) return;
    if ($("#doc-body").value.trim() && !confirm(I.t("confirmDelete"))) { e.target.value = ""; return; }
    const own = v.startsWith("own:") ? templates.find((t) => t.id === v.slice(4)) : null;
    $("#doc-body").value = own ? own.body : I.raw(BUILTIN[v]);
    if (!$("#doc-title").value) $("#doc-title").value = own ? own.name : I.t(v);
    renderDocPreview();
  };
  $("#doc-save").onclick = () => {
    const d = { ...doc, title: $("#doc-title").value.trim(), client: $("#doc-client").value.trim(), body: $("#doc-body").value };
    if (!isPro() && !docs.some((x) => x.id === d.id) && docs.length >= L.FREE_DOCS) return openUpgrade(I.t("docLimit", { n: L.FREE_DOCS }));
    const i = docs.findIndex((x) => x.id === d.id);
    if (i >= 0) docs[i] = d; else docs.unshift(d);
    saveDocs();
    closeDoc();
  };
  $("#doc-as-template").onclick = () => {
    if (!isPro()) return openUpgrade(I.t("docTplPro"));
    const name = $("#doc-title").value.trim() || I.t("newDocument");
    templates.push({ id: id(), name, body: $("#doc-body").value });
    store.set("qb.templates", templates);
    $("#doc-template").innerHTML = templateOptions();
    toast(I.t("templateSaved"));
  };
  $("#doc-print").onclick = () => window.print();
  $("#doc-back").onclick = closeDoc;
  $("#doc-delete").onclick = () => {
    if (!confirm(I.t("confirmDelete"))) return;
    docs = docs.filter((x) => x.id !== doc.id);
    saveDocs();
    closeDoc();
  };

  function render() {
    renderSheets();
    renderDocList();
    video.render();
    if (doc) { $("#doc-template").innerHTML = templateOptions(); renderDocPreview(); }
  }
  const saved = store.get("qb.tab", "invoices");
  showTab(TABS.includes(saved) ? saved : "invoices");
  return { render, showTab, video };
}
