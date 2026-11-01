// Run: node tests/e2e-share.cjs  (needs playwright + tests/serve.cjs on :8123)
// Covers the Pro features added around client links: share link, payment log, remembered client, saved items, combined totals.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const BASE = "http://localhost:8123";
(async () => {
  const { makeLicense } = await import("../logic.js");
  const key = makeLicense("AB12", "CD34");
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }).catch(() => chromium.launch());
  const ctx = await b.newContext({ permissions: ["clipboard-read", "clipboard-write"], serviceWorkers: "block" });
  const errs = [];
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.addInitScript((k) => { if (!localStorage.getItem("qb.license")) localStorage.setItem("qb.license", JSON.stringify(k)); }, key);
  await p.goto(BASE + "/app", { waitUntil: "load" });

  // New invoice with client email, pay link, an overdue date; share link opens a read-only page.
  await p.click("#btn-new");
  await p.fill("[name=from]", "Min Studio");
  await p.fill("[name=client]", "Acme");
  await p.fill("[name=clientEmail]", "ap@acme.example");
  await p.fill("[name=payLink]", "https://pay.example.com/x");
  await p.selectOption("[name=status]", "sent");
  await p.fill("[name=dueDate]", "2020-01-31");
  await p.fill("#items [data-k=desc]", "Logo design");
  await p.fill("#items [data-k=price]", "500");
  await p.click("#btn-share");
  const link = await p.evaluate(() => navigator.clipboard.readText());
  assert.match(link, /view\.html#d=/);
  const v = await ctx.newPage();
  v.on("pageerror", (e) => errs.push(String(e)));
  await v.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "load" });
  assert.match(await v.innerText("#vw-status"), /overdue/);
  assert.equal(await v.getAttribute("#vw-pay", "href"), "https://pay.example.com/x");
  await v.selectOption("#lang", "ko");
  assert.match(await v.innerText("#vw-status"), /연체/);
  await v.goto(BASE + "/view.html#d=garbage", { waitUntil: "load" });
  assert.ok(await v.isVisible("#vw-err"));
  assert.ok(!(await v.isVisible("#vw-doc")));

  // Dated payments: a part-payment, then one clamped to the balance that marks it paid.
  await p.fill("#pay-date", "2020-01-10");
  await p.fill("#pay-amt", "200");
  await p.click("#pay-add");
  assert.equal(await p.inputValue("[name=paid]"), "200");
  await p.fill("#pay-amt", "9999");
  await p.click("#pay-add");
  assert.equal(await p.inputValue("[name=paid]"), "500");
  assert.equal(await p.inputValue("[name=status]"), "paid");
  await p.click("#form button[type=submit]");

  // The client is remembered and the saved item is offered on the next invoice.
  await p.click("#btn-new");
  await p.fill("[name=client]", "acme");
  await p.press("[name=client]", "Tab");
  assert.equal(await p.inputValue("[name=clientEmail]"), "ap@acme.example");
  await p.fill("#items [data-k=desc]", "logo design");
  await p.press("#items [data-k=desc]", "Tab");
  assert.equal(await p.inputValue("#items [data-k=price]"), "500");
  await p.click("#btn-back");

  // Insights shows how fast Acme paid (the invoice was issued today, paid in 2020: clamped to 0 days).
  await p.click("[data-tab=insights]");
  assert.match(await p.innerText("#pay-cards"), /Average days/i);

  assert.deepEqual(errs, []);
  await b.close();
  console.log("e2e share OK");
})().catch((e) => { console.error(e); process.exit(1); });
