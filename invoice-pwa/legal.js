// Shared by the terms and privacy pages: fills in the values from config.js and picks English or Korean.
import { CONFIG, emailLive } from "./config.js";

const q = (s) => [...document.querySelectorAll(s)];
let saved = null; try { saved = localStorage.getItem("qb.lang"); } catch {}
const nav = (navigator.languages || [navigator.language] || []).map((l) => String(l).slice(0, 2).toLowerCase());
let lang = (saved || nav[0] || "en") === "ko" ? "ko" : "en";

const mail = emailLive() ? `<a href="mailto:${CONFIG.supportEmail}">${CONFIG.supportEmail}</a>` : "[support email]";
q("[data-email]").forEach((el) => (el.innerHTML = mail));
q("[data-refund]").forEach((el) => (el.textContent = CONFIG.refundDays));
q("[data-price]").forEach((el) => (el.textContent = CONFIG.price));

function show() {
  q("[data-l]").forEach((el) => (el.hidden = el.dataset.l !== lang));
  document.documentElement.lang = lang;
  const sw = document.getElementById("swlang");
  sw.textContent = lang === "ko" ? "English" : "한국어";
  document.title = document.querySelector(`[data-l="${lang}"] h1`).textContent + " – QuickBill";
}
document.getElementById("swlang").onclick = () => { lang = lang === "ko" ? "en" : "ko"; show(); };
show();
