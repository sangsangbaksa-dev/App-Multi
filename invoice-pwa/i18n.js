export const LANGS = {
  en: { name: "English", locale: "en-US", currency: "USD" },
  ko: { name: "한국어", locale: "ko-KR", currency: "KRW" },
  ja: { name: "日本語", locale: "ja-JP", currency: "JPY" },
  zh: { name: "中文", locale: "zh-CN", currency: "CNY" },
  es: { name: "Español", locale: "es-ES", currency: "EUR" },
};

const D = {
  en: {
    newInvoice: "+ New invoice", goPro: "Go Pro", empty: "No invoices yet. Create your first one.",
    exportCsv: "Export CSV (Pro)", backup: "Backup (JSON)", restore: "Restore backup",
    from: "Your name / business", client: "Client", number: "Invoice #", currency: "Currency",
    issue: "Issue date", due: "Due date", tax: "Tax %", discount: "Discount", status: "Status",
    draft: "draft", sent: "sent", paid: "paid", items: "Items", desc: "Description", qty: "Qty", price: "Price",
    addItem: "+ Add item", notes: "Notes", save: "Save", print: "Print / Save PDF", del: "Delete", back: "Back",
    recurring: "Repeat (Pro)", none: "Never", weekly: "Weekly", monthly: "Monthly", logo: "Logo (Pro)", logoRemove: "Remove logo",
    proTitle: "QuickBill Pro", proBody: "Unlimited invoices, no watermark, logo, recurring invoices, CSV export. Pay once, keep forever.",
    buy: "Buy a license", activate: "Activate", close: "Close", badKey: "Invalid license key.",
    freeLimit: "Free plan is limited to {n} invoices.", csvPro: "CSV export is a Pro feature.",
    recurPro: "Recurring invoices are a Pro feature.", logoPro: "Logo upload is a Pro feature.",
    overdue: "overdue", dueWord: "due", subtotal: "Subtotal", discountL: "Discount", taxL: "Tax", total: "Total",
    invoice: "Invoice", fromL: "From", toL: "To", issuedL: "Issued", dueL: "Due",
    watermark: "Made with QuickBill – upgrade to remove this line", confirmDelete: "Delete this invoice?",
    generated: "{n} recurring invoice(s) created as drafts.", restoreOk: "Restored {n} invoices.", restoreBad: "That file is not a valid backup.",
    privacy: "🔒 Your data stays on this device. No account, no tracking.",
    // landing
    newQuote: "+ New quote", quote: "Quote", accepted: "accepted", convert: "Convert to invoice", converted: "Created {n} from this quote.", paidAmt: "Amount paid / deposit", balance: "Balance due", payinfo: "Payment instructions (bank, PayPal…)", validUntil: "Valid until", dashOutstanding: "Outstanding", dashOverdue: "Overdue", dashCollected: "Collected", byClient: "Clients", byClientPro: "Per-client history is a Pro feature.", billed: "billed", quoteOf: "From quote {n}",
    heroTitle: "Invoices for freelancers. Pay once. Your data stays yours.",
    heroSub: "Create, print and track professional invoices in seconds — in your language, offline, with no account and no subscription.",
    open: "Open the app", polTitle: "Our promises",
    p1t: "Private by design", p1d: "Everything is stored in your browser. We have no server that can see your clients or amounts.",
    p2t: "No subscription. Ever.", p2d: "One payment unlocks Pro for good, including all future updates.",
    p3t: "Free plan that is actually usable", p3d: "3 invoices, all currencies, all languages, PDF printing and backups — free.",
    p4t: "30-day refund", p4d: "Not for you? Email us within 30 days for a full refund, no questions.",
    featTitle: "Features", f1: "5 languages with local currency and date formats", f2: "Tax, discounts, due-date and overdue tracking",
    f3: "Recurring invoices (weekly / monthly)", f4: "Your logo on every invoice", f5: "Works offline, installable on phone and desktop",
    f6: "Quotes → invoices, partial payments, overdue alerts, income dashboard",
    priceTitle: "Pricing", freeName: "Free", proName: "Pro", priceFree: "$0", priceProV: "$19 one-time",
    freeList: "3 invoices · PDF print · JSON backup", proList: "Unlimited · No watermark · Logo · Recurring · CSV",
    footer: "© QuickBill. Your data never leaves your device.",
  },
  ko: {
    newInvoice: "+ 새 인보이스", goPro: "Pro 구매", empty: "아직 인보이스가 없습니다. 첫 인보이스를 만들어 보세요.",
    exportCsv: "CSV 내보내기 (Pro)", backup: "백업 (JSON)", restore: "백업 복원",
    from: "내 이름 / 상호", client: "고객", number: "인보이스 번호", currency: "통화",
    issue: "발행일", due: "지불 기한", tax: "세금 %", discount: "할인", status: "상태",
    draft: "초안", sent: "발송", paid: "결제완료", items: "항목", desc: "설명", qty: "수량", price: "단가",
    addItem: "+ 항목 추가", notes: "메모", save: "저장", print: "인쇄 / PDF 저장", del: "삭제", back: "뒤로",
    recurring: "반복 (Pro)", none: "안 함", weekly: "매주", monthly: "매월", logo: "로고 (Pro)", logoRemove: "로고 제거",
    proTitle: "QuickBill Pro", proBody: "무제한 인보이스, 워터마크 제거, 로고, 반복 인보이스, CSV 내보내기. 한 번 결제로 평생 사용.",
    buy: "라이선스 구매", activate: "활성화", close: "닫기", badKey: "라이선스 키가 올바르지 않습니다.",
    freeLimit: "무료 플랜은 인보이스 {n}개까지 저장할 수 있습니다.", csvPro: "CSV 내보내기는 Pro 기능입니다.",
    recurPro: "반복 인보이스는 Pro 기능입니다.", logoPro: "로고 업로드는 Pro 기능입니다.",
    overdue: "기한 초과", dueWord: "기한", subtotal: "소계", discountL: "할인", taxL: "세금", total: "합계",
    invoice: "인보이스", fromL: "발행인", toL: "수신", issuedL: "발행일", dueL: "기한",
    watermark: "QuickBill로 제작 – 업그레이드하면 이 문구가 사라집니다", confirmDelete: "이 인보이스를 삭제할까요?",
    generated: "반복 인보이스 {n}건이 초안으로 생성되었습니다.", restoreOk: "인보이스 {n}건을 복원했습니다.", restoreBad: "올바른 백업 파일이 아닙니다.",
    privacy: "🔒 데이터는 이 기기에만 저장됩니다. 가입 없음, 추적 없음.",
    newQuote: "+ 새 견적서", quote: "견적서", accepted: "수락됨", convert: "인보이스로 전환", converted: "이 견적서로 {n}을(를) 만들었습니다.", paidAmt: "입금액 / 선금", balance: "남은 금액", payinfo: "결제 안내 (계좌, PayPal 등)", validUntil: "유효 기간", dashOutstanding: "미수금", dashOverdue: "연체", dashCollected: "수금 완료", byClient: "고객별", byClientPro: "고객별 내역은 Pro 기능입니다.", billed: "청구", quoteOf: "견적서 {n}에서 전환",
    heroTitle: "프리랜서를 위한 인보이스. 한 번만 결제하세요. 데이터는 내 것입니다.",
    heroSub: "전문적인 인보이스를 몇 초 만에 만들고, 인쇄하고, 관리하세요. 내 언어로, 오프라인에서, 가입도 구독도 없이.",
    open: "앱 열기", polTitle: "우리의 약속",
    p1t: "설계부터 프라이버시", p1d: "모든 데이터는 브라우저에만 저장됩니다. 고객과 금액을 볼 수 있는 서버가 아예 없습니다.",
    p2t: "구독 없음. 영원히.", p2d: "한 번 결제로 Pro를 평생 사용하고, 이후 업데이트도 모두 포함됩니다.",
    p3t: "진짜 쓸 수 있는 무료 플랜", p3d: "인보이스 3개, 모든 통화·언어, PDF 인쇄, 백업까지 무료.",
    p4t: "30일 환불", p4d: "맞지 않으면 30일 안에 메일로 알려 주세요. 이유 묻지 않고 전액 환불합니다.",
    featTitle: "기능", f1: "5개 언어, 현지 통화·날짜 형식", f2: "세금, 할인, 기한 및 연체 표시",
    f3: "반복 인보이스 (매주 / 매월)", f4: "모든 인보이스에 내 로고", f5: "오프라인 동작, 폰·PC에 설치 가능",
    f6: "견적서→인보이스 전환, 부분 결제, 연체 알림, 수입 대시보드",
    priceTitle: "가격", freeName: "무료", proName: "Pro", priceFree: "$0", priceProV: "$19 (1회 결제)",
    freeList: "인보이스 3개 · PDF 인쇄 · JSON 백업", proList: "무제한 · 워터마크 없음 · 로고 · 반복 · CSV",
    footer: "© QuickBill. 데이터는 기기 밖으로 나가지 않습니다.",
  },
  ja: {
    newInvoice: "+ 新規請求書", goPro: "Proにする", empty: "請求書はまだありません。最初の1件を作成しましょう。",
    exportCsv: "CSV出力 (Pro)", backup: "バックアップ (JSON)", restore: "バックアップを復元",
    from: "あなたの名前 / 屋号", client: "取引先", number: "請求書番号", currency: "通貨",
    issue: "発行日", due: "支払期限", tax: "税率 %", discount: "値引き", status: "状態",
    draft: "下書き", sent: "送付済み", paid: "入金済み", items: "明細", desc: "内容", qty: "数量", price: "単価",
    addItem: "+ 明細を追加", notes: "備考", save: "保存", print: "印刷 / PDF保存", del: "削除", back: "戻る",
    recurring: "繰り返し (Pro)", none: "なし", weekly: "毎週", monthly: "毎月", logo: "ロゴ (Pro)", logoRemove: "ロゴを削除",
    proTitle: "QuickBill Pro", proBody: "請求書無制限、透かしなし、ロゴ、繰り返し請求、CSV出力。買い切りでずっと使えます。",
    buy: "ライセンスを購入", activate: "有効化", close: "閉じる", badKey: "ライセンスキーが正しくありません。",
    freeLimit: "無料プランは請求書{n}件までです。", csvPro: "CSV出力はPro機能です。",
    recurPro: "繰り返し請求はPro機能です。", logoPro: "ロゴのアップロードはPro機能です。",
    overdue: "期限超過", dueWord: "期限", subtotal: "小計", discountL: "値引き", taxL: "税", total: "合計",
    invoice: "請求書", fromL: "請求元", toL: "請求先", issuedL: "発行日", dueL: "支払期限",
    watermark: "QuickBillで作成 – アップグレードでこの表示を消せます", confirmDelete: "この請求書を削除しますか？",
    generated: "繰り返し請求書を{n}件、下書きとして作成しました。", restoreOk: "{n}件の請求書を復元しました。", restoreBad: "有効なバックアップファイルではありません。",
    privacy: "🔒 データはこの端末の中だけに保存されます。アカウント不要、追跡なし。",
    newQuote: "+ 新規見積書", quote: "見積書", accepted: "承諾済み", convert: "請求書に変換", converted: "この見積書から{n}を作成しました。", paidAmt: "入金額 / 前払金", balance: "未払い残高", payinfo: "お支払い方法（口座、PayPalなど）", validUntil: "有効期限", dashOutstanding: "未回収", dashOverdue: "期限超過", dashCollected: "回収済み", byClient: "取引先別", byClientPro: "取引先別の履歴はPro機能です。", billed: "請求", quoteOf: "見積書 {n} より",
    heroTitle: "フリーランスのための請求書。支払いは1回だけ。データはあなたのもの。",
    heroSub: "プロ品質の請求書を数秒で作成・印刷・管理。あなたの言語で、オフラインで、アカウントもサブスクも不要。",
    open: "アプリを開く", polTitle: "私たちの約束",
    p1t: "設計からプライバシー重視", p1d: "データはすべてブラウザ内に保存。取引先や金額を見られるサーバーはそもそもありません。",
    p2t: "サブスクなし。ずっと。", p2d: "1回の支払いでProが永久に使え、今後のアップデートも含まれます。",
    p3t: "ちゃんと使える無料プラン", p3d: "請求書3件、全通貨・全言語、PDF印刷、バックアップまで無料。",
    p4t: "30日間返金保証", p4d: "合わなければ30日以内にメールを。理由は聞かず全額返金します。",
    featTitle: "機能", f1: "5言語対応、現地の通貨・日付形式", f2: "税、値引き、期限・延滞の管理",
    f3: "繰り返し請求 (毎週 / 毎月)", f4: "すべての請求書にロゴを表示", f5: "オフライン対応、スマホ・PCにインストール可能",
    f6: "見積書→請求書の変換、一部入金、延滞アラート、収入ダッシュボード",
    priceTitle: "料金", freeName: "無料", proName: "Pro", priceFree: "$0", priceProV: "$19（買い切り）",
    freeList: "請求書3件 · PDF印刷 · JSONバックアップ", proList: "無制限 · 透かしなし · ロゴ · 繰り返し · CSV",
    footer: "© QuickBill. データは端末の外に出ません。",
  },
  zh: {
    newInvoice: "+ 新建发票", goPro: "升级 Pro", empty: "还没有发票，创建第一张吧。",
    exportCsv: "导出 CSV (Pro)", backup: "备份 (JSON)", restore: "恢复备份",
    from: "你的名称 / 公司", client: "客户", number: "发票编号", currency: "币种",
    issue: "开票日期", due: "付款截止日", tax: "税率 %", discount: "折扣", status: "状态",
    draft: "草稿", sent: "已发送", paid: "已付款", items: "明细", desc: "描述", qty: "数量", price: "单价",
    addItem: "+ 添加明细", notes: "备注", save: "保存", print: "打印 / 保存 PDF", del: "删除", back: "返回",
    recurring: "重复 (Pro)", none: "不重复", weekly: "每周", monthly: "每月", logo: "Logo (Pro)", logoRemove: "移除 Logo",
    proTitle: "QuickBill Pro", proBody: "无限发票、无水印、Logo、重复发票、CSV 导出。一次付费，永久使用。",
    buy: "购买许可证", activate: "激活", close: "关闭", badKey: "许可证密钥无效。",
    freeLimit: "免费版最多保存 {n} 张发票。", csvPro: "CSV 导出为 Pro 功能。",
    recurPro: "重复发票为 Pro 功能。", logoPro: "上传 Logo 为 Pro 功能。",
    overdue: "已逾期", dueWord: "截止", subtotal: "小计", discountL: "折扣", taxL: "税额", total: "合计",
    invoice: "发票", fromL: "开票方", toL: "收票方", issuedL: "开票日期", dueL: "截止日期",
    watermark: "由 QuickBill 制作 – 升级后可去除此行", confirmDelete: "确定删除这张发票吗？",
    generated: "已生成 {n} 张重复发票草稿。", restoreOk: "已恢复 {n} 张发票。", restoreBad: "该文件不是有效的备份。",
    privacy: "🔒 数据仅保存在本设备。无需账号，无追踪。",
    newQuote: "+ 新建报价单", quote: "报价单", accepted: "已接受", convert: "转为发票", converted: "已根据此报价单创建 {n}。", paidAmt: "已付金额 / 定金", balance: "待付余额", payinfo: "付款说明（银行账户、PayPal 等）", validUntil: "有效期至", dashOutstanding: "未收款", dashOverdue: "已逾期", dashCollected: "已收款", byClient: "按客户", byClientPro: "按客户查看历史为 Pro 功能。", billed: "已开票", quoteOf: "来自报价单 {n}",
    heroTitle: "自由职业者的发票工具。一次付费，数据归你。",
    heroSub: "几秒钟创建、打印并管理专业发票。支持你的语言，可离线使用，无需账号，无需订阅。",
    open: "打开应用", polTitle: "我们的承诺",
    p1t: "隐私优先的设计", p1d: "所有数据只保存在你的浏览器中。我们没有任何能看到你客户和金额的服务器。",
    p2t: "永不订阅", p2d: "一次付款永久解锁 Pro，并包含之后所有更新。",
    p3t: "真正好用的免费版", p3d: "3 张发票、所有币种和语言、PDF 打印和备份，全部免费。",
    p4t: "30 天退款", p4d: "不合适？30 天内发邮件即可全额退款，无需理由。",
    featTitle: "功能", f1: "5 种语言，本地货币与日期格式", f2: "税额、折扣、到期与逾期提醒",
    f3: "重复发票（每周 / 每月）", f4: "每张发票显示你的 Logo", f5: "可离线使用，可安装到手机和电脑",
    f6: "报价单转发票、部分付款、逾期提醒、收入看板",
    priceTitle: "价格", freeName: "免费", proName: "Pro", priceFree: "$0", priceProV: "$19（一次性）",
    freeList: "3 张发票 · PDF 打印 · JSON 备份", proList: "无限 · 无水印 · Logo · 重复 · CSV",
    footer: "© QuickBill。你的数据不会离开你的设备。",
  },
  es: {
    newInvoice: "+ Nueva factura", goPro: "Hazte Pro", empty: "Aún no hay facturas. Crea la primera.",
    exportCsv: "Exportar CSV (Pro)", backup: "Copia de seguridad (JSON)", restore: "Restaurar copia",
    from: "Tu nombre / negocio", client: "Cliente", number: "N.º de factura", currency: "Moneda",
    issue: "Fecha de emisión", due: "Fecha de vencimiento", tax: "Impuesto %", discount: "Descuento", status: "Estado",
    draft: "borrador", sent: "enviada", paid: "pagada", items: "Conceptos", desc: "Descripción", qty: "Cant.", price: "Precio",
    addItem: "+ Añadir concepto", notes: "Notas", save: "Guardar", print: "Imprimir / Guardar PDF", del: "Eliminar", back: "Volver",
    recurring: "Repetir (Pro)", none: "Nunca", weekly: "Semanal", monthly: "Mensual", logo: "Logo (Pro)", logoRemove: "Quitar logo",
    proTitle: "QuickBill Pro", proBody: "Facturas ilimitadas, sin marca de agua, logo, facturas recurrentes y exportación CSV. Pago único, para siempre.",
    buy: "Comprar licencia", activate: "Activar", close: "Cerrar", badKey: "Clave de licencia no válida.",
    freeLimit: "El plan gratuito permite hasta {n} facturas.", csvPro: "Exportar CSV es una función Pro.",
    recurPro: "Las facturas recurrentes son una función Pro.", logoPro: "Subir un logo es una función Pro.",
    overdue: "vencida", dueWord: "vence", subtotal: "Subtotal", discountL: "Descuento", taxL: "Impuesto", total: "Total",
    invoice: "Factura", fromL: "De", toL: "Para", issuedL: "Emitida", dueL: "Vence",
    watermark: "Hecho con QuickBill – pásate a Pro para quitar esta línea", confirmDelete: "¿Eliminar esta factura?",
    generated: "Se crearon {n} factura(s) recurrente(s) como borrador.", restoreOk: "Se restauraron {n} facturas.", restoreBad: "Ese archivo no es una copia válida.",
    privacy: "🔒 Tus datos se quedan en este dispositivo. Sin cuenta, sin rastreo.",
    newQuote: "+ Nuevo presupuesto", quote: "Presupuesto", accepted: "aceptado", convert: "Convertir en factura", converted: "Se creó {n} a partir de este presupuesto.", paidAmt: "Importe pagado / anticipo", balance: "Saldo pendiente", payinfo: "Instrucciones de pago (banco, PayPal…)", validUntil: "Válido hasta", dashOutstanding: "Pendiente", dashOverdue: "Vencido", dashCollected: "Cobrado", byClient: "Clientes", byClientPro: "El historial por cliente es una función Pro.", billed: "facturado", quoteOf: "Del presupuesto {n}",
    heroTitle: "Facturas para freelancers. Pagas una vez. Tus datos son tuyos.",
    heroSub: "Crea, imprime y controla facturas profesionales en segundos: en tu idioma, sin conexión, sin cuenta y sin suscripción.",
    open: "Abrir la app", polTitle: "Nuestras promesas",
    p1t: "Privado por diseño", p1d: "Todo se guarda en tu navegador. No tenemos ningún servidor que pueda ver tus clientes ni tus importes.",
    p2t: "Sin suscripción. Nunca.", p2d: "Un solo pago desbloquea Pro para siempre, con todas las actualizaciones futuras.",
    p3t: "Un plan gratis que sirve de verdad", p3d: "3 facturas, todas las monedas e idiomas, impresión en PDF y copias de seguridad, gratis.",
    p4t: "Reembolso de 30 días", p4d: "¿No es para ti? Escríbenos en 30 días y te devolvemos todo, sin preguntas.",
    featTitle: "Funciones", f1: "5 idiomas con moneda y fechas locales", f2: "Impuestos, descuentos y control de vencimientos",
    f3: "Facturas recurrentes (semanal / mensual)", f4: "Tu logo en cada factura", f5: "Funciona sin conexión; instalable en móvil y escritorio",
    f6: "Presupuesto → factura, pagos parciales, alertas de vencimiento, panel de ingresos",
    priceTitle: "Precio", freeName: "Gratis", proName: "Pro", priceFree: "$0", priceProV: "$19 pago único",
    freeList: "3 facturas · Impresión PDF · Copia JSON", proList: "Ilimitadas · Sin marca de agua · Logo · Recurrentes · CSV",
    footer: "© QuickBill. Tus datos nunca salen de tu dispositivo.",
  },
};

export function detectLang(saved, nav = (typeof navigator !== "undefined" ? navigator.languages || [navigator.language] : [])) {
  if (saved && LANGS[saved]) return saved;
  for (const l of nav || []) {
    const c = String(l).slice(0, 2).toLowerCase();
    if (LANGS[c]) return c;
  }
  return "en";
}

let lang = "en";
export const getLang = () => lang;
export const setLang = (l) => { lang = LANGS[l] ? l : "en"; };
export function t(key, vars = {}) {
  const s = D[lang][key] ?? D.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
export function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat(LANGS[lang].locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
}
export const locale = () => LANGS[lang].locale;

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll("[data-i18n]").forEach((e) => (e.textContent = t(e.dataset.i18n)));
  root.querySelectorAll("[data-i18n-ph]").forEach((e) => (e.placeholder = t(e.dataset.i18nPh)));
}
export function langSelect(el, onChange) {
  el.innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
  el.value = lang;
  el.onchange = () => onChange(el.value);
}
