// The Video tab: projects, timecoded revision requests, deliveries, approval, and billing for extra rounds.
import * as V from "./video.js";
import * as L from "./logic.js";
import * as I from "./i18n.js";
import * as S from "./sheet.js";
import { readVideo, writeVideo } from "./storage.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const ls = {
  getItem(k) { try { return localStorage.getItem(k); } catch { return null; } },
  setItem(k, v) { localStorage.setItem(k, v); },
};

export function initVideo(ctx) {
  const { toast, isPro, openUpgrade, showTab } = ctx;
  const state = readVideo(ls);
  let projects = state.projects;
  const locked = state.locked;
  let curId = null;
  let editReq = null; // id of the request being edited in place
  const cur = () => projects.find((p) => p.id === curId) ?? null;
  const money = (n, c) => L.formatMoney(n, c, I.locale());

  function save() {
    if (locked) { toast(I.t("vidLocked")); return false; }
    try { writeVideo(ls, projects); return true; } catch { toast(I.t("vidSaveFail")); return false; }
  }
  // Applies a change to the open project and saves it. fn returns the new project, or { error } to refuse.
  function change(fn) {
    const p = cur();
    if (!p) return null;
    const next = fn(p);
    if (!next || next.error) return next ?? null;
    const np = next.project ?? next;
    projects = projects.map((x) => (x.id === np.id ? np : x));
    save();
    renderEditor();
    return next;
  }

  // ---------- list ----------
  function renderList() {
    $("#vid-lock").hidden = !locked;
    $("#vid-new").disabled = locked;
    $("#vid-broken").hidden = !state.broken;
    $("#vid-empty").hidden = projects.length > 0;
    const t = today();
    const sm = V.summary(projects, t);
    $("#vid-summary").hidden = !projects.length;
    $("#vid-summary").textContent = I.t("vidSummary", sm);
    $("#vid-list").innerHTML = V.sortProjects(projects, t).map((p) => {
      const late = V.isLate(p, t), open = V.openCount(p);
      return `<div class="card" data-vid="${esc(p.id)}" role="button" tabindex="0"><div><b>${esc(p.title || "—")}</b>${p.client ? ` · ${esc(p.client)}` : ""}<br>
        <span class="muted">${esc(I.t("st" + p.status[0].toUpperCase() + p.status.slice(1)))}${p.due ? ` · ${esc(I.formatDate(p.due))}` : ""}</span>${late ? ` <span class="late">${esc(I.t("vidLate"))}</span>` : ""}</div>
        <div class="r">${p.rounds ? esc(I.t("vidRound", { n: p.rounds })) : ""}${open ? `<br><span class="muted">${esc(I.t("vidOpen", { n: open }))}</span>` : ""}</div></div>`;
    }).join("");
  }
  const openCard = (el) => { const c = el.closest("[data-vid]"); if (c) openProject(c.dataset.vid); };
  $("#vid-list").addEventListener("click", (e) => openCard(e.target));
  $("#vid-list").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(e.target); } });

  $("#vid-new").onclick = () => {
    if (!isPro() && projects.length >= V.FREE_VIDEO) return openUpgrade(I.t("vidLimit", { n: V.FREE_VIDEO }));
    const p = V.newProject(crypto.randomUUID(), today(), { currency: I.LANGS[I.getLang()].currency });
    projects = [p, ...projects];
    openProject(p.id);
    $("#vid-title").focus();
  };

  function openProject(id) {
    curId = id;
    editReq = null;
    $("#vid-list-view").hidden = true;
    $("#vid-edit").hidden = false;
    renderEditor();
  }
  function closeProject() {
    const p = cur();
    // A project that was never filled in is dropped instead of leaving an empty row behind.
    if (p && !p.title && !p.client && !p.requests.length && !p.deliveries.length) { projects = projects.filter((x) => x.id !== p.id); save(); }
    curId = null;
    $("#vid-edit").hidden = true;
    $("#vid-list-view").hidden = false;
    renderList();
  }
  $("#vid-back").onclick = closeProject;
  $("#vid-del").onclick = () => {
    if (!confirm(I.t("confirmDelete"))) return;
    projects = projects.filter((x) => x.id !== curId);
    save();
    closeProject();
  };

  // ---------- editor ----------
  const setVal = (sel, v) => { const el = $(sel); if (el !== document.activeElement) el.value = v; };

  function renderEditor() {
    const p = cur();
    if (!p) return;
    setVal("#vid-title", p.title);
    setVal("#vid-client", p.client);
    $("#vid-status").innerHTML = V.STATUSES.map((s) => `<option value="${s}">${esc(I.t("st" + s[0].toUpperCase() + s.slice(1)))}</option>`).join("");
    $("#vid-status").value = p.status;
    setVal("#vid-due", p.due);
    setVal("#vid-included", p.included);
    setVal("#vid-fee", p.fee);
    setVal("#vid-base", p.base || 0);
    if (![...$("#vid-cur").options].some((o) => o.value === p.currency)) $("#vid-cur").add(new Option(p.currency, p.currency));
    $("#vid-cur").value = p.currency;

    const extra = V.unbilledRounds(p);
    $("#vid-money").innerHTML = `${esc(I.t("vidRoundsLine", { used: p.rounds, inc: p.included }))}<br>` +
      (extra ? `<b>${esc(I.t("vidExtraLine", { n: extra, each: money(p.fee, p.currency), total: money(V.extraCost(p), p.currency) }))}</b>` : esc(I.t("vidNoExtra"))) +
      (p.billedRounds ? `<br>${esc(I.t("vidBilledCount", { n: p.billedRounds }))}` : "");
    $("#vid-bill").disabled = !extra;
    $("#vid-reset-billed").hidden = !p.billedRounds;

    let html = "";
    for (let r = p.rounds; r >= 1; r--) {
      const list = V.requestsOf(p, r);
      const isExtra = r > (Number(p.included) || 0);
      html += `<section class="round"><h4>${esc(I.t("vidRound", { n: r }))}${isExtra ? ` <span class="badge">${esc(I.t("vidExtraTag"))}</span>` : ""}</h4>` +
        (list.length ? `<ul class="reqs">${list.map((q) => q.id === editReq ? `<li class="req"><div class="edit">
          <input id="ed-tc" value="${esc(V.formatTimecode(q.tc))}" placeholder="00:00" aria-label="${esc(I.t("vidTc"))}" autocomplete="off">
          <input id="ed-text" value="${esc(q.text)}" maxlength="500" aria-label="${esc(I.t("vidReqText"))}" autocomplete="off">
          <input id="ed-by" value="${esc(q.by)}" maxlength="80" aria-label="${esc(I.t("vidBy"))}" autocomplete="off">
          <div class="row"><button type="button" class="primary" data-edit-save="${esc(q.id)}">${esc(I.t("save"))}</button><button type="button" data-edit-cancel>${esc(I.t("back"))}</button><span class="late" id="ed-err" role="alert"></span></div></div></li>` : `<li class="req${q.done ? " done" : ""}">
          <input type="checkbox" data-done="${esc(q.id)}" ${q.done ? "checked" : ""} aria-label="${esc(I.t("csvDone"))}">
          <span class="tc">${esc(V.formatTimecode(q.tc) || "—")}</span>
          <span class="txt">${esc(q.text)}<br><span class="muted">${esc([q.by, I.formatDate(q.date)].filter(Boolean).join(" · "))}</span></span>
          <button type="button" class="x" data-edit="${esc(q.id)}" aria-label="${esc(I.t("vidEdit"))}">✎</button>
          <button type="button" class="x" data-rm="${esc(q.id)}" aria-label="${esc(I.t("del"))}">×</button></li>`).join("")}</ul>`
          : `<p class="muted">${esc(I.t("vidNoReq"))}</p>`) + `</section>`;
    }
    $("#vid-rounds").innerHTML = html || `<p class="muted">${esc(I.t("vidNoReq"))}</p>`;

    $("#vid-dels").innerHTML = p.deliveries.length ? `<ul class="reqs">${[...p.deliveries].reverse().map((d) => `<li class="req">
      <span class="txt"><b>${esc(d.label)}</b>${d.final ? ` <span class="badge">${esc(I.t("vidFinalTag"))}</span>` : ""}<br>
      <a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.url)}</a> <span class="muted">· ${esc(I.formatDate(d.date))}</span></span>
      <button type="button" data-final="${esc(d.id)}">${esc(I.t("vidMarkFinal"))}</button>
      <button type="button" class="x" data-rmdel="${esc(d.id)}" aria-label="${esc(I.t("del"))}">×</button></li>`).join("")}</ul>`
      : `<p class="muted">${esc(I.t("vidNoDeliv"))}</p>`;

    $("#vid-appr").textContent = p.approval ? I.t("vidApprovedBy", { name: p.approval.by || "—", date: I.formatDate(p.approval.date) }) : I.t("vidNotApproved");
    $("#vid-clear-appr").hidden = !p.approval;
    $("#vid-appr-by").hidden = $("#vid-approve").hidden = !!p.approval;
    $("#vid-appr-by-label").hidden = !!p.approval;
  }

  // fields
  const field = (sel, fn) => { $(sel).addEventListener("change", (e) => change((p) => fn(p, e.target.value, e.target))); };
  field("#vid-title", (p, v) => ({ ...p, title: v.trim() }));
  field("#vid-client", (p, v) => ({ ...p, client: v.trim() }));
  field("#vid-status", (p, v) => ({ ...p, status: V.STATUSES.includes(v) ? v : p.status }));
  field("#vid-due", (p, v) => ({ ...p, due: /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "" }));
  field("#vid-included", (p, v) => ({ ...p, included: Math.min(99, Math.max(0, Math.floor(Number(v)) || 0)) }));
  field("#vid-fee", (p, v) => ({ ...p, fee: Math.max(0, Number(v) || 0) }));
  field("#vid-base", (p, v) => ({ ...p, base: Math.max(0, Number(v) || 0) }));
  field("#vid-cur", (p, v) => ({ ...p, currency: /^[A-Z]{3}$/.test(v) ? v : p.currency }));

  // revision requests
  $("#vid-reqform").onsubmit = (e) => {
    e.preventDefault();
    const err = $("#vid-req-err");
    err.textContent = "";
    const r = change((p) => V.addRequest(p, { tc: $("#vid-tc").value, text: $("#vid-text").value, by: $("#vid-by").value }, crypto.randomUUID(), today()));
    if (r?.error) { err.textContent = I.t(r.error === "tc" ? "vidBadTc" : "vidNeedText"); $(r.error === "tc" ? "#vid-tc" : "#vid-text").focus(); return; }
    $("#vid-tc").value = ""; $("#vid-text").value = ""; // keep "requested by", it is usually the same person
    $("#vid-tc").focus();
  };
  $("#vid-newround").onclick = () => change((p) => V.addRound(p));
  $("#vid-rounds").addEventListener("change", (e) => { const id = e.target.dataset.done; if (id) change((p) => V.toggleRequest(p, id)); });
  $("#vid-rounds").addEventListener("click", (e) => {
    const d = e.target.dataset;
    if (d.rm) change((p) => V.removeRequest(p, d.rm));
    if (d.edit) { editReq = d.edit; renderEditor(); $("#ed-text")?.focus(); }
    if ("editCancel" in d) { editReq = null; renderEditor(); }
    if (d.editSave) saveEdit(d.editSave);
  });
  $("#vid-rounds").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id?.startsWith("ed-")) { e.preventDefault(); saveEdit(editReq); }
    if (e.key === "Escape" && editReq) { editReq = null; renderEditor(); }
  });
  function saveEdit(id) {
    const r = change((p) => V.editRequest(p, id, { tc: $("#ed-tc").value, text: $("#ed-text").value, by: $("#ed-by").value }));
    if (r?.error) { $("#ed-err").textContent = I.t(r.error === "tc" ? "vidBadTc" : "vidNeedText"); return; }
    editReq = null;
    renderEditor();
  }

  // deliveries and approval
  $("#vid-delform").onsubmit = (e) => {
    e.preventDefault();
    const err = $("#vid-del-err");
    err.textContent = "";
    const r = change((p) => V.addDelivery(p, { label: $("#vid-dlabel").value, url: $("#vid-url").value }, crypto.randomUUID(), today()));
    if (r?.error) { err.textContent = I.t("vidBadUrl"); $("#vid-url").focus(); return; }
    $("#vid-dlabel").value = ""; $("#vid-url").value = "";
  };
  $("#vid-dels").addEventListener("click", (e) => {
    if (e.target.dataset.final) change((p) => V.markFinal(p, e.target.dataset.final));
    if (e.target.dataset.rmdel) change((p) => V.removeDelivery(p, e.target.dataset.rmdel));
  });
  $("#vid-approve").onclick = () => { change((p) => V.approve(p, $("#vid-appr-by").value, today())); $("#vid-appr-by").value = ""; };
  $("#vid-clear-appr").onclick = () => change((p) => V.clearApproval(p));

  // billing and export
  $("#vid-bill").onclick = () => {
    const p = cur();
    const { items, upTo } = V.billExtra(p, (n) => I.t("vidBillItem", { n, title: p.title || "—" }));
    if (!items.length) return toast(I.t("vidNoExtra"));
    // The invoice editor refuses (and shows the upgrade dialog) when the free invoice limit is reached.
    if (!ctx.createInvoice(items, { client: p.client, currency: p.currency, videoRef: { id: p.id, upTo } })) return;
    toast(I.t("vidBilled", { n: items.length }));
    showTab("invoices");
  };
  const fromProject = (type) => () => {
    const p = cur();
    if (ctx.createDoc(type, { client: p.client, currency: p.currency, items: V.projectItems(p) })) showTab("invoices");
  };
  $("#vid-quote").onclick = fromProject("quote");
  $("#vid-invoice").onclick = fromProject("invoice");
  $("#vid-dup").onclick = () => {
    if (!isPro() && projects.length >= V.FREE_VIDEO) return openUpgrade(I.t("vidLimit", { n: V.FREE_VIDEO }));
    const np = V.duplicate(cur(), crypto.randomUUID(), today());
    projects = [np, ...projects];
    save();
    openProject(np.id);
    $("#vid-title").focus();
  };
  $("#vid-reset-billed").onclick = () => change((p) => V.resetBilled(p));
  $("#vid-copy").onclick = async () => {
    try { await navigator.clipboard.writeText(V.toText(cur(), { roundTitle: (n) => I.t("vidRound", { n }) })); toast(I.t("vidCopied")); }
    catch { toast(I.t("vidCopyFail")); }
  };
  $("#vid-csv").onclick = () => {
    if (!isPro()) return openUpgrade(I.t("vidCsvPro"));
    const p = cur();
    const head = { round: I.t("csvRound"), tc: I.t("vidTc"), text: I.t("csvChange"), by: I.t("vidBy"), date: I.t("csvDate"), done: I.t("csvDone") };
    ctx.download(`${(p.title || "revisions").replace(/[^\w\-]+/g, "_")}.csv`, "text/csv", S.toCSV(V.toRows(p, head)));
  };

  $("#vid-print").onclick = () => {
    if (!isPro()) return openUpgrade(I.t("vidPrintPro"));
    const p = cur(), extra = V.unbilledRounds(p);
    let h = `<h2>${esc(I.t("vidRepTitle"))}: ${esc(p.title || "—")}</h2><p>${esc([p.client, I.t("st" + p.status[0].toUpperCase() + p.status.slice(1)), p.due && `${I.t("vidDue")}: ${I.formatDate(p.due)}`].filter(Boolean).join(" · "))}</p>` +
      `<p>${esc(I.t("vidRoundsLine", { used: p.rounds, inc: p.included }))}${extra ? `<br>${esc(I.t("vidExtraLine", { n: extra, each: money(p.fee, p.currency), total: money(V.extraCost(p), p.currency) }))}` : ""}</p>`;
    for (let r = 1; r <= p.rounds; r++) {
      h += `<h4>${esc(I.t("vidRound", { n: r }))}</h4><ul>${V.requestsOf(p, r).map((q) => `<li>${q.done ? "☑" : "☐"} <b>${esc(V.formatTimecode(q.tc) || "—")}</b> ${esc(q.text)} <span class="muted">${esc([q.by, I.formatDate(q.date)].filter(Boolean).join(", "))}</span></li>`).join("") || `<li>${esc(I.t("vidNoReq"))}</li>`}</ul>`;
    }
    if (p.deliveries.length) h += `<h4>${esc(I.t("vidDelivTitle"))}</h4><ul>${p.deliveries.map((d) => `<li>${esc(d.label)}${d.final ? ` (${esc(I.t("vidFinalTag"))})` : ""}: ${esc(d.url)}</li>`).join("")}</ul>`;
    h += `<p>${esc(p.approval ? I.t("vidApprovedBy", { name: p.approval.by || "—", date: I.formatDate(p.approval.date) }) : I.t("vidNotApproved"))}</p>`;
    $("#vid-report").innerHTML = h;
    $("#vid-report").classList.add("on");
    window.print();
  };
  window.addEventListener("afterprint", () => $("#vid-report").classList.remove("on"));

  function render() {
    if (curId && cur()) renderEditor(); else renderList();
  }
  return {
    render,
    exportProjects: () => projects,
    // Used by restore. The caller has already validated every project.
    // Called after an invoice that bills extra rounds is saved.
    markBilled(id, upTo) {
      const p = projects.find((x) => x.id === id);
      if (!p) return;
      projects = projects.map((x) => (x === p ? V.markBilled(p, upTo) : x));
      save();
      render();
    },
    replaceProjects(list) { if (locked) return false; projects = list; curId = null; const ok = save(); render(); return ok; },
  };
}
