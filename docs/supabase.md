# Supabase 연동 (QuickBill · Stampbook · Stayline)

선택 기능입니다. 로그인하지 않으면 세 앱 모두 예전처럼 이 기기(localStorage)에서만 동작하고 아무것도 전송하지 않습니다.
설정(`supabaseUrl`/`supabaseKey`)이 비어 있으면 화면에 클라우드 UI 자체가 나타나지 않습니다.

## 동작 방식
- 이메일 + 비밀번호로 가입/로그인 (Supabase Auth, 순수 `fetch`, 외부 라이브러리 없음).
- 앱마다 사용자당 JSON 스냅샷 1개를 `public.app_snapshots`에 저장합니다. 로그인 후 자동 동기화(편집 4초 뒤), "지금 동기화" 버튼도 있습니다.
- **충돌 처리**: 쓰기마다 "내가 마지막으로 본 revision"을 함께 보내고 서버가 일치할 때만 받습니다. 두 기기가 다 바뀌었으면 덮어쓰지 않고 "클라우드 사용 / 이 기기 사용"을 묻습니다. 아무 데이터도 없는 새 기기는 물어보지 않고 클라우드 사본을 받습니다.
- 라이선스 키/Pro 상태와 언어 설정은 올리지 않습니다 (기기별 유지).
- 가져온 데이터 적용 후 페이지를 새로고침합니다. QuickBill은 적용 직전 청구서를 `qb.invoices.bak-cloud`에 백업합니다.

## 적용 순서 (한 번만)
1. `supabase/migrations/20261101000000_app_snapshots.sql` 실행 (Supabase 대시보드 SQL Editor, 또는 `supabase db push`). 테이블, RLS 정책 4개(본인 행만 select/insert/update/delete), `anon` 권한 제거가 들어 있습니다.
2. Dashboard → Authentication → Providers → Email 가 켜져 있는지 확인. 가입 즉시 쓰게 하려면 "Confirm email"을 끄고, 켜 두면 가입 후 메일의 링크를 눌러야 합니다 (그때 링크는 Site URL로 돌아오므로 Authentication → URL Configuration 의 Site URL을 앱 주소로 바꿔 주세요).
3. 각 앱의 설정 파일(`invoice-pwa/config.js`, `stampbook/config.js`, `stayline/config.js`)에 프로젝트 URL과 publishable key(`sb_publishable_...`)가 들어 있습니다. 이 키는 공개용이며 데이터는 RLS가 지킵니다. **secret / service_role 키는 절대 넣지 마세요.**
4. CSP(`vercel.json`, `_headers`)의 `connect-src`에 프로젝트 주소가 추가되어 있습니다. 다른 프로젝트를 쓰면 같이 바꿔 주세요.

## 코드 위치
- `shared/cloud-sync.js` 클라이언트, `shared/cloud-i18n.js` 5개 언어 문구, `shared/cloud-panel.js` 로그인/동기화 UI. 앱마다 같은 파일 사본을 두며, 수정 후 `node shared/sync-copies.js`로 복사합니다 (테스트가 사본 일치를 검사).
- QuickBill은 `invoice-pwa/cloud-data.js`가 올릴 키 목록을 정합니다.

## 테스트
```
node --test shared/cloud-sync.test.js     # 동기화 로직 (가짜 Supabase 서버)
node shared/e2e-cloud.cjs                 # 브라우저: 3개 앱 가입→동기화→새 기기에서 수신 (실제 CSP 적용)
cd invoice-pwa && npm test
```

## 개인정보 문구
Stayline 랜딩/개인정보/앱 안내 문구(5개 언어)를 "로그인하면 선택적으로 Supabase에 사본 저장" 취지로 고쳤습니다 (`stayline/scripts/*`, `app/i18n.js`, 재생성된 페이지). QuickBill/Stampbook 법적 문구도 배포 전에 같은 취지인지 확인해 주세요.

## 적용 현황
마이그레이션은 프로젝트 `fiiljdmbnmvtayffsydb`에 적용 완료. Auth의 "Confirm email"과 Site URL은 대시보드에서만 바꿀 수 있습니다.
