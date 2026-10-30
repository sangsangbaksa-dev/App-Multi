// Run: node tests/e2e.cjs  (needs playwright + a static server on :8123)
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ locale: "en-US", acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  p.on("dialog", (d) => d.accept());

  // landing page: localized + links to app
  await p.goto("http://localhost:8123/index.html");
  assert.match(await p.textContent("h2"), /stay on your own computer/);
  await p.selectOption("#lang", "ja");
  assert.match(await p.textContent("h2"), /自分のパソコン/);
  assert.equal(await p.getAttribute("html", "lang"), "ja");
  await p.selectOption("#lang", "en");

  await p.goto("http://localhost:8123/app.html");
  const make = async (client, price = "100") => {
    await p.click("#btn-new");
    await p.fill("[name=from]", "Me"); await p.fill("[name=client]", client);
    await p.fill("#items [data-k=desc]", "Work"); await p.fill("#items [data-k=price]", price);
    await p.fill("[name=taxRate]", "10");
    assert.match(await p.textContent("#preview"), /110\.00/);
    await p.click("button[type=submit]");
  };
  for (const c of ["A", "B", "C"]) await make(c);
  assert.equal((await p.$$(".card")).length, 3);
  await p.click("#btn-new");
  assert.ok(await p.isVisible("#dlg"), "paywall should open at limit");
  await p.fill("#lic", "PRO-NOPE-0000-0000"); await p.click("#dlg button[value=ok]");
  await p.waitForFunction(() => /Invalid/.test(document.querySelector("#lic-msg").textContent));
  await p.fill("#lic", "PRO-TEST-0001-ZCUY"); await p.click("#dlg button[value=ok]");
  await p.waitForFunction(() => document.querySelector("#plan").textContent === "Pro");

  // language switch -> Korean UI, KRW formatting, localized date
  await p.selectOption("#lang", "ko");
  assert.match(await p.textContent("#btn-new"), /새 인보이스/);
  await p.click("#btn-new");
  assert.equal(await p.inputValue("[name=currency]"), "USD"); // follows last invoice
  await p.selectOption("[name=currency]", "KRW");
  await p.fill("[name=from]", "나"); await p.fill("[name=client]", "고객D");
  await p.fill("#items [data-k=price]", "50000");
  assert.match(await p.textContent("#preview"), /₩50,000/);
  assert.match(await p.textContent("#preview"), /합계/);

  // recurring: issue date in the past => drafts are generated on save
  const d = new Date(Date.now() - 70 * 864e5).toISOString().slice(0, 10);
  await p.fill("[name=issueDate]", d); await p.fill("[name=dueDate]", d);
  await p.selectOption("[name=recur]", "monthly");
  // logo upload (Pro)
  await p.setInputFiles("#logo-file", { name: "l.png", mimeType: "image/png", buffer: PNG });
  await p.waitForSelector("#preview img.logo");
  await p.click("button[type=submit]");
  const n = (await p.$$(".card")).length;
  assert.ok(n >= 3 + 1 + 2, "recurring should create >=2 drafts, got " + n);
  assert.ok(await p.isVisible("#toast"));

  // backup round trip
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#btn-backup")]);
  const path = await dl.path();
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  assert.equal(data.app, "quickbill"); assert.equal(data.invoices.length, n);
  await p.reload();
  assert.equal((await p.$$(".card")).length, n); // persisted, no duplicate regeneration
  await p.setInputFiles("#file-restore", { name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"app":"x"}') });
  await p.waitForFunction(() => /올바른 백업/.test(document.querySelector("#toast").textContent));
  await p.setInputFiles("#file-restore", { name: "ok.json", mimeType: "application/json", buffer: fs.readFileSync(path) });
  await p.waitForFunction((n) => document.querySelector("#toast").textContent.includes(String(n)), n);

  // ageing + tracked-time billing (Pro)
  await p.evaluate(() => {
    const inv = JSON.parse(localStorage.getItem("qb.invoices"));
    inv.push({ id: "old1", type: "invoice", number: "INV-0099", from: "Me", client: "Old", currency: "USD", status: "sent", paid: 0,
      issueDate: "2020-01-01", dueDate: "2020-01-15", taxRate: 0, discount: 0, items: [{ desc: "x", qty: 1, price: 70 }] });
    localStorage.setItem("qb.invoices", JSON.stringify(inv));
    localStorage.setItem("qb.time", JSON.stringify([{ id: "t1", client: "Old", desc: "Consulting", secs: 5400, billed: false }]));
    localStorage.setItem("qb.rate", "80");
  });
  await p.reload();
  assert.match(await p.textContent("#ageing"), /70/);
  await p.click("#time summary");
  await p.click("[data-bill=Old]");
  await p.waitForFunction(() => /Consulting/.test(document.querySelector("#preview").textContent));
  assert.match(await p.textContent("#preview"), /Consulting1\.5.80.120/); // 1.5 h at 80
  await p.click("button[type=submit]");
  assert.match(await p.textContent("#t-list"), /기록된 시간이 없습니다/); // entry is marked billed

  // free user: recurring is gated
  const ctx2 = await b.newContext({ locale: "es-ES" });
  const q = await ctx2.newPage();
  await q.goto("http://localhost:8123/app.html");
  assert.match(await q.textContent("#btn-new"), /Nueva factura/);
  await q.click("#btn-new");
  assert.equal(await q.inputValue("[name=currency]"), "EUR");
  await q.fill("[name=from]", "Yo"); await q.fill("[name=client]", "X"); await q.fill("#items [data-k=price]", "5");
  await q.selectOption("[name=recur]", "weekly");
  await q.click("button[type=submit]");
  assert.ok(await q.isVisible("#dlg"), "recurring paywall");

  // quote -> invoice, partial payment, dashboard
  const ctx3 = await b.newContext({ locale: "en-US" });
  const r = await ctx3.newPage();
  r.on("pageerror", (e) => errs.push(e.message));
  r.on("dialog", (d) => d.accept());
  await r.goto("http://localhost:8123/app.html");
  await r.click("#btn-new-quote");
  assert.equal(await r.inputValue("[name=number]"), "QUO-0001");
  assert.equal(await r.isVisible("#paid-wrap"), false);
  assert.equal(await r.isVisible("#btn-convert"), false); // not saved yet
  await r.fill("[name=from]", "Me"); await r.fill("[name=client]", "Acme");
  await r.fill("#items [data-k=desc]", "Site"); await r.fill("#items [data-k=price]", "1000");
  assert.match(await r.textContent("#preview"), /Quote QUO-0001/);
  await r.click("button[type=submit]");
  assert.equal((await r.$$("#dash .pc")).length, 0, "quotes are not receivables");
  await r.click(".card");
  await r.click("#btn-convert");
  await r.waitForFunction(() => document.querySelector("[name=number]").value === "INV-0001");
  assert.match(await r.textContent("#preview"), /From quote QUO-0001/);
  await r.selectOption("[name=status]", "sent");
  await r.fill("[name=paid]", "400");
  assert.match(await r.textContent("#preview"), /Balance due\s*\$600\.00/);
  await r.fill("[name=payinfo]", "IBAN 123");
  assert.match(await r.textContent("#preview"), /IBAN 123/);
  await r.click("button[type=submit]");
  assert.match(await r.textContent("#dash"), /Outstanding:\s*\$600\.00/);
  assert.match(await r.textContent("#dash"), /Collected:\s*\$400\.00/);
  assert.match(await r.textContent("#list"), /accepted/);
  assert.match(await r.textContent("#clientsum"), /Pro feature/);
  await r.click(".card >> nth=0");
  await r.fill("[name=paid]", "1000"); // fully paid -> auto status paid
  await r.click("button[type=submit]");
  assert.match(await r.textContent("#list"), /paid/);
  assert.match(await r.textContent("#dash"), /Outstanding:\s*\$0\.00/);

  // late fee + reminder + timer paywall (free plan)
  await r.click("#btn-new");
  await r.fill("[name=from]", "Me"); await r.fill("[name=client]", "Slow Payer");
  await r.fill("#items [data-k=price]", "100");
  await r.selectOption("[name=status]", "sent");
  await r.fill("[name=issueDate]", "2020-01-01"); await r.fill("[name=dueDate]", "2020-01-15");
  await r.fill("[name=lateFeePct]", "2");
  await r.click("#btn-latefee"); await r.click("#btn-latefee"); // second click must not stack
  assert.equal((await r.$$("#items .item")).length, 2);
  assert.match(await r.textContent("#preview"), /Late fee/);
  await r.click("#btn-remind");
  await r.click("button[type=submit]");
  assert.match(await r.textContent("#list"), /overdue/);
  await r.evaluate(() => localStorage.setItem("qb.time", JSON.stringify([{ id: "t", client: "Z", desc: "d", secs: 3600, billed: false }])));
  await r.reload();
  await r.click("#time summary");
  await r.click("[data-bill=Z]");
  assert.ok(await r.isVisible("#dlg"), "time billing paywall");

  assert.deepEqual(errs, []);
  console.log("e2e OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
