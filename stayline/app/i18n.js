/* 5 languages. Placeholders: {n} {u} {l} {date} {end} {max} {name} */
(function (root) {
  var L = {
    en: {
      name: 'English', unitLeft: 'days left', unitOver: 'days over', app: 'Stayline', tag: 'How many days do I have left? One answer, no account.',
      newTracker: 'New counter', trackerName: 'Whose days?', namePh: 'Me', rule: 'Rule',
      r_schengen: 'Schengen: 90 days in any 180', r_tax183: 'Tax residency: 183 days a year', r_custom: 'Custom rolling window', r_customYear: 'Custom calendar-year limit',
      limit: 'Days allowed', window: 'In any … days', save: 'Save', cancel: 'Cancel', del: 'Delete counter',
      confDel: 'Delete this counter and all its trips? This cannot be undone.', confTrip: 'Remove this trip?',
      addTrip: 'Add a trip', place: 'Where (optional)', from: 'First day inside', to: 'Last day inside', ongoing: 'I am still there',
      leftToday: 'Mark as left today', trips: 'Trips', noTrips: 'No trips yet. Add the days you were inside, past or planned.',
      daysLeft: '{n} days left', dayLeft: '1 day left', daysOver: '{n} days over', dayOver: '1 day over', usedOf: '{u} of {l} days used',
      s_ok: 'Plenty of room', s_tight: 'Getting tight', s_over: 'Over the limit',
      from_win: 'Counting from {date}', inside: 'You are inside today', freeOn: 'Room again from {date}',
      planH: 'Plan a trip', arrive: 'Arriving on', nights: 'For how many days', planMax: 'Arriving {date}, you can stay up to {n} days (until {end}).',
      planNone: 'Arriving that day already breaks the limit.', planEarly: 'Earliest arrival for {n} days: {date}.',
      planNoEarly: '{n} days is more than this rule ever allows.', planNow: 'You can arrive right away.',
      emptyH: 'Nothing counted yet', emptyB: 'Start a counter, add the days you spent inside, and Stayline tells you what is left and when you can come back.',
      limitMsg: 'The free version has {max} counter. Pro adds as many as you need (a partner, a second rule).', upgrade: 'Get Pro',
      exp: 'Back up', imp: 'Restore', csv: 'CSV (Pro)', print: 'Print summary (Pro)',
      lic: 'Licence key', licPh: 'SL-XXXX-XXXX-XXX', activate: 'Activate', badKey: 'That key is not valid.', okKey: 'Pro unlocked on this device.', pro: 'Pro', proOnly: 'This is a Pro feature.',
      disclaimer: 'An estimate from the dates you enter. First and last day count as full days. Border officers and official sources decide, not this page.',
      privacy: 'Everything stays in this browser. No account, no location access, no server.', backupDone: 'Backup downloaded.', badFile: 'That file could not be read.', restored: 'Restored.',
      badTrip: 'Check the dates: the last day cannot be before the first.', lang: 'Language', today: 'today', printTitle: 'Days inside'
    },
    ko: {
      name: '한국어', unitLeft: '일 남음', unitOver: '일 초과', app: '스테이라인', tag: '체류 가능 일수, 한 번에 확인. 계정은 필요 없습니다.',
      newTracker: '카운터 추가', trackerName: '누구의 일수인가요?', namePh: '나', rule: '규칙',
      r_schengen: '솅겐: 180일 중 90일', r_tax183: '세법상 거주자: 연 183일', r_custom: '직접 입력(기간 이동)', r_customYear: '직접 입력(달력 기준 연간)',
      limit: '허용 일수', window: '최근 … 일 중', save: '저장', cancel: '취소', del: '카운터 삭제',
      confDel: '이 카운터와 모든 체류 기록을 삭제할까요? 되돌릴 수 없습니다.', confTrip: '이 체류 기록을 지울까요?',
      addTrip: '체류 기록 추가', place: '장소(선택)', from: '입국한 첫날', to: '출국한 마지막 날', ongoing: '지금도 체류 중',
      leftToday: '오늘 떠났음으로 표시', trips: '체류 기록', noTrips: '아직 기록이 없습니다. 지난 체류와 예정된 체류를 넣어 보세요.',
      daysLeft: '{n}일 남음', dayLeft: '1일 남음', daysOver: '{n}일 초과', dayOver: '1일 초과', usedOf: '{l}일 중 {u}일 사용',
      s_ok: '여유 있음', s_tight: '빠듯함', s_over: '한도 초과',
      from_win: '{date}부터 집계', inside: '오늘 체류 중입니다', freeOn: '{date}부터 다시 여유가 생깁니다',
      planH: '여행 계획', arrive: '입국일', nights: '머무를 일수', planMax: '{date}에 입국하면 최대 {n}일, {end}까지 머물 수 있습니다.',
      planNone: '그날 들어가면 이미 한도를 넘습니다.', planEarly: '{n}일 체류를 위한 가장 빠른 입국일: {date}.',
      planNoEarly: '{n}일은 이 규칙이 허용하는 최대치보다 깁니다.', planNow: '바로 입국해도 됩니다.',
      emptyH: '아직 센 날이 없어요', emptyB: '카운터를 만들고 머문 날을 넣으면, 남은 일수와 다시 들어갈 수 있는 날짜를 알려 드립니다.',
      limitMsg: '무료 버전은 카운터 {max}개입니다. Pro는 동반자나 다른 규칙용 카운터를 제한 없이 만들 수 있습니다.', upgrade: 'Pro 받기',
      exp: '백업', imp: '복원', csv: 'CSV (Pro)', print: '요약 인쇄 (Pro)',
      lic: '라이선스 키', licPh: 'SL-XXXX-XXXX-XXX', activate: '활성화', badKey: '유효하지 않은 키입니다.', okKey: '이 기기에서 Pro가 열렸습니다.', pro: 'Pro', proOnly: 'Pro 기능입니다.',
      disclaimer: '입력한 날짜로 계산한 추정치입니다. 입국일과 출국일은 모두 하루로 셉니다. 최종 판단은 이 페이지가 아니라 출입국 심사관과 공식 자료가 합니다.',
      privacy: '모든 데이터는 이 브라우저에만 저장됩니다. 계정도, 위치 권한도, 서버도 없습니다.', backupDone: '백업을 내려받았습니다.', badFile: '파일을 읽을 수 없습니다.', restored: '복원했습니다.',
      badTrip: '날짜를 확인하세요. 마지막 날이 첫날보다 빠를 수 없습니다.', lang: '언어', today: '오늘', printTitle: '체류 일수'
    },
    ja: {
      name: '日本語', unitLeft: '日 残り', unitOver: '日 超過', app: 'ステイライン', tag: '滞在できる残り日数を、ひと目で。アカウント不要。',
      newTracker: 'カウンターを追加', trackerName: '誰の日数？', namePh: '自分', rule: 'ルール',
      r_schengen: 'シェンゲン：180日のうち90日', r_tax183: '税務上の居住者：年183日', r_custom: 'カスタム（移動する期間）', r_customYear: 'カスタム（暦年の上限）',
      limit: '許可日数', window: '直近…日のうち', save: '保存', cancel: 'キャンセル', del: 'カウンターを削除',
      confDel: 'このカウンターと滞在記録をすべて削除しますか？元に戻せません。', confTrip: 'この滞在記録を削除しますか？',
      addTrip: '滞在を追加', place: '場所（任意）', from: '入った初日', to: '出た最終日', ongoing: '現在も滞在中',
      leftToday: '今日出国したことにする', trips: '滞在記録', noTrips: 'まだ記録がありません。過去の滞在や予定を入れてください。',
      daysLeft: '残り{n}日', dayLeft: '残り1日', daysOver: '{n}日超過', dayOver: '1日超過', usedOf: '{l}日中{u}日使用',
      s_ok: '余裕あり', s_tight: 'そろそろ厳しい', s_over: '上限超過',
      from_win: '{date}から集計', inside: '今日は滞在中です', freeOn: '{date}から再び余裕ができます',
      planH: '旅行を計画', arrive: '入国日', nights: '滞在日数', planMax: '{date}に入国すると、最大{n}日（{end}まで）滞在できます。',
      planNone: 'その日に入ると、すでに上限を超えます。', planEarly: '{n}日滞在できる最短の入国日：{date}。',
      planNoEarly: '{n}日はこのルールの上限を超えています。', planNow: 'すぐに入国できます。',
      emptyH: 'まだ数えていません', emptyB: 'カウンターを作って滞在日を入れると、残り日数と再入国できる日がわかります。',
      limitMsg: '無料版はカウンター{max}個までです。Proならパートナー用や別ルール用にいくつでも作れます。', upgrade: 'Proを入手',
      exp: 'バックアップ', imp: '復元', csv: 'CSV（Pro）', print: '概要を印刷（Pro）',
      lic: 'ライセンスキー', licPh: 'SL-XXXX-XXXX-XXX', activate: '有効化', badKey: 'このキーは無効です。', okKey: 'この端末でProが有効になりました。', pro: 'Pro', proOnly: 'Pro機能です。',
      disclaimer: '入力した日付からの目安です。入国日と出国日はどちらも1日として数えます。最終的な判断は、このページではなく入国審査官と公的情報によります。',
      privacy: 'データはこのブラウザの中だけに保存されます。アカウントも位置情報もサーバーもありません。', backupDone: 'バックアップを保存しました。', badFile: 'ファイルを読み込めません。', restored: '復元しました。',
      badTrip: '日付を確認してください。最終日は初日より前にできません。', lang: '言語', today: '今日', printTitle: '滞在日数'
    },
    zh: {
      name: '中文', unitLeft: '天 剩余', unitOver: '天 超出', app: '停留线', tag: '还能待几天？一眼看清，无需账号。',
      newTracker: '新建计数器', trackerName: '谁的天数？', namePh: '我', rule: '规则',
      r_schengen: '申根：任意180天内90天', r_tax183: '税务居民：每年183天', r_custom: '自定义（滚动窗口）', r_customYear: '自定义（自然年上限）',
      limit: '允许天数', window: '任意…天内', save: '保存', cancel: '取消', del: '删除计数器',
      confDel: '删除此计数器及其全部行程？无法撤销。', confTrip: '删除这条行程？',
      addTrip: '添加行程', place: '地点（可选）', from: '入境第一天', to: '离境最后一天', ongoing: '我仍在当地',
      leftToday: '标记为今天离开', trips: '行程', noTrips: '还没有行程。请填入已停留或计划停留的日期。',
      daysLeft: '还剩{n}天', dayLeft: '还剩1天', daysOver: '超出{n}天', dayOver: '超出1天', usedOf: '{l}天中已用{u}天',
      s_ok: '余量充足', s_tight: '快用完了', s_over: '已超限',
      from_win: '自{date}起统计', inside: '今天你在境内', freeOn: '自{date}起恢复余量',
      planH: '规划行程', arrive: '入境日期', nights: '停留天数', planMax: '{date}入境，最多可停留{n}天（至{end}）。',
      planNone: '那天入境就已经超限。', planEarly: '停留{n}天的最早入境日：{date}。',
      planNoEarly: '{n}天超过了此规则的上限。', planNow: '现在就可以入境。',
      emptyH: '还没有计数', emptyB: '新建计数器，填入已停留的日期，停留线会告诉你还剩几天、何时可以再入境。',
      limitMsg: '免费版只有{max}个计数器。Pro 可为伴侣或另一套规则建立任意数量。', upgrade: '获取 Pro',
      exp: '备份', imp: '恢复', csv: 'CSV（Pro）', print: '打印摘要（Pro）',
      lic: '授权密钥', licPh: 'SL-XXXX-XXXX-XXX', activate: '激活', badKey: '密钥无效。', okKey: '此设备已解锁 Pro。', pro: 'Pro', proOnly: '这是 Pro 功能。',
      disclaimer: '根据你填写的日期估算。入境当天和离境当天都按整天计算。最终以边检人员和官方信息为准，而非本页面。',
      privacy: '所有数据只保存在此浏览器中。没有账号，不读取位置，没有服务器。', backupDone: '备份已下载。', badFile: '无法读取该文件。', restored: '已恢复。',
      badTrip: '请检查日期：最后一天不能早于第一天。', lang: '语言', today: '今天', printTitle: '停留天数'
    },
    es: {
      name: 'Español', unitLeft: 'días restantes', unitOver: 'días de más', app: 'Stayline', tag: '¿Cuántos días me quedan? Una respuesta, sin cuenta.',
      newTracker: 'Nuevo contador', trackerName: '¿De quién son los días?', namePh: 'Yo', rule: 'Regla',
      r_schengen: 'Schengen: 90 días en cualquier 180', r_tax183: 'Residencia fiscal: 183 días al año', r_custom: 'Ventana móvil personalizada', r_customYear: 'Límite anual personalizado',
      limit: 'Días permitidos', window: 'En cualquier … días', save: 'Guardar', cancel: 'Cancelar', del: 'Eliminar contador',
      confDel: '¿Eliminar este contador y todos sus viajes? No se puede deshacer.', confTrip: '¿Quitar este viaje?',
      addTrip: 'Añadir viaje', place: 'Dónde (opcional)', from: 'Primer día dentro', to: 'Último día dentro', ongoing: 'Sigo allí',
      leftToday: 'Marcar que salí hoy', trips: 'Viajes', noTrips: 'Aún no hay viajes. Añade los días que pasaste dentro, pasados o previstos.',
      daysLeft: 'Quedan {n} días', dayLeft: 'Queda 1 día', daysOver: '{n} días de más', dayOver: '1 día de más', usedOf: '{u} de {l} días usados',
      s_ok: 'Hay margen', s_tight: 'Va justo', s_over: 'Límite superado',
      from_win: 'Contando desde {date}', inside: 'Hoy estás dentro', freeOn: 'Vuelve a haber margen desde el {date}',
      planH: 'Planear un viaje', arrive: 'Llegada', nights: 'Cuántos días', planMax: 'Llegando el {date}, puedes quedarte hasta {n} días (hasta el {end}).',
      planNone: 'Llegar ese día ya supera el límite.', planEarly: 'Llegada más temprana para {n} días: {date}.',
      planNoEarly: '{n} días es más de lo que esta regla permite.', planNow: 'Puedes llegar ya.',
      emptyH: 'Aún no hay nada contado', emptyB: 'Crea un contador, añade los días que pasaste dentro y Stayline te dice cuánto queda y cuándo puedes volver.',
      limitMsg: 'La versión gratuita incluye {max} contador. Pro permite los que necesites (pareja, otra regla).', upgrade: 'Obtener Pro',
      exp: 'Copia', imp: 'Restaurar', csv: 'CSV (Pro)', print: 'Imprimir resumen (Pro)',
      lic: 'Clave de licencia', licPh: 'SL-XXXX-XXXX-XXX', activate: 'Activar', badKey: 'Esa clave no es válida.', okKey: 'Pro desbloqueado en este dispositivo.', pro: 'Pro', proOnly: 'Función Pro.',
      disclaimer: 'Estimación a partir de las fechas que introduces. El primer y el último día cuentan completos. Deciden los agentes de frontera y las fuentes oficiales, no esta página.',
      privacy: 'Todo se queda en este navegador. Sin cuenta, sin ubicación, sin servidor.', backupDone: 'Copia descargada.', badFile: 'No se pudo leer el archivo.', restored: 'Restaurado.',
      badTrip: 'Revisa las fechas: el último día no puede ser anterior al primero.', lang: 'Idioma', today: 'hoy', printTitle: 'Días dentro'
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
