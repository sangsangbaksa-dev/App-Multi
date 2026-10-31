# Cloudflare Pages 배포 설정

QuickBill은 Vercel(Hobby 플랜은 상업 이용 불가)에서 Cloudflare Pages로 옮깁니다. 기존 Vercel 배포는 그대로 둡니다.

## 빌드 설정값 (Pages 프로젝트 생성 시 입력)

| 항목 | 값 |
|---|---|
| Framework preset | None |
| Root directory (Build) | `invoice-pwa` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` (PR을 머지한 뒤) 또는 `claude/project-thread-nsfz9c` (미리보기) |
| Node version | 22 (환경변수 `NODE_VERSION=22` 로 지정하면 확실) |

`npm run build`는 `scripts/build-pages.mjs`를 실행합니다. 테스트, 설계 원본, 문서, Vercel용 파일은 빼고 `dist/`를 만들며, `vercel.json`의 보안 헤더(CSP 포함)를 `dist/_headers`로 옮깁니다.

## 함수

- `functions/api/license.js` → Pages Function, 주소는 `/api/license` 그대로입니다.
- 환경변수(Pages 프로젝트 → Settings → Variables and Secrets, Production에 추가):
  - `POLAR_ORGANIZATION_ID`
  - `POLAR_BENEFIT_ID`
- 값이 없으면 `{"configured":false}`를 돌려주고 앱은 기존 오프라인 키로 동작합니다.

## 로컬 확인

```
cd invoice-pwa
npm test
npm run build
npx wrangler pages dev dist --port 8123
node tests/e2e.cjs   # 같은 포트의 서버를 대상으로 실행
```

## 리다이렉트와 주소

- 페이지 주소는 확장자 없이 씁니다: `/app`, `/terms`, `/privacy`, `/ko/`. Pages는 `app.html`을 `/app`으로 자동 연결합니다.
- 한국어·일본어·중국어·스페인어 페이지는 `ko/index.html` 등으로 빌드되어 `/ko/`로 열립니다.
- `*.pages.dev` 주소는 `_headers`에서 `X-Robots-Tag: noindex`를 받습니다. 검색 노출은 자체 도메인 연결 후에 합니다.

## 주소를 바꿀 때

새 주소가 정해지면 (예: `https://quickbill.pages.dev` 또는 자체 도메인):

1. `invoice-pwa/config.js`의 `siteUrl`을 바꿉니다.
2. `cd invoice-pwa && npm run seo` 로 canonical, hreflang, OG, sitemap을 다시 만듭니다.
3. 커밋하고 푸시합니다. Pages가 자동으로 빌드합니다.
