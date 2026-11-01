/* Privacy policy and terms, English + Korean (other languages: see the English text). Edit here; build.js renders them. */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T = {
  privacy: { en: { h: 'Privacy', p: [
    'Stampbook runs in your browser. Student names, lesson dates, notes and prices are saved in this browser\'s local storage on your device. They are not sent to us or to anyone else. We run no analytics and set no cookies.',
    'A balance link (Pro) contains one student\'s name, lesson dates and lesson count inside the address after the # sign. That part of an address is not sent to a server when the page loads, but anyone who has the link can read it, and the chat app you paste it into may keep it. Share it only with that student.',
    'Licence keys (Pro): when you activate a key, the key is sent from your browser to our server function, which checks it with our payment provider (Gumroad) and returns yes or no. We do not store the key or log it. The provider holds the purchase record and your payment details under its own privacy policy. Stampbook never sees your card.',
    'Clearing your browser data deletes your stamps. Use Backup to keep a file copy.',
    'Contact: {email}. Last updated 2026-10-30.'] },
    ko: { h: '개인정보', p: [
    '스탬프북은 브라우저 안에서 동작합니다. 수강생 이름, 수업 날짜, 메모, 금액은 기기의 이 브라우저 로컬 저장소에만 저장되며 우리나 제3자에게 전송되지 않습니다. 분석 도구도 쿠키도 쓰지 않습니다.',
    '잔여 링크(Pro)에는 수강생 한 명의 이름, 수업 날짜, 횟수가 주소의 # 뒤에 담깁니다. 이 부분은 페이지를 열 때 서버로 전송되지 않지만 링크를 가진 사람은 누구나 읽을 수 있고, 붙여넣은 메신저가 보관할 수 있습니다. 해당 수강생에게만 보내세요.',
    '라이선스 키(Pro): 키를 활성화하면 브라우저가 키를 우리 서버 함수로 보내고, 서버 함수가 결제 대행사(Gumroad)에 확인해 맞는지 틀린지만 돌려줍니다. 키를 저장하거나 기록하지 않습니다. 구매 기록과 결제 정보는 결제 대행사가 자체 방침에 따라 보관하며, 스탬프북은 카드 정보를 보지 못합니다.',
    '브라우저 데이터를 지우면 도장 기록도 삭제됩니다. 백업으로 파일 사본을 보관하세요.',
    '문의: {email}. 최종 수정 2026-10-30.'] } },
  terms: { en: { h: 'Terms', p: [
    'Stampbook is a tool for keeping count of prepaid lessons. It is provided as is. It does not process payments between you and your students, and it is not tax, legal or accounting advice. You are responsible for your own records; keep backups.',
    'Free: up to {limit} active packs. Pro: a one-time payment of {price} that unlocks unlimited packs, balance links and CSV export on the devices where you enter your licence key. We may change the price for new buyers; what you paid for stays unlocked.',
    'Refunds: if Pro does not work for you, email {email} within 14 days of purchase and we will refund the payment. Payments are handled by our payment provider, which acts as the seller of record where applicable.',
    'Do not use Stampbook for anything unlawful, and do not try to defeat the licence check. We may stop supporting the service with reasonable notice; the app keeps working offline from the files you have already loaded, and you can export your data at any time.',
    'Contact: {email}. Last updated 2026-10-30.'] },
    ko: { h: '이용약관', p: [
    '스탬프북은 선결제 수강권의 횟수를 기록하는 도구이며 현재 상태 그대로 제공됩니다. 선생님과 수강생 사이의 결제를 처리하지 않고, 세무·법률·회계 자문이 아닙니다. 기록의 관리 책임은 사용자에게 있으니 백업해 두세요.',
    '무료: 진행 중인 수강권 {limit}개까지. Pro: {price} 1회 결제로 수강권 무제한, 잔여 링크, CSV 내보내기를 라이선스 키를 입력한 기기에서 쓸 수 있습니다. 신규 구매자의 가격은 바뀔 수 있지만 이미 구매한 기능은 계속 열려 있습니다.',
    '환불: Pro가 맞지 않으면 구매 후 14일 이내에 {email}로 메일을 주시면 결제를 환불합니다. 결제는 결제 대행사가 처리하며 해당되는 경우 대행사가 판매자 역할을 합니다.',
    '불법적인 용도로 쓰지 말고 라이선스 확인을 우회하려 하지 마세요. 서비스 지원은 합리적인 사전 공지 후 종료될 수 있으며, 이미 불러온 파일로 오프라인에서 계속 동작하고 데이터는 언제든 내보낼 수 있습니다.',
    '문의: {email}. 최종 수정 2026-10-30.'] } }
};
function render(page, SITE, base) {
  const fill = s => esc(s).replace(/\{email\}/g, `<a href="mailto:${esc(SITE.supportEmail)}">${esc(SITE.supportEmail)}</a>`).replace(/\{limit\}/g, SITE.freeLimit).replace(/\{price\}/g, esc(SITE.price));
  const sec = (lang, o) => `<section lang="${lang}"><h1 style="font-size:34px">${esc(o.h)}</h1>${o.p.map(x => `<p>${fill(x)}</p>`).join('')}</section>`;
  const title = page === 'privacy' ? 'Privacy · 개인정보 · Stampbook' : 'Terms · 이용약관 · Stampbook';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="canonical" href="${base}/${page}"><meta name="description" content="Stampbook ${page}"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/landing.css"></head>
<body><div class="wrap"><nav><a class="logo" href="/"><img src="/icon.svg" alt="" width="28" height="28"> Stampbook</a></nav><main>${sec('en', T[page].en)}${sec('ko', T[page].ko)}
<p class="fine">日本語・中文・Español: the English text applies. / 英語版が適用されます。/ 以英文版为准。/ Se aplica la versión en inglés.</p></main>
<footer><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/">Stampbook</a></footer></div></body></html>`;
}
module.exports = { render };
