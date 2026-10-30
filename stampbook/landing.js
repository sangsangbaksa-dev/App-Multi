(function () {
  var D = {
    en: { name: 'English', app: 'Stampbook', kick: 'For tutors, coaches and instructors', h1: 'Every lesson stamped. Nobody argues about the count.',
      lede: 'Your students prepay for 10 lessons. Three weeks later nobody remembers if it was 6 or 7 left. Stampbook is a stamp card that lives in your browser.',
      cta: 'Open the app', ctaFine: 'Free for 3 active packs. No sign-up.', whyH: 'How it works',
      w1: 'Add a student\'s pack: how many lessons, what they paid, how long it is valid.', w2: 'After each lesson, tap the next circle. The date goes on the stamp.', w3: 'When one is left, copy a ready-made renewal note. Pro: send a balance link the student can open.',
      f1h: 'Unearned money, visible', f1: 'See what students have paid for but not yet taken. Lapsed packs are listed, and what to do about them is your call.',
      f2h: 'Your data stays yours', f2: 'No account and no server. Back up to a file whenever you like.', f3h: 'Reads in your language', f3: 'English, 한국어, 日本語, 中文, Español, switched in one tap.',
      priceH: 'Pay once', free: 'Free', fr1: '3 active packs', fr2: 'Stamps, expiry, renewal notes', fr3: 'Backup and restore', proAmt: '$19 once',
      pr1: 'Unlimited packs', pr2: 'Balance links for students', pr3: 'CSV export', buy: 'Get Pro',
      priceFine: 'Price and checkout link are placeholders until payments are set up.', faqH: 'Questions',
      q1: 'What if I clear my browser data?', a1: 'The stamps go with it. Use Backup now and then, and restore from the file. Installing the page to your home screen does not change this.',
      q2: 'Does the balance link show my other students?', a2: 'No. The link carries one student\'s name, lesson dates and count, packed into the address itself. Anyone with the link can read it, so share it only with that student.',
      q3: 'Does it handle payments or reminders?', a3: 'No. It counts lessons and money already paid. It sends nothing for you.', priv: 'Privacy', foot: 'Made for people who teach.' },
    ko: { name: '한국어', app: '스탬프북', kick: '과외·레슨·PT 선생님을 위해', h1: '수업마다 도장 꾹. 횟수로 다툴 일 없습니다.',
      lede: '수강생이 10회권을 선결제했어요. 3주 뒤엔 6회 남았는지 7회 남았는지 아무도 기억 못 합니다. 스탬프북은 브라우저 안에 사는 스탬프 카드예요.',
      cta: '앱 열기', ctaFine: '진행 중인 수강권 3개까지 무료. 가입 없음.', whyH: '이렇게 써요',
      w1: '수강권을 등록합니다. 몇 회권인지, 얼마를 냈는지, 유효기간은 언제까지인지.', w2: '수업이 끝나면 다음 동그라미를 누릅니다. 날짜가 도장으로 찍혀요.', w3: '마지막 1회가 되면 재등록 안내문을 복사해 보내세요. Pro는 수강생이 직접 열어보는 잔여 링크도 보낼 수 있어요.',
      f1h: '아직 안 쓴 돈이 보여요', f1: '받았지만 아직 수업으로 소진하지 않은 금액을 봅니다. 기간이 지난 수강권도 따로 모아 보여주고, 어떻게 처리할지는 선생님이 정합니다.',
      f2h: '데이터는 내 것', f2: '가입도 서버도 없어요. 원할 때 파일로 백업하세요.', f3h: '내 언어로', f3: 'English, 한국어, 日本語, 中文, Español. 한 번에 전환.',
      priceH: '한 번만 결제', free: '무료', fr1: '진행 중 수강권 3개', fr2: '도장, 유효기간, 재등록 안내문', fr3: '백업과 복원', proAmt: '$19 (1회)',
      pr1: '수강권 무제한', pr2: '수강생용 잔여 링크', pr3: 'CSV 내보내기', buy: 'Pro 시작하기',
      priceFine: '가격과 결제 링크는 결제 연동 전까지 임시 값입니다.', faqH: '자주 묻는 질문',
      q1: '브라우저 데이터를 지우면요?', a1: '도장 기록도 같이 사라져요. 가끔 백업 파일을 받아 두고, 필요할 때 복원하세요. 홈 화면에 추가해도 마찬가지입니다.',
      q2: '잔여 링크에 다른 수강생 정보도 보이나요?', a2: '아니요. 링크에는 해당 수강생 한 명의 이름, 수업 날짜, 횟수만 주소 안에 담깁니다. 링크를 아는 사람은 누구나 볼 수 있으니 그 수강생에게만 보내세요.',
      q3: '결제나 알림도 해주나요?', a3: '아니요. 이미 받은 돈과 수업 횟수를 세어 줄 뿐, 대신 보내는 건 없습니다.', priv: '개인정보', foot: '가르치는 사람을 위해 만들었어요.' },
    ja: { name: '日本語', app: 'スタンプブック', kick: '先生・コーチ・インストラクター向け', h1: 'レッスンごとに一つ、押す。回数で揉めない。',
      lede: '生徒さんが10回分を前払い。三週間後には、残り6回か7回か誰も覚えていません。スタンプブックは、ブラウザの中にあるスタンプカードです。',
      cta: 'アプリを開く', ctaFine: '利用中の回数券3件まで無料。登録不要。', whyH: '使い方',
      w1: '回数券を登録します。回数、金額、有効期間。', w2: 'レッスンが終わったら次の丸をタップ。日付がスタンプになります。', w3: '残り1回になったら更新のご案内文をコピー。Proなら生徒さんが開ける残数リンクも送れます。',
      f1h: '未消化の金額が見える', f1: '受け取ったけれどまだ消化していない分が分かります。期限切れも別に並び、どう扱うかは先生が決めます。',
      f2h: 'データは自分のもの', f2: '登録もサーバーもありません。好きなときにファイルへバックアップ。', f3h: '自分の言語で', f3: 'English、한국어、日本語、中文、Español をワンタップで切替。',
      priceH: '支払いは一度だけ', free: '無料', fr1: '利用中の回数券3件', fr2: 'スタンプ、期限、更新のご案内', fr3: 'バックアップと復元', proAmt: '$19(買い切り)',
      pr1: '回数券 無制限', pr2: '生徒さん向け残数リンク', pr3: 'CSV書き出し', buy: 'Proにする',
      priceFine: '価格と購入リンクは、決済を設定するまで仮の値です。', faqH: 'よくある質問',
      q1: 'ブラウザのデータを消すと?', a1: 'スタンプも消えます。ときどきバックアップを保存し、必要なときに復元してください。ホーム画面に追加しても同じです。',
      q2: '残数リンクに他の生徒さんも載りますか?', a2: 'いいえ。リンクには一人分の名前、日付、回数だけがアドレスに入ります。リンクを知っていれば誰でも見られるので、その生徒さんにだけ送ってください。',
      q3: '決済やリマインドもしますか?', a3: 'いいえ。受け取り済みの金額と回数を数えるだけで、代わりに送信はしません。', priv: 'プライバシー', foot: '教える人のために。' },
    zh: { name: '中文', app: '印章本', kick: '给家教、教练和培训老师', h1: '上一节,盖一个章。课时数,不再扯皮。',
      lede: '学员预付了 10 节课。三周后,没人记得还剩 6 节还是 7 节。印章本就是一张住在浏览器里的集章卡。',
      cta: '打开应用', ctaFine: '进行中的课时包 3 个以内免费,无需注册。', whyH: '怎么用',
      w1: '登记学员的课时包:几节课、付了多少、有效期多久。', w2: '每上完一节,点下一个圆圈,日期就盖在章上。', w3: '只剩一节时,复制现成的续费提醒发给学员。Pro 还能发一个学员自己能打开的余额链接。',
      f1h: '看得见还没上的钱', f1: '已收到但尚未上完的部分一目了然。过期的课时包单独列出,怎么处理由你决定。',
      f2h: '数据属于你', f2: '不用注册,没有服务器。想备份就导出成文件。', f3h: '用你的语言', f3: 'English、한국어、日本語、中文、Español,一键切换。',
      priceH: '一次付清', free: '免费', fr1: '3 个进行中的课时包', fr2: '盖章、有效期、续费提醒', fr3: '备份与恢复', proAmt: '$19 一次',
      pr1: '课时包不限数量', pr2: '学员余额链接', pr3: '导出 CSV', buy: '升级 Pro',
      priceFine: '价格和购买链接在接入支付前仅为占位。', faqH: '常见问题',
      q1: '清除浏览器数据会怎样?', a1: '盖章记录也会一起消失。请时常备份,需要时从文件恢复。添加到主屏幕也一样。',
      q2: '余额链接会显示其他学员吗?', a2: '不会。链接里只有这一位学员的名字、上课日期和节数,直接编码在网址中。拿到链接的人都能看到,请只发给本人。',
      q3: '它能收款或自动提醒吗?', a3: '不能。它只负责记录已收的钱和课时,不会替你发送任何东西。', priv: '隐私', foot: '为教课的人而做。' },
    es: { name: 'Español', app: 'Sellos', kick: 'Para profesores particulares, entrenadores e instructores', h1: 'Cada clase, un sello. Nadie discute la cuenta.',
      lede: 'Tu alumno paga 10 clases por adelantado. Tres semanas después nadie recuerda si quedaban 6 o 7. Sellos es una tarjeta de sellos que vive en tu navegador.',
      cta: 'Abrir la app', ctaFine: 'Gratis con 3 bonos activos. Sin registro.', whyH: 'Cómo funciona',
      w1: 'Añade el bono de un alumno: cuántas clases, cuánto pagó y hasta cuándo vale.', w2: 'Al terminar cada clase, toca el siguiente círculo. La fecha queda en el sello.', w3: 'Cuando quede una, copia un aviso de renovación ya redactado. Con Pro, envía un enlace de saldo que el alumno puede abrir.',
      f1h: 'El dinero aún no ganado, a la vista', f1: 'Mira lo que tus alumnos han pagado y todavía no han tomado. Los bonos caducados salen aparte y tú decides qué hacer con ellos.',
      f2h: 'Tus datos son tuyos', f2: 'Sin cuenta ni servidor. Haz copia a un archivo cuando quieras.', f3h: 'En tu idioma', f3: 'English, 한국어, 日本語, 中文, Español, con un toque.',
      priceH: 'Se paga una vez', free: 'Gratis', fr1: '3 bonos activos', fr2: 'Sellos, caducidad, avisos de renovación', fr3: 'Copia y restauración', proAmt: '$19 una vez',
      pr1: 'Bonos ilimitados', pr2: 'Enlaces de saldo para alumnos', pr3: 'Exportar CSV', buy: 'Obtener Pro',
      priceFine: 'El precio y el enlace de compra son provisionales hasta configurar los pagos.', faqH: 'Preguntas',
      q1: '¿Y si borro los datos del navegador?', a1: 'Los sellos se van con ellos. Haz copias de vez en cuando y restaura desde el archivo. Añadirla a la pantalla de inicio no cambia esto.',
      q2: '¿El enlace de saldo muestra a mis otros alumnos?', a2: 'No. El enlace lleva solo el nombre, las fechas y el número de clases de un alumno, dentro de la propia dirección. Cualquiera con el enlace puede leerlo; envíaselo solo a esa persona.',
      q3: '¿Gestiona cobros o recordatorios?', a3: 'No. Cuenta clases y dinero ya cobrado. No envía nada por ti.', priv: 'Privacidad', foot: 'Hecha para quien enseña.' }
  };
  var sel = document.getElementById('lang'), keys = Object.keys(D);
  var saved; try { saved = localStorage.getItem('sb.landing.lang'); } catch (e) {}
  var cur = [saved, navigator.language].map(function (x) { return String(x || '').slice(0, 2).toLowerCase(); }).filter(function (x) { return D[x]; })[0] || 'en';
  keys.forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = D[k].name; sel.appendChild(o); });
  function apply(l) {
    cur = l; sel.value = l; document.documentElement.lang = l;
    document.querySelectorAll('[data-i]').forEach(function (e) { e.textContent = D[l][e.dataset.i]; });
    document.title = D[l].app + ' · ' + D[l].h1;
    try { localStorage.setItem('sb.landing.lang', l); } catch (e) {}
  }
  sel.addEventListener('change', function () { apply(sel.value); });
  apply(cur);
})();
