// Copies shared/cloud-sync.js into each app. Run after editing the shared file.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dirs = ['invoice-pwa', 'stampbook/app', 'stayline/app'];
for (const f of ['cloud-sync.js', 'cloud-i18n.js', 'cloud-panel.js']) {
  const src = fs.readFileSync(path.join(__dirname, f));
  for (const d of dirs) fs.writeFileSync(path.join(root, d, f), src);
}
console.log('copied cloud-sync.js and cloud-i18n.js to', dirs.join(', '));
