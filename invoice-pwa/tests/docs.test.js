import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../docs.js";

test("render escapes html and builds structure", () => {
  const h = D.render("# Title\n\nHello <b>x</b>\nsecond line\n\n- one\n- two\n\n## Sub");
  assert.match(h, /<h2>Title<\/h2>/);
  assert.match(h, /<p>Hello &lt;b&gt;x&lt;\/b&gt;<br>second line<\/p>/);
  assert.match(h, /<ul>\n<li>one<\/li>\n<li>two<\/li>\n<\/ul>/);
  assert.match(h, /<h3>Sub<\/h3>/);
  assert.ok(!/<script|<b>/.test(D.render("<script>alert(1)</script>")));
});
test("fill replaces known placeholders only", () => {
  assert.equal(D.fill("Hi {{client}}, from {{ from }} {{unknown}}", { client: "Ana", from: "Me" }), "Hi Ana, from Me {{unknown}}");
  assert.equal(D.fill("{{client}}", { client: "" }), "{{client}}");
  assert.deepEqual(D.missing("a {{x}} {{y}} {{x}}"), ["x", "y"]);
});
