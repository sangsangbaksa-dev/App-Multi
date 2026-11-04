/* Guards for two bugs found in the browser: an inline style attribute that the CSP blocks, and a
   data-t label that carried a file input, so applyI18n() removed the input and "Import" did nothing. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.js'), 'utf8');

test('app: no inline style attributes (the CSP is style-src self)', () => {
  assert.equal(/\bstyle\s*:\s*['"]/.test(app), false);
});

test('app: the import label keeps its text in a span, not on the element that holds the file input', () => {
  assert.match(app, /el\('label', \{ cls: 'btn ghost file-btn' \}, \[el\('span', \{ t: 'set_import' \}\), fileIn\]\)/);
});
