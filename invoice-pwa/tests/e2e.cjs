// Run: node tests/e2e.cjs  (needs playwright + a static server on :8123)
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto("http://localhost:8123/index.html");
  const make = async (client) => {
    await p.click("#btn-new");
    await p.fill('[name=from]', "Me"); await p.fill('[name=client]', client);
    await p.fill('#items [data-k=desc]', "Work"); await p.fill('#items [data-k=price]', "100");
    await p.fill('[name=taxRate]', "10");
    assert.match(await p.textContent("#preview"), /110\.00/);
    await p.click('button[type=submit]');
  };
  for (const c of ["A", "B", "C"]) await make(c);
  assert.equal((await p.$$(".card")).length, 3);
  await p.click("#btn-new");
  assert.ok(await p.isVisible("#dlg"), "paywall should open at limit");
  await p.fill("#lic", "PRO-TEST-0001-ZCUY"); await p.click('#dlg button[value=ok]');
  assert.equal(await p.textContent("#plan"), "Pro");
  await make("D");
  assert.equal((await p.$$(".card")).length, 4);
  await p.reload(); assert.equal((await p.$$(".card")).length, 4); // persisted
  assert.deepEqual(errs, []);
  console.log("e2e OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
