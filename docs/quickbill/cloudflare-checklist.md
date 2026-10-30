# Cloudflare Pages 출시 체크리스트 (사용자가 직접 할 일)

1. **Cloudflare 가입**: https://dash.cloudflare.com 에서 계정을 만듭니다. 무료 플랜으로 Pages를 쓸 수 있습니다.
2. **GitHub 연결**: Workers & Pages → Create → Pages → Connect to Git 에서 `sangsangbaksa-dev/App-Multi` 저장소를 허용합니다. 저장소 접근 권한이 없으면 GitHub에서 Cloudflare 앱을 설치해야 합니다.
3. **프로젝트 설정**: `docs/quickbill/cloudflare-pages.md`의 표대로 입력합니다. 프로젝트 이름은 `quickbill` (이미 쓰이면 `quickbill-app`처럼 다른 이름)으로 하면 주소가 `<이름>.pages.dev`가 됩니다.
4. **환경변수**: Pages 프로젝트 → Settings → Variables and Secrets에 `LS_STORE_ID`, `LS_PRODUCT_ID`를 Production에 입력합니다. (결제 플랫폼 가입 후 값을 받습니다.)
5. **첫 배포 확인**: 배포가 끝나면 `https://<이름>.pages.dev/api/license`에서 `{"configured":true}` 또는 `{"configured":false}`가 보이는지, `/app`이 열리는지 확인합니다.
6. **주소 알려 주기**: 실제 주소를 알려 주시면 `siteUrl`과 SEO 파일을 그 주소로 맞춥니다.
7. **자체 도메인(선택)**: Pages 프로젝트 → Custom domains에서 연결합니다. 도메인은 직접 구매하세요. 연결 후 6번을 다시 합니다.
8. **Vercel**: 당분간 그대로 둡니다. 새 주소가 확인되면 Vercel 프로젝트 정리는 사용자가 결정합니다.
