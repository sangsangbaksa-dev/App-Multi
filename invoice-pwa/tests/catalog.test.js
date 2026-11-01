import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../catalog.js";

test("learn keeps the latest price and counts uses, case-insensitively", () => {
  let c = C.learnItems({}, [{ desc: "Logo design", price: 300 }, { desc: " hosting ", price: 10 }]);
  c = C.learnItems(c, [{ desc: "logo   design", price: 350 }]);
  assert.deepEqual(c["logo design"], { desc: "logo design", price: 350, uses: 2 });
  assert.equal(C.priceFor(c, "LOGO DESIGN"), 350);
  assert.equal(C.priceFor(c, "nothing"), null);
});
test("empty, free, invalid and late-fee lines are ignored", () => {
  const c = C.learnItems({}, [{ desc: "", price: 5 }, { desc: "free", price: 0 }, { desc: "bad", price: "x" }, { desc: "Late fee", price: 9, lateFee: true }]);
  assert.deepEqual(c, {});
});
test("suggestions are most used first, then alphabetical, and limited", () => {
  let c = C.learnItems({}, [{ desc: "b", price: 1 }, { desc: "a", price: 1 }, { desc: "c", price: 1 }]);
  c = C.learnItems(c, [{ desc: "c", price: 1 }]);
  assert.deepEqual(C.suggestions(c).map((x) => x.desc), ["c", "a", "b"]);
  assert.equal(C.suggestions(c, 2).length, 2);
});
test("the catalog is capped by dropping the least used", () => {
  let c = {};
  for (let i = 0; i < C.MAX_ITEMS + 20; i++) c = C.learnItems(c, [{ desc: "item " + i, price: 1 }]);
  c = C.learnItems(c, [{ desc: "item 5", price: 2 }]); // used twice: survives
  c = C.learnItems(c, [{ desc: "fresh", price: 1 }]);
  assert.ok(Object.keys(c).length <= C.MAX_ITEMS);
  assert.ok(c["item 5"]);
});
test("forgetItem and cleanCatalog", () => {
  const c = C.learnItems({}, [{ desc: "x", price: 3 }]);
  assert.deepEqual(C.forgetItem(c, " X "), {});
  assert.deepEqual(C.cleanCatalog(null), {});
  assert.deepEqual(C.cleanCatalog([1]), {});
  assert.deepEqual(C.cleanCatalog({ a: { desc: "Y", price: 4, uses: "z" }, b: { desc: "", price: 1 }, c: { desc: "Z", price: -1 } }), { y: { desc: "Y", price: 4, uses: 1 } });
});
