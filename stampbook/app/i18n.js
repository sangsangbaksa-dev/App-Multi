/* 5 languages. Placeholders: {n} {d} {name} {t} {date} {left} {max} */
(function (root) {
  var L = {
    en: {
      name: 'English', app: 'Stampbook', tag: 'Every lesson stamped. Nobody argues about the count.',
      newPack: 'New pack', student: 'Student', lessons: 'Lessons in pack', price: 'Pack price', currency: 'Currency',
      start: 'Paid on', valid: 'Valid for (months, 0 = no expiry)', save: 'Save', cancel: 'Cancel',
      stampToday: 'Stamp today', stampOther: 'Another date', left: '{n} left', of: 'of {n} used',
      expIn: 'Expires in {d} days', expToday: 'Expires today', expOn: 'Expired {date}', noExp: 'No expiry',
      s_active: 'Active', s_low: 'Last lesson', s_done: 'Complete', s_expired: 'Expired',
      thisMonth: 'This month', given: 'Lessons given', earned: 'Earned', owed: 'Still owed in lessons',
      emptyH: 'No packs yet', emptyB: 'Add a student\'s prepaid pack. Tap a circle each time you teach. That is the whole app.',
      share: 'Balance link', renew: 'Renewal note', copied: 'Copied', del: 'Delete pack',
      confDel: 'Delete this pack and its stamps? This cannot be undone.', confStamp: 'Remove this stamp?',
      limit: 'The free version holds {max} active packs. Pro removes the limit.', upgrade: 'Get Pro',
      teacher: 'Your name (shown on balance links)', exp: 'Back up', imp: 'Restore', csv: 'CSV (Pro)',
      lic: 'Licence key', licPh: 'SB-XXXX-XXXX-XXX', activate: 'Activate', badKey: 'That key is not valid.',
      okKey: 'Pro unlocked on this device.', pro: 'Pro', proOnly: 'This is a Pro feature.',
      lapsedH: 'Expired with lessons left', lapsedB: 'These students paid for lessons they did not take. Whether to honour them is your policy; Stampbook only shows them.',
      cardH: 'Lesson balance', cardFrom: 'from {t}', cardLeft: '{n} of {total} lessons left', cardNote: 'This page is a snapshot made by your teacher. It works offline and stores nothing.',
      cardTaken: 'Lessons taken', privacy: 'Everything stays in this browser. No account, no server, no tracking.',
      renewMsg: 'Hi {name}, your pack has {n} lesson(s) left{exp}. If you would like to continue, let me know and I will set up the next one.',
      renewExp: ', valid until {date}', backupDone: 'Backup downloaded.', badFile: 'That file could not be read.', restored: 'Restored.',
      linkCopied: 'Balance link copied. Send it to the student.', lang: 'Language'
    },
    ko: {
      name: '한국어', app: '스탬프북', tag: '수업마다 도장 꾹. 횟수로 다툴 일 없습니다.',
      newPack: '수강권 추가', student: '수강생', lessons: '수강권 횟수', price: '수강권 금액', currency: '통화',
      start: '결제일', valid: '유효기간(개월, 0이면 무제한)', save: '저장', cancel: '취소',
      stampToday: '오늘 도장', stampOther: '다른 날짜', left: '{n}회 남음', of: '{n}회 중 사용',
      expIn: '{d}일 후 만료', expToday: '오늘 만료', expOn: '{date} 만료됨', noExp: '기한 없음',
      s_active: '진행 중', s_low: '마지막 1회', s_done: '소진', s_expired: '기간 만료',
      thisMonth: '이번 달', given: '진행한 수업', earned: '수업으로 인정되는 금액', owed: '아직 드려야 할 수업',
      emptyH: '아직 수강권이 없어요', emptyB: '수강생이 선결제한 수강권을 등록하고, 수업할 때마다 동그라미를 누르세요. 이게 전부입니다.',
      share: '잔여 횟수 링크', renew: '재등록 안내문', copied: '복사했어요', del: '수강권 삭제',
      confDel: '이 수강권과 도장 기록을 삭제할까요? 되돌릴 수 없어요.', confStamp: '이 도장을 지울까요?',
      limit: '무료 버전은 진행 중인 수강권 {max}개까지예요. Pro는 제한이 없습니다.', upgrade: 'Pro 시작하기',
      teacher: '내 이름(잔여 링크에 표시)', exp: '백업', imp: '복원', csv: 'CSV (Pro)',
      lic: '라이선스 키', licPh: 'SB-XXXX-XXXX-XXX', activate: '활성화', badKey: '유효하지 않은 키예요.',
      okKey: '이 기기에서 Pro가 열렸어요.', pro: 'Pro', proOnly: 'Pro 기능이에요.',
      lapsedH: '횟수가 남은 채 만료', lapsedB: '결제하고 듣지 못한 수업이에요. 인정해 줄지는 선생님의 기준에 달렸고, 스탬프북은 보여주기만 합니다.',
      cardH: '수강권 잔여', cardFrom: '{t}', cardLeft: '{total}회 중 {n}회 남음', cardNote: '선생님이 만든 현재 시점의 기록입니다. 오프라인에서도 열리고 아무것도 저장하지 않아요.',
      cardTaken: '들은 수업', privacy: '모든 데이터는 이 브라우저에만 있어요. 가입도, 서버도, 추적도 없습니다.',
      renewMsg: '{name}님, 수강권이 {n}회 남았어요{exp}. 이어서 하시려면 말씀해 주세요. 다음 수강권 준비해 둘게요.',
      renewExp: '(유효기간 {date}까지)', backupDone: '백업 파일을 내려받았어요.', badFile: '파일을 읽을 수 없어요.', restored: '복원했어요.',
      linkCopied: '잔여 링크를 복사했어요. 수강생에게 보내세요.', lang: '언어'
    },
    ja: {
      name: '日本語', app: 'スタンプブック', tag: 'レッスンごとに一つ、押す。回数で揉めない。',
      newPack: '回数券を追加', student: '生徒さん', lessons: '回数', price: '回数券の金額', currency: '通貨',
      start: '入金日', valid: '有効期間(か月、0で無期限)', save: '保存', cancel: 'キャンセル',
      stampToday: '今日の分を押す', stampOther: '別の日付', left: 'あと{n}回', of: '{n}回中 消化',
      expIn: 'あと{d}日で期限', expToday: '本日が期限', expOn: '{date}に期限切れ', noExp: '期限なし',
      s_active: '利用中', s_low: '残り1回', s_done: '消化済み', s_expired: '期限切れ',
      thisMonth: '今月', given: '実施レッスン', earned: '消化分の売上', owed: '未消化(お預かり)分',
      emptyH: 'まだ回数券がありません', emptyB: '前払いの回数券を登録して、教えるたびに丸をタップ。使い方はそれだけです。',
      share: '残数リンク', renew: '更新のご案内', copied: 'コピーしました', del: '回数券を削除',
      confDel: 'この回数券と記録を削除しますか。元に戻せません。', confStamp: 'このスタンプを消しますか。',
      limit: '無料版は利用中の回数券{max}件までです。Proなら無制限です。', upgrade: 'Proにする',
      teacher: 'お名前(残数リンクに表示)', exp: 'バックアップ', imp: '復元', csv: 'CSV (Pro)',
      lic: 'ライセンスキー', licPh: 'SB-XXXX-XXXX-XXX', activate: '有効化', badKey: 'キーが正しくありません。',
      okKey: 'この端末でProが有効になりました。', pro: 'Pro', proOnly: 'Proの機能です。',
      lapsedH: '期限切れで未消化', lapsedB: '支払い済みで受けられなかった分です。どう扱うかは先生の方針次第で、スタンプブックは表示するだけです。',
      cardH: '回数券の残り', cardFrom: '{t}', cardLeft: '{total}回中 あと{n}回', cardNote: 'このページは先生が作った現時点の記録です。オフラインでも開け、何も保存しません。',
      cardTaken: '受講済み', privacy: 'データはこのブラウザの中だけ。登録もサーバーも追跡もありません。',
      renewMsg: '{name}さん、回数券が残り{n}回になりました{exp}。続けられる場合はお知らせください。次の分を用意します。',
      renewExp: '(有効期限 {date})', backupDone: 'バックアップを保存しました。', badFile: 'ファイルを読み込めませんでした。', restored: '復元しました。',
      linkCopied: '残数リンクをコピーしました。生徒さんに送ってください。', lang: '言語'
    },
    zh: {
      name: '中文', app: '印章本', tag: '上一节,盖一个章。课时数,不再扯皮。',
      newPack: '新增课时包', student: '学员', lessons: '课时数', price: '课时包价格', currency: '币种',
      start: '付款日', valid: '有效期(月,0 为不限)', save: '保存', cancel: '取消',
      stampToday: '今天盖章', stampOther: '其他日期', left: '剩 {n} 节', of: '已上 {n} 节',
      expIn: '{d} 天后到期', expToday: '今天到期', expOn: '{date} 已过期', noExp: '无期限',
      s_active: '进行中', s_low: '最后一节', s_done: '已上完', s_expired: '已过期',
      thisMonth: '本月', given: '已上课时', earned: '已确认收入', owed: '尚欠学员的课时价值',
      emptyH: '还没有课时包', emptyB: '登记学员预付的课时包,每上一节课点一个圆圈。就这么简单。',
      share: '余额链接', renew: '续费提醒', copied: '已复制', del: '删除课时包',
      confDel: '删除这个课时包和全部盖章记录?无法恢复。', confStamp: '撤销这个章?',
      limit: '免费版最多 {max} 个进行中的课时包。Pro 无限制。', upgrade: '升级 Pro',
      teacher: '你的名字(显示在余额链接上)', exp: '备份', imp: '恢复', csv: 'CSV (Pro)',
      lic: '授权码', licPh: 'SB-XXXX-XXXX-XXX', activate: '激活', badKey: '授权码无效。',
      okKey: '此设备已解锁 Pro。', pro: 'Pro', proOnly: '这是 Pro 功能。',
      lapsedH: '已过期但还有剩余课时', lapsedB: '这些学员付了费却没上完。认不认账是你的规矩,印章本只负责列出来。',
      cardH: '课时余额', cardFrom: '{t}', cardLeft: '共 {total} 节,剩 {n} 节', cardNote: '这是老师生成的当前快照,可离线打开,不保存任何内容。',
      cardTaken: '已上课', privacy: '数据只存在这个浏览器里。无需注册,没有服务器,不做追踪。',
      renewMsg: '{name}你好,你的课时包还剩 {n} 节{exp}。如果想继续,告诉我一声,我来安排下一个。',
      renewExp: '(有效期至 {date})', backupDone: '备份已下载。', badFile: '无法读取该文件。', restored: '已恢复。',
      linkCopied: '余额链接已复制,发给学员即可。', lang: '语言'
    },
    es: {
      name: 'Español', app: 'Sellos', tag: 'Cada clase, un sello. Nadie discute la cuenta.',
      newPack: 'Nuevo bono', student: 'Alumno', lessons: 'Clases del bono', price: 'Precio del bono', currency: 'Moneda',
      start: 'Pagado el', valid: 'Validez (meses, 0 = sin caducidad)', save: 'Guardar', cancel: 'Cancelar',
      stampToday: 'Sellar hoy', stampOther: 'Otra fecha', left: 'Quedan {n}', of: '{n} usadas',
      expIn: 'Caduca en {d} días', expToday: 'Caduca hoy', expOn: 'Caducó el {date}', noExp: 'Sin caducidad',
      s_active: 'Activo', s_low: 'Última clase', s_done: 'Completo', s_expired: 'Caducado',
      thisMonth: 'Este mes', given: 'Clases dadas', earned: 'Ingreso devengado', owed: 'Clases aún debidas',
      emptyH: 'Aún no hay bonos', emptyB: 'Añade el bono prepagado de un alumno y toca un círculo cada vez que des clase. Eso es todo.',
      share: 'Enlace de saldo', renew: 'Aviso de renovación', copied: 'Copiado', del: 'Eliminar bono',
      confDel: '¿Eliminar este bono y sus sellos? No se puede deshacer.', confStamp: '¿Quitar este sello?',
      limit: 'La versión gratuita admite {max} bonos activos. Pro quita el límite.', upgrade: 'Obtener Pro',
      teacher: 'Tu nombre (aparece en el enlace de saldo)', exp: 'Copia', imp: 'Restaurar', csv: 'CSV (Pro)',
      lic: 'Clave de licencia', licPh: 'SB-XXXX-XXXX-XXX', activate: 'Activar', badKey: 'Esa clave no es válida.',
      okKey: 'Pro desbloqueado en este dispositivo.', pro: 'Pro', proOnly: 'Función Pro.',
      lapsedH: 'Caducados con clases sin usar', lapsedB: 'Estos alumnos pagaron clases que no tomaron. Honrarlas o no es tu política; Sellos solo las muestra.',
      cardH: 'Saldo de clases', cardFrom: 'de {t}', cardLeft: 'Quedan {n} de {total} clases', cardNote: 'Esta página es una foto del estado actual hecha por tu profesor. Funciona sin conexión y no guarda nada.',
      cardTaken: 'Clases tomadas', privacy: 'Todo se queda en este navegador. Sin cuenta, sin servidor, sin rastreo.',
      renewMsg: 'Hola {name}, a tu bono le quedan {n} clase(s){exp}. Si quieres seguir, dímelo y preparo el siguiente.',
      renewExp: ', válido hasta {date}', backupDone: 'Copia descargada.', badFile: 'No se pudo leer el archivo.', restored: 'Restaurado.',
      linkCopied: 'Enlace copiado. Envíaselo al alumno.', lang: 'Idioma'
    }
  };
  function pick(pref) {
    var c = [pref, (typeof navigator !== 'undefined' && navigator.language) || 'en'];
    for (var i = 0; i < c.length; i++) { var k = String(c[i] || '').slice(0, 2).toLowerCase(); if (L[k]) return k; }
    return 'en';
  }
  function t(lang, key, vars) {
    var s = (L[lang] && L[lang][key]) != null ? L[lang][key] : (L.en[key] != null ? L.en[key] : key);
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  var API = { L: L, pick: pick, t: t, langs: Object.keys(L) };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.I18N = API;
})(typeof window !== 'undefined' ? window : globalThis);
