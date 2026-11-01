# Cloudflare Pages로 배포하기 (Vercel 대체)

Vercel 무료(Hobby) 플랜은 약관상 상업 이용을 제한하는 것으로 알려져 있어(가입 시 약관을 직접 확인하세요), 판매용 서비스는 Cloudflare Pages로 옮기는 쪽을 준비해 두었습니다. 기존 Vercel 배포는 그대로 두었습니다.

## 구조
- 정적 사이트 + 서버 함수 1개. 함수는 `functions/api/license.js` (Pages Functions, 주소 `/api/license`). Vercel용 `api/license.js`와 같은 코어(`lib/license-core.js`)를 씁니다.
- 빌드: `node scripts/build.js --dist` 가 `config.js`로 랜딩, 약관, 개인정보, sitemap, robots을 만들고 공개 파일만 `dist/`로 복사합니다(scripts, test, docs, 함수 코드는 공개되지 않음).
- 헤더와 CSP는 `_headers`, 리다이렉트는 `_redirects`. `/privacy`, `/terms`, `/ko` → `/ko/` 같은 깔끔한 주소는 Pages가 기본 처리합니다.

## Cloudflare Pages 설정값
| 항목 | 값 |
|---|---|
| 연결 저장소 | `sangsangbaksa-dev/App-Multi` (GitHub) |
| Production branch | `main` (PR #2 머지 후). 머지 전 시험은 `claude/project-thread-emx3f1` 브랜치의 Preview 배포 |
| Framework preset | None |
| Root directory | `stampbook` |
| Build command | `node scripts/build.js --dist` |
| Build output directory | `dist` |
| 환경변수 (Production, Preview 둘 다) | `GUMROAD_PRODUCT_ID`, 필요하면 `NODE_VERSION=22` |

Functions는 Root directory 아래 `functions/` 폴더를 자동으로 인식하므로 따로 설정할 것이 없습니다.

## 로컬에서 확인하는 방법
```
cd stampbook
node scripts/build.js --dist
npx wrangler pages dev dist -b GUMROAD_PRODUCT_ID=prod-1
```
이 환경에서 확인한 것: workerd에서 함수가 405(GET), 400(잘못된 요청), 설정 시 외부 호출 시도를 올바르게 하고, `/`, `/ko`(308 → `/ko/`), `/privacy`, `/terms`, `/app/`, `/sitemap.xml` 응답과 CSP·nosniff·Referrer-Policy 헤더, `/index.html` → `/` 리다이렉트가 동작합니다. 성공 경로(키 활성화)는 Node에서 가짜 Gumroad 응답으로 테스트했고, 이 환경에서는 외부 호출이 막혀 실제 Gumroad 호출과 실제 Cloudflare 배포는 확인하지 못했습니다.

## 알아둘 점
- `config.js`의 `siteUrl`을 새 주소(`https://<프로젝트명>.pages.dev` 또는 연결한 도메인)로 바꿔야 canonical, sitemap, OG 주소가 맞습니다.
- Pages Functions 무료 요금제에는 일일 요청 한도가 있는 것으로 알려져 있습니다(정적 파일은 한도와 무관). 한도와 현재 조건은 Cloudflare 요금 페이지에서 확인하세요. 이 함수는 키 활성화 때와 주 1회 재확인 때만 호출됩니다.
- Cloudflare에는 요청 제한(Rate limiting)과 방화벽 규칙이 있어 `/api/license` 남용이 보이면 대시보드에서 규칙을 추가할 수 있습니다(설정은 사용자 몫).
- Vercel과 Cloudflare 둘 다 켜 두면 어느 쪽이 정식 주소인지 헷갈리니 이전이 끝나면 Vercel 프로젝트를 정리하세요.
