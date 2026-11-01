import * as I from "./i18n.js";
import * as L from "./logic.js";
import { decodeShare, payloadFromHash, shareStatus, shareTotals } from "./share.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);

const parsed = decodeShare(payloadFromHash(location.hash));
// The sender's language first, then the viewer's own choice (kept in the page, never stored).
let saved = null; try { saved = localStorage.getItem("qb.lang"); } catch {}
I.setLang(parsed.ok ? parsed.inv.lang : I.detectLang(saved));

function paint() {
  I.applyI18n();
  document.title = "QuickBill";
  const err = $("#vw-err"), doc = $("#vw-doc");
  if (!parsed.ok) {
    err.textContent = I.t(parsed.reason === "newer" ? "vwNewer" : "vwBad");
    err.hidden = false;
    doc.hidden = true;
    return;
  }
  err.hidden = true;
  doc.hidden = false;
  const inv = parsed.inv, quote = L.isQuote(inv), cur = inv.currency;
  const m = (n) => L.formatMoney(n, cur, I.locale());
  const st = shareStatus(inv, today());
  const t = shareTotals(inv);
  document.title = `${I.t(quote ? "quote" : "invoice")} ${inv.number} · QuickBill`;
  const headline = {
    paid: I.t("vwPaid"), draft: I.t("vwDraft"), dueToday: I.t("vwDueToday"),
    due: I.t("vwDue", { n: st.days }), overdue: I.t("vwOverdue", { n: st.days }),
    quote: I.t("vwQuote", { n: st.days }), quoteExpired: I.t("vwQuoteExpired", { n: st.days }),
  }[st.kind];
  const open = !quote && st.balance > 0 && st.kind !== "draft";
  $("#vw-status").className = `vw-status vw-${st.kind}`;
  $("#vw-status").innerHTML = `<span class="vw-head">${esc(headline)}</span>` +
    (open ? `<span class="vw-amt">${I.t("vwAmountDue")}: <b>${m(st.kind === "overdue" ? st.payable : st.balance)}</b></span>` : "") +
    (st.kind === "overdue" && st.lateFee ? `<span class="muted">${esc(I.t("vwOverdueFee", { fee: m(st.lateFee), amt: m(st.payable) }))}</span>` : "");
  $("#vw-note").textContent = I.t("vwNote", { from: inv.from || "—" });
  const pay = $("#vw-pay");
  pay.hidden = !(open && inv.payLink);
  pay.textContent = I.t("vwPay");
  if (inv.payLink) pay.href = inv.payLink;
  $("#vw-paper").innerHTML = `<h2>${I.t(quote ? "quote" : "invoice")} ${esc(inv.number)}</h2>
    <p><b>${I.t("fromL")}:</b> ${esc(inv.from)}<br><b>${I.t("toL")}:</b> ${esc(inv.client)}<br>
    ${I.t("issuedL")} ${esc(I.formatDate(inv.issueDate))} · ${I.t(quote ? "validUntil" : "dueL")} ${esc(I.formatDate(inv.dueDate))}</p>
    <table><tr><th>${I.t("desc")}</th><th class="r">${I.t("qty")}</th><th class="r">${I.t("price")}</th><th class="r">${I.t("total")}</th></tr>
    ${inv.items.map((x) => `<tr><td>${esc(x.desc)}</td><td class="r">${x.qty}</td><td class="r">${m(x.price)}</td><td class="r">${m(x.qty * x.price)}</td></tr>`).join("")}</table>
    <p class="r">${I.t("subtotal")} ${m(t.subtotal)}<br>${t.discount ? `${I.t("discountL")} −${m(t.discount)}<br>` : ""}${I.t("taxL")} ${m(t.tax)}<br><b>${I.t("total")} ${m(t.total)}</b>${!quote && inv.paid > 0
      ? `<br>${I.t("vwPaidSoFar")} ${m(Math.min(inv.paid, t.total))}<br><b>${I.t("balance")} ${m(L.balanceOf(inv))}</b>` : ""}</p>
    <p>${esc(inv.notes).replace(/\n/g, "<br>")}</p>${inv.payinfo ? `<p><b>${I.t("payinfo").replace(/\s*[（(].*$/, "")}</b><br>${esc(inv.payinfo).replace(/\n/g, "<br>")}</p>` : ""}`;
}

I.langSelect($("#lang"), (l) => { I.setLang(l); paint(); });
$("#vw-print").onclick = () => window.print();
paint();
