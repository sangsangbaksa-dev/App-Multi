// Run: node tests/e2e-insights.cjs  (needs playwright + tests/serve.cjs on :8123)
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const URL = "http://localhost:8123/app";
(async () => {
  const { makeLicense } = await import("../logic.js");
  const key = makeLicense("AB12", "CD34");
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const inv = (n, price, paid) => ({ id: "i" + n, type: "invoice", status: "sent", number: "INV-" + n, client: "Acme", from: "Me", currency: "USD", issueDate: `${year}-01-05`, dueDate: today, items: [{ desc: "Work", qty: 1, price }], paid, taxRate: 0, discount: 0, notes: "", createdAt: n });
  const seed = (p, extra) => p.evaluate(([inv, extra]) => {
    localStorage.clear();
    localStorage.setItem("qb.invoices", JSON.stringify(inv));
    localStorage.setItem("qb.meta", JSON.stringify({ schema: 2 }));
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, JSON.stringify(v));
  }, [seed.invoices, extra]);
  seed.invoices = [inv(1, 1000, 1000), inv(2, 400, 0)];
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }).catch(() => chromium.launch());
  const errs = [];

  // Free user: expenses are locked; reminders list the unpaid invoice and copy.
  const free = await b.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  free.on("pageerror", (e) => errs.push(String(e)));
  await free.goto(URL, { waitUntil: "load" });
  await seed(free, {});
  await free.reload({ waitUntil: "load" });
  await free.click("[data-tab=insights]");
  assert.equal(await free.isVisible("#exp-locked"), true);
  assert.equal(await free.isVisible("#exp-body"), false);
  assert.equal(await free.$$eval("#rem-list article", (r) => r.length), 1);
  await free.click("#rem-list [data-rem]");
  // The copy is asynchronous, so wait for the label instead of reading it straight after the click.
  await free.waitForFunction(() => document.querySelector("#rem-list [data-rem]").textContent === "Copied", null, { timeout: 5000 });
  assert.equal(await free.textContent("#rem-list [data-rem]"), "Copied");
  await free.close();

  // Pro user: add an expense, check profit and tax estimate, then delete it.
  const pro = await b.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  pro.on("pageerror", (e) => errs.push(String(e)));
  await pro.goto(URL, { waitUntil: "load" });
  await seed(pro, { "qb.license": key });
  await pro.reload({ waitUntil: "load" });
  await pro.click("[data-tab=insights]");
  assert.equal(await pro.isVisible("#exp-body"), true);
  await pro.fill("#exp-date", `${year}-02-10`);
  await pro.fill("#exp-desc", "Laptop stand");
  await pro.fill("#exp-amount", "200");
  await pro.click("#exp-form button[type=submit]");
  assert.equal(await pro.$$eval("#exp-table tbody tr", (r) => r.length), 1);
  const sum = await pro.textContent("#exp-sum");
  assert.match(sum, /1,000\.00/);
  assert.match(sum, /200\.00/);
  assert.match(sum, /800\.00/);
  assert.match(await pro.textContent("#tax-out"), /120\.00/);
  await pro.click("#exp-table [data-exp-del]");
  assert.equal(await pro.$$eval("#exp-table tbody tr", (r) => r.length), 0);
  assert.deepEqual(errs, []);
  console.log("e2e insights OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
