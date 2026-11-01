// Run: node tests/e2e-license.cjs
// Starts its own server on :8124 with the license function switched on and Gumroad mocked, then checks the
// whole key flow in a browser: server-checked keys unlock Pro, offline-format keys are refused, a refunded key
// switches Pro off after the weekly re-check while the data stays, and a network failure never removes Pro.
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const path = require("node:path");
const BASE = "http://localhost:8124";

(async () => {
  const srv = spawn("node", [path.join(__dirname, "serve.cjs"), "8124"], { env: { ...process.env, QB_MOCK_LS: "1", GUMROAD_PRODUCT_ID: "prod-1" }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const b = await chromium.launch();
  const errs = [];
  try {
    const ctx = await b.newContext({ locale: "en-US", serviceWorkers: "block" });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    await p.goto(BASE + "/app.html");
    await p.waitForFunction(() => localStorage.getItem("qb.srvmode") === "true");

    const tryKey = async (k) => {
      await p.click("#btn-upgrade");
      await p.fill("#lic", k); await p.click("#dlg button[value=ok]");
    };
    // the offline test key no longer works once the server is on
    await tryKey("PRO-TEST-0001-ZCUY");
    await p.waitForFunction(() => /Invalid/.test(document.querySelector("#lic-msg").textContent));
    assert.equal(await p.locator("#plan").textContent(), "Free 0/3");
    await p.click("#dlg button[value=cancel]");

    await tryKey("REVOKED-key-001");
    await p.waitForFunction(() => /refunded|disabled/.test(document.querySelector("#lic-msg").textContent));
    await p.click("#dlg button[value=cancel]");
    await tryKey("OTHER-product-01");
    await p.waitForFunction(() => /not for QuickBill/.test(document.querySelector("#lic-msg").textContent));
    await p.click("#dlg button[value=cancel]");

    await tryKey("good-key-0001");
    await p.waitForFunction(() => document.querySelector("#plan").textContent === "Pro");
    const rec = await p.evaluate(() => JSON.parse(localStorage.getItem("qb.licsrv")));
    assert.equal(rec.key, "good-key-0001"); assert.ok(rec.instance);

    // survives a reload without asking again
    await p.reload();
    assert.equal(await p.locator("#plan").textContent(), "Pro");

    // the weekly re-check: server unreachable keeps Pro
    await p.evaluate(() => { const r = JSON.parse(localStorage.getItem("qb.licsrv")); r.checkedAt = 1; localStorage.setItem("qb.licsrv", JSON.stringify(r)); });
    await p.route("**/api/license", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
    await p.reload();
    await p.waitForTimeout(500);
    assert.equal(await p.locator("#plan").textContent(), "Pro");
    await p.unroute("**/api/license");

    // a refunded key: Pro goes off, an invoice made while Pro is still there
    await p.click("#btn-new");
    await p.fill("[name=from]", "Me"); await p.fill("[name=client]", "Acme");
    await p.fill("#items [data-k=desc]", "Work"); await p.fill("#items [data-k=price]", "50");
    await p.click("button[type=submit]");
    await p.evaluate(() => {
      localStorage.setItem("qb.license", JSON.stringify("REVOKED-key-001"));
      localStorage.setItem("qb.licsrv", JSON.stringify({ key: "REVOKED-key-001", instance: "11111111-2222-3333-4444-555555555555", checkedAt: 1 }));
    });
    await p.reload();
    await p.waitForFunction(() => document.querySelector("#plan").textContent.startsWith("Free"));
    assert.ok(/Pro is off/.test(await p.locator("#toast").textContent()));
    assert.equal(await p.locator("#list .card").count(), 1, "data stays after the license is revoked");
    assert.equal(await p.evaluate(() => localStorage.getItem("qb.licsrv")), null);
    await ctx.close();

    // not configured (the normal pre-launch state, served on :8123): offline keys keep working
    const ctx2 = await b.newContext({ locale: "en-US", serviceWorkers: "block" });
    const q = await ctx2.newPage();
    q.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    await q.route("**/api/license", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"configured":false}' }));
    await q.goto(BASE + "/app.html");
    await q.click("#btn-upgrade");
    await q.fill("#lic", "PRO-TEST-0001-ZCUY"); await q.click("#dlg button[value=ok]");
    await q.waitForFunction(() => document.querySelector("#plan").textContent === "Pro");
    await ctx2.close();
  } finally {
    await b.close();
    srv.kill();
  }
  assert.deepEqual(errs.filter((e) => !/net::ERR_FAILED/.test(e)), []);
  console.log("e2e license OK");
})().catch((e) => { console.error(e); process.exit(1); });
