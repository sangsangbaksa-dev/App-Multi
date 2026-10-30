// Run: node tests/e2e-polish.cjs  (needs playwright + a static server on :8123)
// List search and filters, duplicate, keyboard access, the upgrade dialog, and the "cannot save" warning.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const URL = "http://localhost:8123/app.html";
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const page = async (ctx) => {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    p.on("dialog", (d) => d.accept());
    return p;
  };

  const ctx = await b.newContext({ locale: "en-US", acceptDownloads: true });
  const p = await page(ctx);
  await p.goto(URL);
  const lic = "PRO-TEST-0001-ZCUY";
  await p.evaluate((k) => { localStorage.setItem("qb.license", JSON.stringify(k)); }, lic);
  await p.reload();
  const make = async (client, price, note = "") => {
    await p.click("#btn-new");
    await p.fill("[name=from]", "Me"); await p.fill("[name=client]", client);
    await p.fill("#items [data-k=desc]", `Job for ${client}`); await p.fill("#items [data-k=price]", price);
    if (note) await p.fill("[name=notes]", note);
    await p.click("button[type=submit]");
  };
  assert.ok(await p.isHidden("#filters"));
  for (const [c, pr] of [["Acme", "100"], ["Beta Co", "200"], ["Gamma", "300"]]) await make(c, pr);
  assert.ok(await p.isHidden("#filters"), "filters stay out of the way with a short list");
  await make("Delta", "400", "rush job");
  assert.ok(await p.isVisible("#filters"));
  assert.equal((await p.$$("#list .card")).length, 4);

  // search by client, by note, and by line description
  await p.fill("#q", "beta");
  assert.equal((await p.$$("#list .card")).length, 1);
  await p.fill("#q", "rush");
  assert.match(await p.textContent("#list"), /Delta/);
  await p.fill("#q", "job for gamma");
  assert.match(await p.textContent("#list"), /Gamma/);
  await p.fill("#q", "nothing like this");
  assert.ok(await p.isVisible("#nomatch"));
  assert.equal((await p.$$("#list .card")).length, 0);
  await p.fill("#q", "");
  await p.selectOption("#f", "paid");
  assert.ok(await p.isVisible("#nomatch"));
  await p.selectOption("#f", "all");
  assert.equal((await p.$$("#list .card")).length, 4);

  // cards open with the keyboard
  await p.focus("#list .card");
  await p.keyboard.press("Enter");
  assert.ok(await p.isVisible("#edit-view"));

  // duplicate keeps the content, gets a new number, starts as a draft
  const num = await p.inputValue("[name=number]");
  await p.click("#btn-dup");
  await p.waitForFunction((n) => document.querySelector("[name=number]").value !== n, num);
  assert.equal(await p.inputValue("[name=status]"), "draft");
  assert.match(await p.inputValue("#items [data-k=desc]"), /^Job for /);
  await p.click("button[type=submit]");
  assert.equal((await p.$$("#list .card")).length, 5);

  // upgrade dialog: shows what Pro covers, and no link to the placeholder checkout while it is one
  await p.evaluate(() => localStorage.removeItem("qb.license"));
  await p.reload();
  await p.click("#btn-upgrade");
  assert.equal((await p.$$("#dlg .proList li")).length, 4);
  assert.ok(await p.isHidden("#buy"));
  assert.ok(await p.isVisible("#buy-soon"));
  assert.ok(await p.isHidden("#lic-msg")); // no reason when opened from the header
  assert.equal(await p.getAttribute("#lic", "aria-label"), "License key");
  await p.keyboard.press("Escape");
  await p.click("[data-tab=docs]");
  await p.click("#doc-new"); await p.fill("#doc-title", "T"); await p.click("#doc-save");
  await p.focus("#doc-list .card");
  await p.keyboard.press("Enter");
  assert.ok(await p.isVisible("#doc-edit"));
  await p.selectOption("#lang", "ko");
  assert.equal(await p.getAttribute("#lic", "aria-label"), "라이선스 키");
  await ctx.close();

  // storage that refuses writes: a visible warning, no crash
  const c2 = await b.newContext({ locale: "en-US" });
  await c2.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException("full", "QuotaExceededError"); }; });
  const q = await page(c2);
  await q.goto(URL);
  assert.ok(await q.isVisible("#store-warn"));
  assert.match(await q.textContent("#store-warn"), /not letting QuickBill save/);
  await q.click("#btn-new");
  await q.fill("[name=from]", "Me"); await q.fill("[name=client]", "X");
  await q.click("button[type=submit]");
  assert.ok(await q.isVisible("#store-warn"));
  assert.equal((await q.$$("#list .card")).length, 1); // still usable in memory
  await q.click("[data-tab=video]");
  await q.click("#vid-new"); await q.fill("#vid-title", "P"); await q.click("#vid-text");
  await c2.close();

  assert.deepEqual(errs.filter((e) => !/QuotaExceeded|full/.test(e)), []);
  console.log("e2e polish OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
