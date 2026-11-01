import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../sheet.js";

const val = (cells, ref) => S.evaluate(cells)(ref);

test("column names round trip", () => {
  assert.equal(S.colName(0), "A"); assert.equal(S.colName(25), "Z"); assert.equal(S.colName(26), "AA");
  assert.equal(S.colIndex("AB"), 27);
  assert.equal(S.refOf(2, 4), "C5");
});
test("arithmetic and precedence", () => {
  assert.equal(val({ A1: "=1+2*3" }, "A1"), 7);
  assert.equal(val({ A1: "=(1+2)*3" }, "A1"), 9);
  assert.equal(val({ A1: "=2^3^2" }, "A1"), 512);
  assert.equal(val({ A1: "=-2+5" }, "A1"), 3);
  assert.equal(val({ A1: "=10/4" }, "A1"), 2.5);
});
test("references, ranges and functions", () => {
  const c = { A1: "2", A2: "3", A3: "x", B1: "=A1*10", B2: "=SUM(A1:A3)", B3: "=AVERAGE(A1:A2)", B4: "=MAX(A1:A2,10)", B5: "=COUNT(A1:A3)", B6: "=ROUND(2.345,2)", B7: "=IF(A1<A2,100,200)" };
  assert.equal(val(c, "B1"), 20);
  assert.equal(val(c, "B2"), 5);           // text cell ignored
  assert.equal(val(c, "B3"), 2.5);
  assert.equal(val(c, "B4"), 10);
  assert.equal(val(c, "B5"), 2);
  assert.equal(val(c, "B6"), 2.35);
  assert.equal(val(c, "B7"), 100);
});
test("errors", () => {
  assert.equal(val({ A1: "=1/0" }, "A1"), "#DIV/0!");
  assert.equal(val({ A1: "=A2", A2: "=A1" }, "A1"), "#CYCLE!");
  assert.equal(val({ A1: "=1+" }, "A1"), "#ERR!");
  assert.equal(val({ A1: "=FOO(1)" }, "A1"), "#NAME?");
  assert.equal(val({ A1: "=alert(1)" }, "A1"), "#ERR!");
  assert.equal(val({ A1: "=A2+1", A2: "=1/0" }, "A1"), "#DIV/0!");
  assert.equal(val({ A1: "=B1", B1: "hello" }, "A1"), "hello");
});
test("numbers parse, text stays text", () => {
  assert.equal(val({ A1: "1,250.5" }, "A1"), 1250.5);
  assert.equal(val({ A1: "abc" }, "A1"), "abc");
  assert.equal(val({}, "Z9"), "");
});
test("csv parse and write handle quotes and newlines", () => {
  const rows = S.parseCSV('a,"b,c","say ""hi"""\r\n1,2,"x\ny"\n');
  assert.deepEqual(rows, [["a", "b,c", 'say "hi"'], ["1", "2", "x\ny"]]);
  assert.deepEqual(S.parseCSV(S.toCSV(rows)), rows);
  assert.deepEqual(S.parseCSV("﻿a,b"), [["a", "b"]]);
});
test("cells <-> rows and invoice lines", () => {
  const cells = S.rowsToCells([["Item", "Qty", "Price"], ["Logo", "2", "150"], ["Hosting", "1", "=12*10"], ["", "", ""]]);
  assert.deepEqual(S.invoiceLines(cells, 4), [{ desc: "Logo", qty: 2, price: 150 }, { desc: "Hosting", qty: 1, price: 120 }]);
  assert.deepEqual(S.sheetSize(cells), { rows: 20, cols: 8 });
  assert.deepEqual(S.trimRows([["a"], [""], [""]]), [["a"]]);
  assert.deepEqual(S.trimRows([["a", "", ""], ["b", "c", ""], ["", "", ""]]), [["a", ""], ["b", "c"]]);
  assert.equal(S.computedRows(cells, 3, 3)[2][2], "120");
});
