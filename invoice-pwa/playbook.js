// Static freelancer playbook: pricing, clients, contracts, taxes, tools and promo-video tips.
// Content lives in the app, so nothing needs to be filled in. Free entries are open to everyone; the rest need Pro.
// Each entry: { id, free, cat, t: { en, ko, ja, zh, es } } where each language is { title, points[] }.
export const CATS = ["pricing", "clients", "contracts", "taxes", "time", "tools", "promo"];

export const PLAYBOOK = [
  {
    id: "tools-free", free: true, cat: "tools",
    t: {
      en: { title: "Free tools that cover the basics", points: ["Spreadsheets for tracking income and expenses, free in Google Sheets or LibreOffice Calc.", "Free accounting tiers from invoicing and bookkeeping apps can cover a small practice; check current limits.", "Canva's free plan is enough for proposals, one-page case studies and simple social graphics."] },
      ko: { title: "기본을 채워 주는 무료 도구", points: ["수입과 지출은 구글 시트나 LibreOffice Calc 같은 무료 스프레드시트로 관리하세요.", "청구서·장부 앱의 무료 요금제로 소규모 작업은 충분한 경우가 많습니다. 제한은 바뀔 수 있으니 확인하세요.", "제안서, 사례 한 장, 간단한 소셜 이미지는 캔바 무료 요금제로 만들 수 있습니다."] },
      ja: { title: "基本をカバーする無料ツール", points: ["収入と経費はGoogleスプレッドシートやLibreOffice Calcなどの無料ツールで管理できます。", "請求・帳簿アプリの無料プランで小規模な仕事は足りることが多いです。上限は変わるので確認を。", "提案書や事例1枚、簡単なSNS画像はCanvaの無料プランで作れます。"] },
      zh: { title: "覆盖基础需求的免费工具", points: ["用 Google 表格或 LibreOffice Calc 等免费表格记录收入和支出。", "开票与记账应用的免费版通常足够小型业务，但上限会变，请以官网为准。", "提案、案例页和简单的社交图片可以用 Canva 免费版完成。"] },
      es: { title: "Herramientas gratuitas para lo básico", points: ["Lleva ingresos y gastos en una hoja de cálculo gratuita como Google Sheets o LibreOffice Calc.", "Los planes gratuitos de apps de facturación y contabilidad suelen bastar para trabajos pequeños; revisa los límites actuales.", "El plan gratuito de Canva sirve para propuestas, casos de estudio de una página y gráficos sencillos."] },
    },
  },
  {
    id: "time-free", free: true, cat: "time",
    t: {
      en: { title: "Bill the time you actually tracked", points: ["Start a timer for each task, even small ones, and write a short note on what it was.", "Round in your favour only when the client agreed to it in writing.", "Review the week every Friday: which tasks took longer than you quoted?"] },
      ko: { title: "실제로 기록한 시간만 청구하기", points: ["작은 작업도 타이머를 켜고, 무엇을 했는지 짧게 적어 두세요.", "시간을 올림하려면 클라이언트 동의를 글로 받아 두세요.", "매주 금요일에 견적보다 오래 걸린 작업이 무엇인지 확인하세요."] },
      ja: { title: "実際に記録した時間だけを請求する", points: ["小さな作業でもタイマーを使い、何をしたかを短くメモします。", "時間の切り上げは、クライアントの同意を書面で得た場合だけにします。", "毎週金曜に、見積より時間がかかった作業を振り返ります。"] },
      zh: { title: "只收取实际记录的时间", points: ["每项工作都开计时器，即使很小，并简单记下做了什么。", "只有客户书面同意时才按向上取整计费。", "每周五检查：哪些任务超出了报价时间？"] },
      es: { title: "Cobra solo el tiempo que registraste", points: ["Usa un temporizador en cada tarea, incluso las pequeñas, y anota brevemente qué hiciste.", "Redondea a tu favor solo si el cliente lo aceptó por escrito.", "Cada viernes revisa qué tareas tardaron más de lo presupuestado."] },
    },
  },
  {
    id: "clients-free", free: true, cat: "clients",
    t: {
      en: { title: "Ask for a deposit before you start", points: ["A 30 to 50 percent deposit filters out clients who will not pay later.", "Put the deposit and the due date in the first invoice, not in a chat message.", "Start work after the deposit clears, not after the client says it is coming."] },
      ko: { title: "시작 전에 선금 받기", points: ["선금을 30~50% 받으면 나중에 돈을 안 낼 클라이언트를 미리 걸러낼 수 있습니다.", "선금과 기한은 채팅이 아니라 첫 청구서에 적으세요.", "입금 예정이라는 말이 아니라 입금이 확인된 뒤에 작업을 시작하세요."] },
      ja: { title: "着手前に手付金を受け取る", points: ["手付金を30〜50%もらうと、支払いが滞る相手を事前に見分けられます。", "手付金と支払期限は、チャットではなく最初の請求書に書きます。", "「入金予定です」ではなく、入金を確認してから作業を始めます。"] },
      zh: { title: "开工前先收定金", points: ["收取 30%–50% 的定金，可以提前筛掉之后不付款的客户。", "定金和付款日期要写在第一张发票上，而不是只在聊天里说。", "等款项到账后再开工，不要因为对方说“马上付”就开始。"] },
      es: { title: "Pide un anticipo antes de empezar", points: ["Un anticipo del 30 al 50 % filtra a los clientes que luego no pagarán.", "Pon el anticipo y la fecha límite en la primera factura, no solo en un mensaje.", "Empieza cuando el anticipo esté cobrado, no cuando el cliente diga que lo enviará."] },
    },
  },
  {
    id: "pricing-value", free: false, cat: "pricing",
    t: {
      en: { title: "Price by value, not by the hour", points: ["Ask what the result is worth to the client: more sales, saved hours, fewer errors.", "Quote a fixed fee for a clear outcome; keep hourly rates for open-ended work.", "If a client pushes back, reduce the scope before you reduce the price."] },
      ko: { title: "시간이 아니라 가치로 가격 정하기", points: ["결과가 클라이언트에게 얼마의 가치가 있는지 물어보세요. 매출, 절약한 시간, 줄어든 실수 등입니다.", "결과가 분명한 일은 고정 금액으로, 끝이 열린 일은 시간당 요금으로 견적하세요.", "가격을 깎자는 요청이 오면, 가격보다 범위를 먼저 줄이세요."] },
      ja: { title: "時間ではなく価値で価格を決める", points: ["その成果がクライアントにとってどれだけ価値があるかを確認します。", "成果が明確な仕事は定額、終わりが見えない仕事は時給で見積もります。", "値下げ要望には、価格を下げる前に作業範囲を絞る案を出します。"] },
      zh: { title: "按价值而不是按小时定价", points: ["先问清结果对客户值多少：多少销售、节省多少时间、减少多少错误。", "结果明确的项目报固定价，范围不确定的工作再按时薪计费。", "客户压价时，先缩小范围，再考虑降价。"] },
      es: { title: "Pon precio por valor, no por hora", points: ["Pregunta cuánto vale el resultado para el cliente: más ventas, horas ahorradas, menos errores.", "Cotiza un precio fijo para un resultado claro; usa tarifa por hora para trabajo abierto.", "Si el cliente pide rebajar, reduce el alcance antes que el precio."] },
    },
  },
  {
    id: "pricing-minimum", free: false, cat: "pricing",
    t: {
      en: { title: "Set a minimum project fee", points: ["Pick the smallest job you will take. Anything under it costs more in admin than it earns.", "Count admin, calls, and revisions in the minimum, not only the design or writing time.", "Write the minimum on your rate card so it is not a decision you make under pressure."] },
      ko: { title: "최소 프로젝트 금액 정하기", points: ["받을 수 있는 가장 작은 작업의 금액을 정하세요. 그보다 작은 일은 행정 비용이 수익보다 큽니다.", "최소 금액에는 디자인이나 글쓰기 시간뿐 아니라 통화, 행정, 수정 작업도 넣으세요.", "요금표에 최소 금액을 적어 두면 압박 속에서 즉흥적으로 정하지 않아도 됩니다."] },
      ja: { title: "最低プロジェクト料金を決める", points: ["引き受ける最小の仕事の金額を決めます。それ未満は事務作業のほうが多くかかります。", "最低料金には制作時間だけでなく、打ち合わせ・事務・修正も含めます。", "料金表に書いておけば、プレッシャーの中で決めずに済みます。"] },
      zh: { title: "设定项目最低收费", points: ["确定你愿意接的最小项目。低于它的工作，行政成本会超过收入。", "最低收费要包含沟通、行政和修改的时间，而不只是制作时间。", "把最低收费写进报价表，避免在压力下临时决定。"] },
      es: { title: "Define una tarifa mínima por proyecto", points: ["Fija el trabajo más pequeño que aceptarás; por debajo, la administración cuesta más de lo que ganas.", "Incluye llamadas, administración y revisiones en el mínimo, no solo el tiempo creativo.", "Escríbelo en tu tarifario para no decidirlo bajo presión."] },
    },
  },
  {
    id: "proposal-close", free: false, cat: "clients",
    t: {
      en: { title: "A one-page proposal that gets a yes", points: ["Open with the client's problem in their words, then the outcome you will deliver.", "List three options: a basic, a recommended, and a full package. Most clients pick the middle one.", "End with one clear next step and a date the offer expires."] },
      ko: { title: "승인을 받는 한 장짜리 제안서", points: ["첫머리에는 클라이언트의 문제를 그들의 말로 적고, 그다음 드릴 결과를 쓰세요.", "기본, 추천, 전체 패키지 세 가지 옵션을 주세요. 대부분은 가운데를 고릅니다.", "마지막에는 다음 단계 하나와 제안 만료일을 적으세요."] },
      ja: { title: "承諾を得られる1枚の提案書", points: ["冒頭はクライアントの課題を相手の言葉で書き、そのあとで提供する成果を述べます。", "ベーシック・おすすめ・フルの3案を出すと、多くの人は真ん中を選びます。", "最後に次の一歩と提案の有効期限を明記します。"] },
      zh: { title: "能促成签约的一页提案", points: ["开头用客户自己的话描述问题，然后说明你会交付的结果。", "给出三个方案：基础、推荐、完整。多数客户会选中间那个。", "结尾写一个明确的下一步，并注明报价的截止日期。"] },
      es: { title: "Una propuesta de una página que dice sí", points: ["Empieza con el problema del cliente en sus palabras y luego el resultado que entregarás.", "Ofrece tres opciones: básica, recomendada y completa. Muchos clientes eligen la del medio.", "Termina con un siguiente paso claro y la fecha en que caduca la oferta."] },
    },
  },
  {
    id: "scope-limits", free: false, cat: "contracts",
    t: {
      en: { title: "Stop scope creep with a 'not included' list", points: ["Write what is not included, such as extra rounds of revisions, stock photos, or rush delivery.", "Name the price of an extra round in the contract so the client can choose.", "When a new request comes in, reply with the cost and the timeline before you start."] },
      ko: { title: "‘포함되지 않은 항목’ 목록으로 범위 넘침 막기", points: ["추가 수정 라운드, 유료 이미지, 급행 작업처럼 포함되지 않는 항목을 적으세요.", "추가 수정 한 번의 가격을 계약서에 적어 두면 클라이언트가 선택할 수 있습니다.", "새 요청이 오면 시작 전에 비용과 일정을 먼저 답하세요."] },
      ja: { title: "「対象外」リストで範囲の膨張を防ぐ", points: ["追加の修正回数、有料素材、特急対応などを対象外として書きます。", "追加修正1回の料金を契約書に入れておくと、相手が選べます。", "新しい依頼には、着手前に費用と日程を返信します。"] },
      zh: { title: "用“不包含”清单防止范围蔓延", points: ["写明不包含的内容，例如额外修改轮次、付费素材、加急交付。", "在合同里写明额外一轮修改的价格，让客户自己选择。", "收到新需求时，先回复费用和时间，再开始做。"] },
      es: { title: "Evita el alcance creciente con una lista de 'no incluido'", points: ["Escribe lo que no incluye: rondas extra de cambios, fotos de stock o entrega urgente.", "Pon en el contrato el precio de una ronda extra para que el cliente pueda elegir.", "Ante una petición nueva, responde primero con el coste y el plazo."] },
    },
  },
  {
    id: "payment-terms", free: false, cat: "contracts",
    t: {
      en: { title: "Payment terms that get you paid on time", points: ["Set the due date in days, for example 14 days, and say what happens after it.", "Charge a late fee only if you can explain it clearly; many clients skip it when it is stated early.", "Send the reminder before the due date, not after it."] },
      ko: { title: "제때 입금받는 결제 조건", points: ["기한은 ‘14일 이내’처럼 일수로 정하고, 기한이 지나면 어떻게 되는지도 적으세요.", "연체료는 이유를 명확히 설명할 수 있을 때만 쓰세요. 처음부터 적어 두면 대부분 지킵니다.", "독촉은 기한이 지난 뒤가 아니라 기한 전에 보내세요."] },
      ja: { title: "期日どおりに入金されるための支払条件", points: ["支払期限は「14日以内」など日数で決め、期限後の扱いも書きます。", "延滞料は理由を説明できる場合だけ。最初に明記すると守られやすくなります。", "催促は期限後ではなく、期限の前にします。"] },
      zh: { title: "让客户按时付款的条款", points: ["用天数设定付款期限，例如 14 天内，并写明逾期后的处理方式。", "只有在能清楚解释时才收滞纳金；事先写明，多数客户会遵守。", "在到期日之前发提醒，而不是之后。"] },
      es: { title: "Condiciones de pago que te cobran a tiempo", points: ["Fija el plazo en días, por ejemplo 14 días, y di qué pasa si se supera.", "Cobra recargos solo si puedes explicarlos; si los pones desde el principio, muchos clientes pagan a tiempo.", "Envía el recordatorio antes de la fecha límite, no después."] },
    },
  },
  {
    id: "tax-set-aside", free: false, cat: "taxes",
    t: {
      en: { title: "Set aside money for tax on every payment", points: ["Move a fixed share of each payment into a separate account as soon as it arrives.", "The right share depends on your country and income, so check with a local tax adviser.", "Keep a rough running total so tax season is a review, not a surprise."] },
      ko: { title: "입금될 때마다 세금 따로 떼어 두기", points: ["입금이 들어오면 정해 둔 비율을 바로 별도 계좌로 옮기세요.", "적정 비율은 나라와 소득에 따라 다르니 지역 세무 전문가에게 확인하세요.", "대략적인 누계를 기록해 두면 신고 시즌이 놀랄 일이 아니게 됩니다."] },
      ja: { title: "入金のたびに税金分を別に取り分ける", points: ["入金があったら、決めた割合をすぐ別口座へ移します。", "適切な割合は国や所得によって違うので、地域の税理士に確認してください。", "おおよその累計を記録しておくと、確定申告が驚きになりません。"] },
      zh: { title: "每笔收款都先留出税款", points: ["收到款项后，立即把约定比例转入单独账户。", "合适的比例取决于国家和收入，请咨询当地税务顾问。", "记录一个大致的累计数，报税时就不会措手不及。"] },
      es: { title: "Aparta dinero para impuestos en cada pago", points: ["Pasa un porcentaje fijo de cada cobro a una cuenta separada en cuanto llegue.", "El porcentaje adecuado depende de tu país y tus ingresos; consulta a un asesor fiscal local.", "Lleva un total aproximado para que la declaración no sea una sorpresa."] },
    },
  },
  {
    id: "expense-records", free: false, cat: "taxes",
    t: {
      en: { title: "Keep receipts and sort expenses as you go", points: ["Photograph each receipt the day you get it and note what it was for.", "Group expenses into a few categories: software, equipment, travel, learning, and home office.", "Save the record for the number of years your tax office requires."] },
      ko: { title: "영수증은 그때그때 정리하기", points: ["영수증은 받은 날 사진으로 찍고 어떤 업무 비용인지 메모하세요.", "지출은 소프트웨어, 장비, 교통, 교육, 사무 공간 같은 몇 가지 범주로 나누세요.", "세무 기관이 요구하는 기간만큼 기록을 보관하세요."] },
      ja: { title: "領収書は都度整理する", points: ["受け取った日に写真を撮り、何の経費かをメモします。", "経費はソフト、機材、交通、学習、在宅オフィスなど数項目に分けます。", "税務上必要な年数の間、記録を保管します。"] },
      zh: { title: "收据随手整理", points: ["收到收据当天拍照，并备注用途。", "把支出分成几类：软件、设备、交通、学习、家庭办公。", "按税务机关要求的年限保存记录。"] },
      es: { title: "Guarda los recibos y clasifica los gastos al momento", points: ["Fotografía cada recibo el día que lo recibes y anota para qué fue.", "Agrupa los gastos en pocas categorías: software, equipo, viajes, formación y oficina en casa.", "Guarda los registros durante los años que exija tu administración fiscal."] },
    },
  },
  {
    id: "find-clients", free: false, cat: "clients",
    t: {
      en: { title: "Find clients through people you already know", points: ["Send a short note to five past clients and ask who else needs your kind of work.", "Ask for a referral when a project ends well, not when you need money.", "Keep a list of warm contacts and check it once a month."] },
      ko: { title: "이미 아는 사람을 통해 클라이언트 찾기", points: ["지난 클라이언트 다섯 명에게 짧은 메시지를 보내, 비슷한 일이 필요한 사람을 물어보세요.", "추천은 돈이 급할 때가 아니라 프로젝트가 잘 끝났을 때 부탁하세요.", "가까운 연락처 목록을 만들고 한 달에 한 번 확인하세요."] },
      ja: { title: "知っている人からクライアントを見つける", points: ["過去のクライアント5人に短い連絡を送り、同じ仕事を必要とする人を聞きます。", "紹介は、プロジェクトが順調に終わったときにお願いします。", "親しい人のリストを作り、月に1度見直します。"] },
      zh: { title: "通过熟人找客户", points: ["给五位过去的客户发一条简短消息，问问他们身边有没有需要这类服务的人。", "项目顺利结束时请对方推荐，而不是在急需收入的时候。", "列一份熟人名单，每月检查一次。"] },
      es: { title: "Encuentra clientes a través de tus contactos", points: ["Escribe a cinco clientes anteriores y pregunta quién más necesita tu trabajo.", "Pide recomendaciones cuando un proyecto salió bien, no cuando necesitas dinero.", "Mantén una lista de contactos cercanos y revísala cada mes."] },
    },
  },
  {
    id: "follow-up", free: false, cat: "clients",
    t: {
      en: { title: "Follow up without sounding pushy", points: ["Send three messages over two weeks: a reminder, a useful resource, then a clear close.", "Make each message useful on its own, such as a case study or a short tip about their problem.", "If there is no answer after the third message, close the loop politely and move on."] },
      ko: { title: "부담스럽지 않게 후속 연락하기", points: ["2주 동안 세 번 연락하세요. 첫 번째는 상기, 두 번째는 도움이 되는 자료, 세 번째는 분명한 마무리입니다.", "각 메시지가 그 자체로 도움이 되도록, 사례나 그들의 문제에 대한 짧은 팁을 담으세요.", "세 번째에도 답이 없으면 정중하게 마무리하고 다음으로 넘어가세요."] },
      ja: { title: "しつこく見えない追いかけ方", points: ["2週間で3通送ります。リマインド、役立つ資料、そして明確なクロージングです。", "各メッセージは単独で役立つように、事例や相手の課題に関する短いヒントを入れます。", "3通目にも返信がなければ、丁寧に区切りをつけて次へ進みます。"] },
      zh: { title: "跟进时不显得急躁", points: ["两周内发三条消息：提醒、一份有用的资料、最后明确地收尾。", "每条消息都要有价值，例如案例或关于对方问题的小建议。", "第三条仍没回复，就礼貌地结束这次跟进，继续下一个。"] },
      es: { title: "Haz seguimiento sin parecer insistente", points: ["Envía tres mensajes en dos semanas: un recordatorio, un recurso útil y un cierre claro.", "Que cada mensaje aporte algo por sí mismo, como un caso práctico o un consejo sobre su problema.", "Si no responde al tercero, cierra con educación y sigue adelante."] },
    },
  },
  {
    id: "promo-script", free: false, cat: "promo",
    t: {
      en: { title: "Script a 30-second promo video", points: ["Hook in the first three seconds: name the problem your client has.", "Show one before and after, then the one thing you do and who it is for.", "End with one call to action and your contact, shown on screen."] },
      ko: { title: "30초 홍보 영상 대본 짜기", points: ["처음 3초 안에 클라이언트의 문제를 말하세요.", "전후 비교를 하나 보여 준 뒤, 무엇을 하는지와 누구를 위한 것인지 말하세요.", "마지막에 행동 요청 한 가지와 연락처를 화면에 띄우세요."] },
      ja: { title: "30秒のプロモ動画の台本", points: ["最初の3秒で、クライアントの課題を言葉にします。", "ビフォーアフターを1つ見せ、何をする人で誰のためかを伝えます。", "最後に行動を促す一言と連絡先を画面に出します。"] },
      zh: { title: "写一段30秒宣传视频脚本", points: ["开头三秒点出客户的问题。", "展示一组前后对比，然后说明你做什么、为谁做。", "结尾给出一个行动号召，并在屏幕上显示联系方式。"] },
      es: { title: "Guion de un vídeo promocional de 30 segundos", points: ["Engancha en los tres primeros segundos: nombra el problema del cliente.", "Muestra un antes y un después, y luego qué haces y para quién.", "Termina con una sola llamada a la acción y tu contacto en pantalla."] },
    },
  },
  {
    id: "promo-shoot", free: false, cat: "promo",
    t: {
      en: { title: "Shoot a promo video with a phone", points: ["Film near a window in daylight and keep the phone steady with both hands or a small stand.", "Record a vertical 9:16 version for short-video apps and a 16:9 version for your website.", "Add captions: most people watch without sound."] },
      ko: { title: "휴대폰으로 홍보 영상 찍기", points: ["낮에 창가에서 찍고, 두 손이나 작은 거치대로 휴대폰을 고정하세요.", "짧은 영상 앱용으로 세로 9:16, 웹사이트용으로 가로 16:9를 함께 찍으세요.", "자막을 넣으세요. 많은 사람이 소리 없이 봅니다."] },
      ja: { title: "スマホで宣伝動画を撮る", points: ["昼間の窓際で撮影し、両手か小さなスタンドでスマホを固定します。", "ショート動画用の縦9:16と、サイト用の横16:9を撮ると便利です。", "字幕を入れましょう。多くの人は音を消して見ています。"] },
      zh: { title: "用手机拍宣传视频", points: ["在白天靠窗拍摄，用双手或小支架固定手机。", "同时拍竖版 9:16 用于短视频，横版 16:9 用于网站。", "加上字幕，很多人是静音观看的。"] },
      es: { title: "Graba un vídeo promocional con el móvil", points: ["Graba cerca de una ventana con luz natural y sujeta el móvil con las dos manos o un trípode pequeño.", "Graba una versión vertical 9:16 para vídeos cortos y otra horizontal 16:9 para tu web.", "Añade subtítulos: mucha gente mira sin sonido."] },
    },
  },
  {
    id: "promo-editing-tools", free: false, cat: "tools",
    t: {
      en: { title: "Editing tools for a promo video", points: ["CapCut and DaVinci Resolve both have free versions that cover cuts, captions and music.", "Canva can assemble a short video from clips and images if you want less editing work.", "Check each tool's current free limits and licence terms before you publish client work with it."] },
      ko: { title: "홍보 영상 편집 도구", points: ["캡컷과 다빈치 리졸브는 무료 버전으로도 컷 편집, 자막, 음악을 넣을 수 있습니다.", "편집을 줄이고 싶다면 캔바에서 클립과 이미지로 짧은 영상을 만들 수 있습니다.", "클라이언트 작업에 쓰기 전에 각 도구의 무료 제한과 사용 조건을 확인하세요."] },
      ja: { title: "宣伝動画の編集ツール", points: ["CapCutとDaVinci Resolveは無料版でもカット、字幕、音楽に対応しています。", "編集を減らしたいなら、Canvaでクリップや画像から短い動画を作れます。", "クライアントの仕事に使う前に、各ツールの無料の上限と利用規約を確認してください。"] },
      zh: { title: "宣传视频的剪辑工具", points: ["剪映和 DaVinci Resolve 的免费版都能完成剪辑、字幕和配乐。", "想少剪一些，可以用 Canva 把片段和图片组合成短视频。", "用于客户作品前，请确认各工具当前的免费限制和授权条款。"] },
      es: { title: "Herramientas de edición para un vídeo promocional", points: ["CapCut y DaVinci Resolve tienen versiones gratuitas con cortes, subtítulos y música.", "Si quieres editar menos, Canva puede montar un vídeo corto a partir de clips e imágenes.", "Revisa los límites gratuitos y las condiciones de licencia antes de usarlas en trabajos de clientes."] },
    },
  },
  {
    id: "promo-process", free: false, cat: "promo",
    t: {
      en: { title: "Show your process, not only the result", points: ["Film a short clip of the first draft and the messy middle, not only the final piece.", "Clients trust people who explain their decisions; say why you chose one approach.", "Post the same clip in three places: your site, a professional network, and a short-video app."] },
      ko: { title: "결과만이 아니라 과정을 보여 주기", points: ["최종물뿐 아니라 첫 초안과 작업 중간 모습도 짧게 찍으세요.", "클라이언트는 결정 이유를 설명하는 사람을 신뢰합니다. 왜 그 방법을 골랐는지 말하세요.", "같은 영상을 웹사이트, 업무용 SNS, 짧은 영상 앱 세 곳에 올리세요."] },
      ja: { title: "結果だけでなく過程を見せる", points: ["完成品だけでなく、最初の下書きや作業途中の短い映像も撮ります。", "判断の理由を説明できる人が信頼されます。なぜその方法を選んだかを話してください。", "同じ動画を、サイト、ビジネスSNS、ショート動画アプリの3か所に投稿します。"] },
      zh: { title: "展示过程，而不只是结果", points: ["拍一段初稿和制作中间的片段，而不只是成品。", "客户更信任能解释决策的人，说明你为什么选择这种做法。", "同一段视频发到三个地方：你的网站、职业社交平台和短视频应用。"] },
      es: { title: "Muestra el proceso, no solo el resultado", points: ["Graba un clip del primer borrador y del proceso, no solo de la pieza final.", "Los clientes confían en quien explica sus decisiones; di por qué elegiste ese enfoque.", "Publica el mismo clip en tres sitios: tu web, una red profesional y una app de vídeos cortos."] },
    },
  },
  {
    id: "rate-review", free: false, cat: "pricing",
    t: {
      en: { title: "Review your rate every six months", points: ["Compare your rate with what similar freelancers charge for the same work.", "Raise prices for new clients first; existing clients get notice before the change.", "Track how many proposals you win at each price to see if you are too cheap."] },
      ko: { title: "요금을 6개월마다 점검하기", points: ["비슷한 일을 하는 프리랜서가 얼마를 받는지 내 요금과 비교하세요.", "인상은 신규 클라이언트부터 적용하고, 기존 클라이언트에게는 미리 알리세요.", "요금별로 제안 수락률을 기록해서 너무 싸게 받고 있지는 않은지 확인하세요."] },
      ja: { title: "料金は半年ごとに見直す", points: ["同じ仕事をしている人の相場と自分の料金を比べます。", "値上げは新規のクライアントから。既存のクライアントには事前に知らせます。", "料金ごとの受注率を記録して、安すぎないかを確かめます。"] },
      zh: { title: "每六个月检查一次报价", points: ["和做同类工作的自由职业者的收费比较。", "先对新客户涨价，老客户提前通知。", "记录不同报价下的成交率，看看是不是报低了。"] },
      es: { title: "Revisa tu tarifa cada seis meses", points: ["Compara tu tarifa con lo que cobran autónomos que hacen el mismo trabajo.", "Sube precios primero a clientes nuevos y avisa con antelación a los actuales.", "Anota cuántas propuestas ganas a cada precio para ver si cobras poco."] },
    },
  },
];

const FALLBACK = "en";
export function entryFor(entry, lang) {
  return entry.t[lang] ?? entry.t[FALLBACK];
}
