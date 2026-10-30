// Run: node tests/e2e-video.cjs  (needs playwright + a static server on :8123)
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const URL = "http://localhost:8123/app.html";
const PRO = "PRO-TEST-0001-ZCUY";
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const open = async (ctx) => {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    p.on("dialog", (d) => d.accept());
    return p;
  };

  // ---- existing data from before the video module survives, and gets a copy ----
  const ctx = await b.newContext({ locale: "en-US", acceptDownloads: true });
  const old = [{ id: "i1", type: "invoice", number: "INV-0001", from: "Me", client: "Old Client", currency: "USD", issueDate: "2026-01-01", dueDate: "2026-01-15", taxRate: 0, discount: 0, paid: 0, status: "sent", notes: "", payinfo: "", recur: "", nextRun: "", items: [{ desc: "Legacy", qty: 1, price: 50 }], lateFeePct: 0 }];
  await ctx.addInitScript((inv) => { if (!localStorage.getItem("qb.invoices") && !sessionStorage.getItem("seeded")) { localStorage.setItem("qb.invoices", JSON.stringify(inv)); sessionStorage.setItem("seeded", "1"); } }, old);
  let p = await open(ctx);
  await p.goto(URL);
  assert.equal((await p.$$(".card")).length, 1);
  assert.match(await p.textContent("#list"), /Old Client/);
  assert.equal(await p.evaluate(() => localStorage.getItem("qb.invoices.bak-v1")), JSON.stringify(old));
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem("qb.meta")).schema), 2);

  // ---- empty state, then a project ----
  await p.click("[data-tab=video]");
  assert.ok(await p.isVisible("#vid-empty"));
  await p.click("#vid-new");
  assert.ok(await p.isVisible("#vid-edit"));
  await p.click("#vid-back"); // never filled in: dropped
  assert.equal((await p.$$("#vid-list .card")).length, 0);
  await p.click("#vid-new");
  await p.fill("#vid-title", "Promo"); await p.fill("#vid-client", "Acme");
  await p.fill("#vid-included", "1"); await p.fill("#vid-fee", "80");
  await p.selectOption("#vid-cur", "USD");
  await p.fill("#vid-due", "2020-01-01");
  await p.click("#vid-title"); // blur the last field so it commits

  // validation
  await p.fill("#vid-tc", "9:99"); await p.fill("#vid-text", "x"); await p.click("#vid-reqform button");
  assert.match(await p.textContent("#vid-req-err"), /mm:ss/);
  await p.fill("#vid-tc", "0:30"); await p.fill("#vid-text", "   "); await p.click("#vid-reqform button");
  assert.match(await p.textContent("#vid-req-err"), /Describe/);
  assert.equal(await p.$$eval(".req", (e) => e.length), 0);

  const addReq = async (tc, text, by = "Mina") => { await p.fill("#vid-tc", tc); await p.fill("#vid-text", text); await p.fill("#vid-by", by); await p.click("#vid-reqform button"); };
  await addReq("2:00", "Cut the intro");
  await addReq("0:10", "Louder music");
  await p.waitForFunction(() => document.querySelectorAll(".req").length === 2);
  assert.deepEqual(await p.$$eval(".req .tc", (e) => e.map((x) => x.textContent)), ["00:10", "02:00"]);
  assert.equal(await p.inputValue("#vid-status"), "revising");
  assert.match(await p.textContent("#vid-money"), /Rounds used: 1 of 1/);
  assert.match(await p.textContent("#vid-money"), /No extra rounds/);
  assert.ok(await p.isDisabled("#vid-bill"));

  await p.click("[data-done]"); // first listed request done
  assert.ok(await p.isChecked("[data-done]"));
  await p.click("#vid-newround");
  await addReq("0:05", "Fix the logo colour");
  assert.match(await p.textContent("#vid-money"), /1 extra × \$80\.00 = \$80\.00/);

  // deliveries: only web links
  await p.fill("#vid-url", "javascript:alert(1)"); await p.click("#vid-delform button");
  assert.match(await p.textContent("#vid-del-err") , /http/);
  await p.fill("#vid-dlabel", "v2"); await p.fill("#vid-url", "https://example.com/f/abc"); await p.click("#vid-delform button");
  assert.equal(await p.getAttribute("#vid-dels a", "rel"), "noopener noreferrer");
  assert.equal(await p.inputValue("#vid-status"), "review");
  await p.click("[data-final]");
  assert.match(await p.textContent("#vid-dels"), /Final/);

  // approval
  await p.fill("#vid-appr-by", "Mina"); await p.click("#vid-approve");
  assert.match(await p.textContent("#vid-appr"), /Approved by Mina/);
  assert.equal(await p.inputValue("#vid-status"), "approved");

  // billing: abandoning the invoice leaves the round unbilled, saving it marks it billed
  await p.click("#vid-bill");
  await p.waitForSelector("#edit-view:not([hidden])");
  await p.click("#btn-back");
  await p.click("[data-tab=video]");
  assert.match(await p.textContent("#vid-money"), /1 extra/);
  await p.click("#vid-bill");
  await p.waitForSelector("#edit-view:not([hidden])");
  assert.equal(await p.inputValue("[name=client]"), "Acme");
  assert.equal(await p.inputValue("#items [data-k=desc]"), "Extra revision round 2 (Promo)");
  assert.equal(await p.inputValue("#items [data-k=price]"), "80");
  await p.fill("[name=from]", "Me");
  await p.click("button[type=submit]");
  await p.click("[data-tab=video]");
  assert.ok(await p.isVisible("#vid-edit")); // the project stays open behind the invoice
  assert.match(await p.textContent("#vid-money"), /No extra rounds/);
  assert.match(await p.textContent("#vid-money"), /already billed: 1/);

  // project price becomes a quote line
  await p.fill("#vid-base", "1200"); await p.click("#vid-title");
  await p.click("#vid-quote");
  await p.waitForSelector("#edit-view:not([hidden])");
  assert.equal(await p.inputValue("[name=client]"), "Acme");
  assert.equal(await p.inputValue("#items [data-k=desc]"), "Promo");
  assert.equal(await p.inputValue("#items [data-k=price]"), "1200");
  await p.click("#btn-back");
  await p.click("[data-tab=video]");

  // edit a request in place, with validation
  await p.click("[data-edit]");
  await p.fill("#ed-tc", "nope"); await p.click("[data-edit-save]");
  assert.match(await p.textContent("#ed-err"), /mm:ss/);
  await p.fill("#ed-tc", "0:15"); await p.fill("#ed-text", "Music a bit lower"); await p.press("#ed-text", "Enter");
  await p.waitForFunction(() => !document.querySelector("#ed-text"));
  assert.match(await p.textContent("#vid-rounds"), /Music a bit lower|Cut the intro/);

  // print report is Pro; with the print call stubbed we can read what would be printed
  await p.click("#vid-print");
  assert.ok(await p.isVisible("#dlg"));
  await p.keyboard.press("Escape");

  // copy list works or fails politely (clipboard permission is not granted here)
  await p.click("#vid-copy");
  await p.waitForFunction(() => /Copied|Copy failed/.test(document.querySelector("#toast").textContent));

  // free limits: a second project and the CSV export ask for Pro
  await p.click("#vid-csv");
  assert.ok(await p.isVisible("#dlg"));
  await p.keyboard.press("Escape");
  await p.click("#vid-back");
  await p.click("#vid-new");
  assert.ok(await p.isVisible("#dlg"));
  assert.match(await p.textContent("#lic-msg"), /1 video project/);
  await p.fill("#lic", PRO); await p.click("#dlg button[value=ok]");
  await p.waitForFunction(() => document.querySelector("#plan").textContent === "Pro");

  await p.click("#vid-list .card");
  await p.evaluate(() => { window.print = () => { window.__printed = document.querySelector("#vid-report").innerText; }; });
  await p.click("#vid-print");
  const rep = await p.evaluate(() => window.__printed);
  assert.match(rep, /Revision report: Promo/);
  assert.match(rep, /Round 2/);
  assert.match(rep, /Approved by Mina/);
  await p.click("#vid-dup");
  assert.equal(await p.inputValue("#vid-title"), "Promo");
  assert.equal(await p.inputValue("#vid-fee"), "80");
  assert.equal(await p.$$eval(".req", (e) => e.length), 0);
  await p.fill("#vid-title", "Promo 2"); await p.click("#vid-client");
  await p.click("#vid-back");
  assert.match(await p.textContent("#vid-summary"), /1 active/);

  // persistence across reload, and one previous generation kept
  await p.reload();
  await p.click("[data-tab=video]");
  assert.match(await p.textContent("#vid-list"), /Promo/);
  assert.match(await p.textContent("#vid-list .card:last-child"), /Approved/); // finished work sinks to the bottom
  assert.doesNotMatch(await p.textContent("#vid-list .card:last-child"), /past due/); // approved work is never late
  await p.click("#vid-list .card:last-child");
  await p.click("#vid-clear-appr");
  await p.click("#vid-back");
  assert.match(await p.textContent("#vid-list .card:first-child"), /past due/);
  assert.ok(await p.evaluate(() => localStorage.getItem("qb.video.bak") !== null));

  // Pro: CSV, with formulas neutralised
  await p.click("#vid-list .card");
  await p.fill("#vid-tc", ""); await p.fill("#vid-text", "=SUM(1,2)"); await p.fill("#vid-by", "Mina"); await p.click("#vid-reqform button");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#vid-csv")]);
  const csv = fs.readFileSync(await dl.path(), "utf8");
  assert.match(csv, /Round,Timecode,Change,Requested by,Requested on,Done/);
  assert.match(csv, /Louder music/);
  assert.match(csv, /'=SUM\(1,2\)/);
  await p.click("#vid-back");
  await p.click("#vid-new"); await p.fill("#vid-title", "Second"); await p.click("#vid-back");
  assert.equal((await p.$$("#vid-list .card")).length, 3);

  // backup holds video; restoring an old backup (no video key) leaves the projects alone
  const [bk] = await Promise.all([p.waitForEvent("download"), (async () => { await p.click("[data-tab=invoices]"); await p.click("#btn-backup"); })()]);
  const backup = JSON.parse(fs.readFileSync(await bk.path(), "utf8"));
  assert.equal(backup.v, 2);
  assert.equal(backup.video.length, 3);
  await p.setInputFiles("#file-restore", { name: "old.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "quickbill", v: 1, invoices: old })) });
  await p.waitForFunction(() => /Restored/i.test(document.querySelector("#toast").textContent));
  await p.click("[data-tab=video]");
  assert.equal((await p.$$("#vid-list .card")).length, 3);
  // a broken video section is refused before anything changes
  await p.click("[data-tab=invoices]");
  await p.setInputFiles("#file-restore", { name: "bad.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "quickbill", v: 2, invoices: old, video: [{ id: 1 }] })) });
  await p.waitForFunction(() => /not a valid|invalid|couldn/i.test(document.querySelector("#toast").textContent));
  await p.click("[data-tab=video]");
  assert.equal((await p.$$("#vid-list .card")).length, 3);
  // full restore with video
  await p.click("[data-tab=invoices]");
  await p.setInputFiles("#file-restore", { name: "full.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ ...backup, video: [backup.video[0]] })) });
  await p.waitForFunction(() => /Restored/i.test(document.querySelector("#toast").textContent));
  await p.click("[data-tab=video]");
  assert.equal((await p.$$("#vid-list .card")).length, 1);

  // other languages render the tab
  await p.selectOption("#lang", "ko");
  assert.match(await p.textContent("[data-tab=video]"), /영상/);
  assert.match(await p.textContent("#vid-new"), /새 영상 프로젝트/);
  await p.selectOption("#lang", "en");

  // newer data is read-only
  const c2 = await b.newContext({ locale: "en-US" });
  await c2.addInitScript(() => { localStorage.setItem("qb.video", JSON.stringify({ v: 9, projects: [] })); });
  const q = await open(c2);
  await q.goto(URL);
  await q.click("[data-tab=video]");
  assert.ok(await q.isVisible("#vid-lock"));
  assert.ok(await q.isDisabled("#vid-new"));
  assert.equal(await q.evaluate(() => localStorage.getItem("qb.video")), JSON.stringify({ v: 9, projects: [] }));

  // mobile: no sideways scrolling, even with a long unbroken link
  const c3 = await b.newContext({ viewport: { width: 375, height: 800 }, locale: "en-US" });
  const m = await open(c3);
  await m.goto(URL);
  await m.click("[data-tab=video]");
  await m.click("#vid-new");
  await m.fill("#vid-title", "Mobile"); await m.click("#vid-text");
  await m.fill("#vid-text", "x".repeat(200)); await m.fill("#vid-tc", "1:00"); await m.click("#vid-reqform button");
  await m.fill("#vid-url", "https://example.com/" + "a".repeat(150)); await m.click("#vid-delform button");
  const over = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 1, `horizontal overflow ${over}px`);
  await m.screenshot({ path: "/tmp/vid-mobile.png", fullPage: true });

  // service worker: an older version's cache is removed when the new one activates, and files load offline
  const c4 = await b.newContext({ locale: "en-US" });
  await c4.addInitScript(() => { caches.open("quickbill-v1").then((c) => c.put("/old.txt", new Response("old"))); });
  const s = await open(c4);
  await s.goto(URL);
  await s.evaluate(() => navigator.serviceWorker.ready);
  await s.waitForFunction(async () => (await caches.keys()).length === 1 && (await caches.keys())[0] !== "quickbill-v1");
  await c4.setOffline(true);
  await s.reload();
  await s.click("[data-tab=video]");
  assert.ok(await s.isVisible("#vid-new"));

  assert.deepEqual(errs, []);
  console.log("e2e video OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
