/* Strings for the optional cloud sync panel, 5 languages. Placeholders: {email} {time}. Copied into each app by shared/sync-copies.js. */
(function (root) {
  var S = {
    en: {
      title: 'Cloud backup (optional)', note: 'Off by default. Log in to keep a copy of your data in the cloud and use it on another device. Without logging in, nothing leaves this device.',
      email: 'Email', pass: 'Password (8+ characters)', signIn: 'Log in', signUp: 'Create account', toUp: 'New here? Create an account', toIn: 'Already have an account? Log in',
      signOut: 'Log out', syncNow: 'Sync now', as: 'Signed in as {email}', last: 'Last synced {time}', never: 'Not synced yet',
      inSync: 'Already up to date.', pushed: 'Saved to the cloud.', pulled: 'Loaded the newer cloud copy.', offline: 'No connection. Your data on this device is safe.', error: 'Sync did not work. Try again later.',
      conflict: 'This device and the cloud both changed. Which one should win?', useCloud: 'Use the cloud copy', useDevice: 'Use this device',
      errEmail: 'Enter a valid email address.', errShort: 'The password needs at least 8 characters.', errExists: 'An account with this email already exists. Log in instead.',
      errBad: 'Email or password is not right.', errConfirm: 'Confirm your email first (check your inbox), then log in.', errRate: 'Too many tries. Wait a minute.',
      confirmSent: 'Account created. Open the link in the email we sent, then log in.', close: 'Close', open: 'Cloud'
    },
    ko: {
      title: '클라우드 백업 (선택)', note: '기본은 꺼져 있습니다. 로그인하면 데이터 사본을 클라우드에 보관하고 다른 기기에서도 쓸 수 있습니다. 로그인하지 않으면 데이터는 이 기기를 떠나지 않습니다.',
      email: '이메일', pass: '비밀번호 (8자 이상)', signIn: '로그인', signUp: '계정 만들기', toUp: '처음이신가요? 계정 만들기', toIn: '계정이 있나요? 로그인',
      signOut: '로그아웃', syncNow: '지금 동기화', as: '{email} 계정으로 로그인됨', last: '마지막 동기화 {time}', never: '아직 동기화하지 않음',
      inSync: '이미 최신 상태입니다.', pushed: '클라우드에 저장했어요.', pulled: '더 최신인 클라우드 사본을 불러왔어요.', offline: '연결이 없습니다. 이 기기의 데이터는 안전합니다.', error: '동기화에 실패했어요. 나중에 다시 시도해 주세요.',
      conflict: '이 기기와 클라우드가 모두 바뀌었습니다. 어느 쪽을 쓸까요?', useCloud: '클라우드 사본 사용', useDevice: '이 기기 데이터 사용',
      errEmail: '올바른 이메일을 입력하세요.', errShort: '비밀번호는 8자 이상이어야 합니다.', errExists: '이미 이 이메일로 된 계정이 있습니다. 로그인해 주세요.',
      errBad: '이메일 또는 비밀번호가 맞지 않습니다.', errConfirm: '먼저 이메일 인증을 해 주세요(받은편지함 확인). 그다음 로그인하세요.', errRate: '시도가 너무 많습니다. 잠시 후 다시 해 주세요.',
      confirmSent: '계정을 만들었어요. 보낸 메일의 링크를 열고 로그인해 주세요.', close: '닫기', open: '클라우드'
    },
    ja: {
      title: 'クラウドバックアップ（任意）', note: '初期設定ではオフです。ログインすると、データのコピーをクラウドに保存して他の端末でも使えます。ログインしなければデータはこの端末の外に出ません。',
      email: 'メールアドレス', pass: 'パスワード（8文字以上）', signIn: 'ログイン', signUp: 'アカウント作成', toUp: '初めての方：アカウント作成', toIn: 'アカウントをお持ちの方：ログイン',
      signOut: 'ログアウト', syncNow: '今すぐ同期', as: '{email} でログイン中', last: '最終同期 {time}', never: '未同期',
      inSync: 'すでに最新です。', pushed: 'クラウドに保存しました。', pulled: '新しいクラウドのデータを読み込みました。', offline: '接続がありません。この端末のデータは安全です。', error: '同期できませんでした。後でもう一度お試しください。',
      conflict: 'この端末とクラウドの両方が変更されています。どちらを使いますか？', useCloud: 'クラウドを使う', useDevice: 'この端末を使う',
      errEmail: '正しいメールアドレスを入力してください。', errShort: 'パスワードは8文字以上にしてください。', errExists: 'このメールのアカウントは既にあります。ログインしてください。',
      errBad: 'メールまたはパスワードが違います。', errConfirm: '先にメールの確認を済ませてからログインしてください。', errRate: '試行が多すぎます。少し待ってください。',
      confirmSent: 'アカウントを作成しました。届いたメールのリンクを開いてからログインしてください。', close: '閉じる', open: 'クラウド'
    },
    zh: {
      title: '云备份（可选）', note: '默认关闭。登录后可在云端保存一份数据副本，并在其他设备上使用。不登录时，数据不会离开此设备。',
      email: '邮箱', pass: '密码（至少8位）', signIn: '登录', signUp: '创建账号', toUp: '新用户？创建账号', toIn: '已有账号？登录',
      signOut: '退出登录', syncNow: '立即同步', as: '已登录：{email}', last: '上次同步 {time}', never: '尚未同步',
      inSync: '已是最新。', pushed: '已保存到云端。', pulled: '已载入较新的云端副本。', offline: '没有网络。此设备上的数据是安全的。', error: '同步失败，请稍后再试。',
      conflict: '此设备和云端都有改动。保留哪一个？', useCloud: '使用云端副本', useDevice: '使用此设备',
      errEmail: '请输入有效的邮箱。', errShort: '密码至少需要8位。', errExists: '该邮箱已有账号，请直接登录。',
      errBad: '邮箱或密码不正确。', errConfirm: '请先确认邮箱（查看收件箱），再登录。', errRate: '尝试次数过多，请稍等片刻。',
      confirmSent: '账号已创建。请打开我们发送的邮件中的链接，然后登录。', close: '关闭', open: '云端'
    },
    es: {
      title: 'Copia en la nube (opcional)', note: 'Desactivada por defecto. Inicia sesión para guardar una copia de tus datos en la nube y usarla en otro dispositivo. Sin iniciar sesión, nada sale de este dispositivo.',
      email: 'Correo', pass: 'Contraseña (8+ caracteres)', signIn: 'Iniciar sesión', signUp: 'Crear cuenta', toUp: '¿Nuevo? Crea una cuenta', toIn: '¿Ya tienes cuenta? Inicia sesión',
      signOut: 'Cerrar sesión', syncNow: 'Sincronizar ahora', as: 'Sesión iniciada como {email}', last: 'Última sincronización {time}', never: 'Aún sin sincronizar',
      inSync: 'Ya está al día.', pushed: 'Guardado en la nube.', pulled: 'Se cargó la copia más reciente de la nube.', offline: 'Sin conexión. Tus datos en este dispositivo están a salvo.', error: 'No se pudo sincronizar. Inténtalo más tarde.',
      conflict: 'Este dispositivo y la nube han cambiado. ¿Cuál debe prevalecer?', useCloud: 'Usar la copia de la nube', useDevice: 'Usar este dispositivo',
      errEmail: 'Introduce un correo válido.', errShort: 'La contraseña necesita al menos 8 caracteres.', errExists: 'Ya existe una cuenta con este correo. Inicia sesión.',
      errBad: 'Correo o contraseña incorrectos.', errConfirm: 'Confirma primero tu correo (revisa la bandeja) y luego inicia sesión.', errRate: 'Demasiados intentos. Espera un minuto.',
      confirmSent: 'Cuenta creada. Abre el enlace del correo que enviamos y luego inicia sesión.', close: 'Cerrar', open: 'Nube'
    }
  };
  function t(lang, k, v) {
    var s = (S[lang] && S[lang][k]) || S.en[k] || k;
    for (var x in (v || {})) s = s.split('{' + x + '}').join(v[x]);
    return s;
  }
  var errKey = { email: 'errEmail', short: 'errShort', exists: 'errExists', bad: 'errBad', confirm: 'errConfirm', rate: 'errRate' };
  var api = { S: S, t: t, errKey: errKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CloudI18n = api;
})(typeof window !== 'undefined' ? window : globalThis);
