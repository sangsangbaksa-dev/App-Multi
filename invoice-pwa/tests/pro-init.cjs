// Test helper: QuickBill is paid-only, so browser tests that drive the app start with a Pro key in place.
// Only app pages get it; the landing and legal pages are unaffected. Apply to a page or a context before goto.
const KEY = "PRO-TEST-0001-ZCUY";
module.exports = (target) => target.addInitScript((key) => {
  if (!/\/app(\.html)?$/.test(location.pathname)) return;
  try { if (!localStorage.getItem("qb.license")) localStorage.setItem("qb.license", JSON.stringify(key)); } catch {}
}, KEY);
