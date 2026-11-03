# Third-party licenses

This repository has no runtime npm packages, CDN scripts, icon sets, stock images or sounds. The only third-party material that ships to users is two typefaces in QuickBill and one vendored script in Stampbook.

| Component | Where | Copyright | License |
| --- | --- | --- | --- |
| Inter 4.001 (Regular, Medium, SemiBold, Latin subset, WOFF2) | `invoice-pwa/fonts/inter-latin-*.woff2` | Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) | SIL Open Font License 1.1, full text in `invoice-pwa/fonts/OFL-Inter.txt` |
| Newsreader 1.003 (Regular, SemiBold, Latin subset, WOFF2) | `invoice-pwa/fonts/newsreader-latin-*.woff2` | Copyright 2020 The Newsreader Project Authors (http://github.com/productiontype/Newsreader) | SIL Open Font License 1.1, full text in `invoice-pwa/fonts/OFL-Newsreader.txt` |
| qrcode-generator 1.4.4 (JavaScript) | `stampbook/app/qr.js` | Copyright (c) 2009 Kazuhiko Arase (https://github.com/kazuhikoarase/qrcode-generator) | MIT License, full permission notice kept at the top of the file, which ships unminified |

Notes
- Neither font declares a Reserved Font Name, so the subset files may keep the original family names.
- The QuickBill wordmark and icon (`logo.svg`, `icon*.svg`, PNG icons, `og.png`) contain outlined Newsreader glyphs. The OFL allows this; the font itself is not embedded in those files.
- The font files and their license texts are copied into the published `dist/` folder by `invoice-pwa/scripts/build-pages.mjs`, which satisfies the OFL condition that each copy carries the notice and license.
- "QR Code" is a registered trademark of DENSO WAVE INCORPORATED. The apps use the words only to describe the code they draw.
- Stampbook, Stayline and Marginlog use only the visitor's system fonts (`system-ui`, `Georgia`, ...). Nothing is bundled.
- Fonts are only used on the machine that renders `og.png`/icons through the stacks named in `design/og.html` or `scripts/make-images.js`; the PNGs contain pixels, not font files.
- All other code and artwork in this repository was written for these apps (with Claude). There is no top-level `LICENSE`, so the default is all rights reserved by the owner.

This file is a record, not legal advice.
