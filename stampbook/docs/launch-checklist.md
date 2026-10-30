# Stampbook 출시 체크리스트 (사용자가 직접 할 일)

코드와 문서는 준비되어 있습니다. 아래는 계정, 결제, 법적 판단이 필요해서 사용자 본인이 해야 하는 일입니다. 순서대로 하면 됩니다.

## 0. Cloudflare Pages로 옮기기 (권장: Vercel 무료 플랜은 상업 이용 제한)
자세한 설정값과 검증 내용은 `docs/cloudflare-pages.md`.
- [ ] Cloudflare 계정 만들기(무료)
- [ ] Workers & Pages > Create > Pages > Connect to Git. GitHub 연결 허용 후 저장소 `sangsangbaksa-dev/App-Multi` 선택
- [ ] 설정 입력: Framework preset `None`, Root directory `stampbook`, Build command `node scripts/build.js --dist`, Build output directory `dist`
- [ ] Production branch: PR #2를 머지한 뒤 `main`. 머지 전에 보고 싶으면 이 브랜치의 Preview 주소로 먼저 확인
- [ ] Settings > Variables and Secrets에 `LS_STORE_ID`, `LS_PRODUCT_ID` 입력(Production과 Preview 둘 다). 값이 없으면 임시 키 검사로 동작
- [ ] 배포 후 `https://<프로젝트>.pages.dev` 에서 랜딩, 앱, `/terms`, `/privacy`를 열어 보고 `config.js`의 `siteUrl`을 그 주소로 바꿔 커밋(다시 자동 배포)
- [ ] 도메인: Pages 프로젝트 > Custom domains에서 연결(도메인 구입은 사용자 몫). 연결 후 `siteUrl`을 다시 갱신
- [ ] 확인이 끝나면 Vercel 프로젝트 `stampbook-lessons`를 정리(삭제 전에 주소가 어디서도 쓰이지 않는지 확인)

## 1. 결제 플랫폼 가입 (가장 먼저)
- [ ] Lemon Squeezy(권장: 판매자 역할을 대신해 세금을 처리하는 MoR 방식) 가입. 한국 거주자의 가입 조건, 정산 방식, 수수료는 이 환경에서 확인하지 못했으니 가입 화면에서 직접 확인하세요. 다른 선택지(Paddle, Polar 등)도 있지만 이 코드의 서버 검증은 Lemon Squeezy의 라이선스 API 기준입니다.
- [ ] 상품 만들기: "Stampbook Pro", 1회 결제, **라이선스 키 발급 켜기**(Generate license keys). 가격은 `config.js`의 `price`와 맞추세요(현재 $19는 임시값).
- [ ] 결제 링크(checkout URL) 복사
- [ ] Store ID와 Product ID 확인(대시보드 또는 상품 URL). 숫자입니다.

## 2. config.js 한 곳만 수정
`stampbook/config.js`
- [ ] `checkoutUrl` = 위 결제 링크
- [ ] `supportEmail` = 실제 문의/환불 이메일
- [ ] `price` = 실제 가격 표기
- [ ] `siteUrl` = 최종 도메인(아직 없으면 그대로)

수정 후 커밋하면 Vercel이 배포하면서 `node scripts/build.js`로 랜딩, 약관, 개인정보, sitemap, robots를 다시 만듭니다. 별도 작업 없음.

## 3. 환경변수 입력 (Cloudflare Pages: Settings > Variables and Secrets / Vercel을 쓸 경우 Project > Settings > Environment Variables)
- [ ] `LS_STORE_ID` = Store ID
- [ ] `LS_PRODUCT_ID` = Product ID
- 저장 후 재배포. 두 값이 없으면 앱은 기존 임시 키 검사로 동작하고, 있으면 Lemon Squeezy 서버 검증으로 바뀝니다(그 순간부터 임시 키 SB-XXXX는 작동하지 않습니다).
- [ ] 테스트 모드에서 구매한 키로 앱에서 활성화해 보기. 잘못된 키는 거절되는지도 확인.
- (Vercel을 계속 쓸 때만) Production Branch / Ignored Build Step: PR #2 머지 후 main 빌드가 되도록 `claude/project-thread-emx3f1`만 허용한 현재 설정을 바꿔야 합니다(Settings > Git).

## 4. 도메인 (선택, 권장)
- [ ] 도메인 구입 후 Vercel Project > Domains에서 연결. 연결 뒤 `config.js`의 `siteUrl`을 새 주소로 바꿔 커밋.
- [ ] Google Search Console에 등록하고 `/sitemap.xml` 제출.

## 5. 법적·사업 판단 (제가 판단할 수 없는 부분)
- [ ] 사업자 등록 여부: 해외 결제 플랫폼으로 수익이 생기면 한국에서는 소득 신고 대상일 수 있습니다. 개인 부업인지 사업자 등록이 필요한지는 세무사 또는 국세청 상담으로 확인하세요(확인하지 못한 항목).
- [ ] 이용약관(`/terms`)과 개인정보(`/privacy`) 읽어 보고 환불 기간(14일), 문구가 의도와 맞는지 확인. 환불 이메일은 `supportEmail`이 그대로 들어갑니다.
- [ ] 결제 플랫폼 정책과 약관의 환불 규정이 서로 어긋나지 않는지 확인.

## 6. 출시 전 최종 점검
- [ ] 실제 휴대폰(iPhone Safari, Android Chrome)에서 앱 열기, 홈 화면에 추가, 비행기 모드에서 동작
- [ ] 일본어, 중국어, 스페인어 문구를 원어민에게 한 번 보여주기(현재 AI 번역, 검수 전)
- [ ] 결제 → 키 수신 → 활성화 → 잔여 링크와 CSV가 열리는지 전체 흐름 1회
- [ ] 백업 파일 받기와 복원 1회

## 알아둘 한계
- Pro 기능(잔여 링크, CSV, 무제한)은 브라우저 안에서 켜고 끄기 때문에 개발자 도구를 아는 사람은 우회할 수 있습니다. 서버 검증은 "정상 구매한 키인지"를 확인할 뿐 기능을 서버에서 막지는 않습니다. 서버 없는 구조의 의도된 절충입니다.
- 데이터는 사용자 브라우저에만 있어서 기기를 바꾸면 백업 파일로 옮겨야 합니다. 클라우드 동기화가 필요해지면 그때 계정과 서버를 붙이는 2단계입니다.
- 라이선스 서버 함수에 요청 횟수 제한은 없습니다. 남용이 보이면 Vercel 방화벽 규칙으로 제한하세요.
