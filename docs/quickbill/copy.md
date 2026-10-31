# QuickBill 소개 문구와 게시글 초안

사실만 적었습니다. 게시 전에 결제 링크와 가격이 `config.js`와 같은지 확인하세요. 아래 문구에서 "계정 없음", "서버에 저장 안 함"은 앱 데이터에 대해서만 맞습니다(라이선스 확인 때는 키를 서버로 보냅니다).

## 제품을 한 줄로

- 한국어: 혼자 일하는 사람을 위한 인보이스·견적서·시트·문서 도구. 계정 없이 내 브라우저에서만 돌아가고, 한 번만 결제합니다.
- English: Invoices, quotes, sheets and documents for people who work alone. No account, your data stays in your browser, pay once.

## 짧은 소개 (한국어, 약 200자)

QuickBill은 프리랜서와 1인 사업자를 위한 인보이스·견적서 도구입니다. 가입 없이 열면 바로 쓸 수 있고, 입력한 내용은 내 브라우저에만 저장됩니다. 견적서를 인보이스로 바꾸고, 부분 입금과 연체 수수료, 독촉 메일 문구, 반복 청구, 시간 기록 청구를 지원합니다. 계산 시트와 문서 템플릿, 영상 편집자를 위한 수정 요청 관리까지 있고 5개 언어(영어, 한국어, 일본어, 중국어, 스페인어)로 쓸 수 있습니다. 무료는 인보이스·견적서 3개까지, Pro는 $19 한 번 결제입니다.

## Short description (English, ~60 words)

QuickBill is an invoicing desk for freelancers and one-person businesses. Open it and start; no account. What you type stays in your browser. Turn quotes into invoices, track partial payments, add late fees, run recurring invoices, bill tracked time, and keep sheets and documents in the same place. Video editors get a revision tracker with timecoded requests. Free for 3 invoices or quotes; Pro is $19 once.

## 한국어 커뮤니티 게시글 (Show 형식)

**제목**: 계정 없이 브라우저에서만 도는 1인 사업자용 인보이스·견적서 도구를 만들었습니다

안녕하세요. 혼자 일하다 보니 인보이스를 매번 엑셀이나 문서로 만들고, 누가 입금했는지 따로 적는 게 번거로워서 직접 만들었습니다.

- 가입이 없습니다. 입력한 고객·금액은 내 브라우저에만 저장되고 서버로 가지 않습니다.
- 견적서를 눌러서 바로 인보이스로 바꿀 수 있고, 부분 입금과 연체 수수료, 독촉 문구까지 만들어 줍니다.
- 시간 기록으로 청구 항목을 만들 수 있고, 시트(SUM, AVERAGE 같은 수식)와 문서 템플릿도 같이 있습니다.
- 영상 편집을 하시는 분을 위해 수정 라운드와 타임코드별 수정 요청, 추가 라운드 청구 기능을 넣었습니다.
- 영어, 한국어, 일본어, 중국어, 스페인어를 지원합니다.
- 무료는 인보이스·견적서 3개까지이고, Pro는 $19 한 번 결제입니다(구독 아님).

아쉬운 점도 말씀드립니다. 한국 전자세금계산서는 지원하지 않고, 데이터가 브라우저에만 있어서 기기 간 동기화가 없습니다(백업 파일로 옮깁니다).

써 보시고 불편한 점, 빠진 기능을 알려 주시면 큰 도움이 됩니다. 주소: {사이트 주소}

> 게시 전 확인: 커뮤니티마다 자기 홍보 규칙이 다릅니다. 규칙을 먼저 읽고, 가능하면 "만든 사람"임을 밝히세요.

## English community post (Show / Indie-style)

**Title**: I built a no-account invoicing desk that keeps everything in your browser

I work alone and got tired of rebuilding invoices in spreadsheets and tracking payments somewhere else, so I made QuickBill.

- No sign-up. Clients and amounts are stored in your browser only.
- Quote to invoice in one click, partial payments, late fees, reminder text, recurring invoices, and invoice lines from tracked time.
- Sheets with formulas (SUM, AVERAGE) and document templates in the same app.
- A tracker for video editors: revision rounds, timecoded change requests, and billing for extra rounds.
- English, Korean, Japanese, Chinese and Spanish.
- Free for 3 invoices/quotes. Pro is $19 once, no subscription.

What it doesn't do: no e-invoicing or government-registered invoices, and no sync between devices (you move data with a backup file).

I'd like blunt feedback, especially on what stops you from using it for real invoices. {site url}

## Product Hunt 초안

- **Name**: QuickBill
- **Tagline (60자 이내)**: Invoices and quotes that never leave your browser
- **Description (260자 이내)**: Invoicing for one-person businesses. No account; your data stays in your browser. Quotes to invoices, partial payments, late fees, recurring invoices, sheets, documents and a revision tracker for video editors. 5 languages. Free to start, Pro is $19 once.
- **Topics**: Productivity, Fintech, Freelance
- **Maker's first comment**:
  > Hi, I'm the maker. I run on my own and wanted invoices without another account or subscription, so QuickBill keeps everything in the browser and works offline once loaded. The free plan covers 3 invoices or quotes; Pro removes limits and adds recurring invoices, CSV import/export, logo and the revision report for $19, once. It is not an e-invoicing tool and has no device sync yet; backups are a JSON file. I'm especially curious what would make you trust it with real invoices.
- 올릴 이미지: `invoice-pwa/og.png`(1200×630). 실제 화면 캡처는 직접 찍어서 넣는 편이 좋습니다.
- Product Hunt는 파일럿 후기가 몇 개 모인 뒤에 올리세요.

## 첫 유료 파일럿 모집 문구

### 한국어

**제목**: [모집] 인보이스·견적서 도구 QuickBill 첫 사용자 10분 (Pro 평생 무료)

혼자 일하는 프리랜서·1인 사업자 10분께 Pro를 무료로 드립니다. 대신 실제 청구에 2주 동안 써 보시고 아래를 알려 주세요.

1. 실제 인보이스를 몇 개 만들었는지, 어디서 막혔는지
2. 빠져서 아쉬운 기능 한 가지
3. 지금 같은 기능에 $19를 내시겠는지, 아니라면 얼마가 적당한지

- 대상: 월 1건 이상 청구서를 보내는 분(디자인, 개발, 영상, 번역, 강의 등)
- 참여 방법: {문의 이메일}로 직업과 지금 쓰는 도구를 한 줄로 보내 주세요. 선착순 10분께 라이선스 키를 보내 드립니다.
- 데이터는 서버로 가지 않으므로 고객 정보를 저한테 보내실 필요가 없습니다. 피드백은 말씀으로만 주시면 됩니다.

### English

**Subject**: Looking for 10 freelancers to try QuickBill Pro for free

I'm giving Pro to 10 people who invoice clients at least once a month. In return, use it on real invoices for two weeks and tell me: how many invoices you made and where you got stuck; one missing feature; and whether you'd pay $19 for this today (and if not, what price feels right).

Email {support email} with your line of work and the tool you use now. First 10 get a license key. Your invoice data never reaches me, so don't send client details; your words are enough.

> 운영 메모: 파일럿용 키는 Polar에서 100% 할인 코드를 만들어 발급하면 서버 검증과 같은 경로로 동작합니다(코드 생성 방법은 Polar 문서에서 확인). 파일럿 사용자가 낸 의견을 공개 후기로 쓰려면 사용 전에 동의를 받으세요.
