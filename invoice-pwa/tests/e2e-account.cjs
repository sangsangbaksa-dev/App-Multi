// Run: node tests/e2e-account.cjs  (needs playwright + tests/serve.cjs on :8123)
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const URL = "http://localhost:8123/app";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(URL, { waitUntil: "load" });
  await p.evaluate(() => { localStorage.clear(); });
  await p.reload({ waitUntil: "load" });
  assert.equal(await p.textContent("#btn-account"), "Log in");
  await p.click("#btn-account");
  await p.click("#acct-switch"); // to sign-up
  await p.fill("#acct-email", "tester@example.com");
  await p.fill("#acct-pass", "short");
  await p.click("#acct-submit");
  assert.match(await p.textContent("#acct-msg"), /8 characters/);
  await p.fill("#acct-pass", "longenough1");
  await p.click("#acct-submit");
  await p.waitForFunction(() => document.querySelector("#btn-account").textContent === "tester@example.com");
  await p.click("#btn-account");
  assert.equal(await p.isVisible("#acct-out"), true);
  await p.click("#acct-signout");
  assert.equal(await p.textContent("#btn-account"), "Log in");
  await p.click("#acct-close");
  await p.click("#btn-account");
  await p.click("#acct-switch"); // back to sign-in
  await p.fill("#acct-email", "tester@example.com");
  await p.fill("#acct-pass", "wrongpass1");
  await p.click("#acct-submit");
  assert.match(await p.textContent("#acct-msg"), /not right/);
  await p.fill("#acct-pass", "longenough1");
  await p.click("#acct-submit");
  await p.waitForFunction(() => document.querySelector("#btn-account").textContent === "tester@example.com");
  await p.reload({ waitUntil: "load" });
  assert.equal(await p.textContent("#btn-account"), "tester@example.com");
  assert.deepEqual(errs, []);
  console.log("e2e account OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
