(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#070a14'); tg.setBackgroundColor('#070a14'); } catch (_) {}
  }

  window.AppBg.restore();   // oxirgi yoqilgan fon darrov ko'rinadi
  const SUPPORTED = ['uz', 'en', 'ru'];
  const $ = (s) => document.querySelector(s);

  // Til: ?lang= (botdan) -> saqlangan -> Telegram tili -> uz
  function initialLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED.includes(q)) return q;
    try {
      const saved = localStorage.getItem('lang');
      if (SUPPORTED.includes(saved)) return saved;
    } catch (_) {}
    const tgLang = tg?.initDataUnsafe?.user?.language_code;
    return SUPPORTED.includes(tgLang) ? tgLang : 'uz';
  }

  let lang = initialLang();

  function applyLang(l) {
    lang = l;
    try { localStorage.setItem('lang', l); } catch (_) {}
    document.documentElement.lang = l;
    $('#langCur').textContent = l.toUpperCase();
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = window.I18N[l][el.dataset.i18n];
    });
    route();
  }

  // Marshrut: '' (bosh sahifa) | #rules | #rules/<bo'lim>
  function route() {
    const parts = location.hash.slice(1).split('/');
    const inGuide = parts[0] === 'rules', inOfficial = parts[0] === 'official', inLeague = parts[0] === 'league', inAdmin = parts[0] === 'admin', inUn = parts[0] === 'unofficial', inUcl = parts[0] === 'ucl';
    document.querySelector('.topbar').hidden = inGuide || inAdmin;
    document.querySelector('main.page').hidden = inGuide || inOfficial || inLeague || inAdmin || inUn || inUcl;
    $('#official').hidden = !inOfficial;
    $('#league').hidden = !inLeague;
    $('#rules').hidden = !inGuide;
    $('#admin').hidden = !inAdmin;
    $('#unofficial').hidden = !inUn;
    if (inUcl) window.UclView.show($('#ucl'), lang, toast); else window.UclView.leave();
    if (!inUn) window.UT_MODE = null;   // JCH rejimi faqat shu ochilishda amal qiladi
    if (inUn) window.UnofficialView.show($('#unofficial'), lang, toast, parts[1], parts[2]); else window.UnofficialView.leave();
    if (inAdmin) window.AdminView.show($('#admin'), toast, 'global'); else window.AdminView.leave();
    if (inLeague) window.LeagueView.show($('#league'), lang, toast); else window.LeagueView.leave();
    if (inGuide) window.RulesView.show($('#rules'), lang, toast, parts[1]); else { window.RulesView.leave(); window.scrollTo(0, 0); }
    if (tg?.BackButton) { (inGuide || inOfficial || inLeague || inAdmin || inUn || inUcl) ? tg.BackButton.show() : tg.BackButton.hide(); }
  }
  const go = (id) => { location.hash = id === '' ? '' : '#rules'; if (id === '') history.replaceState(null, '', location.pathname + location.search); route(); };
  window.addEventListener('hashchange', route);
  tg?.BackButton?.onClick(() => location.hash.startsWith('#unofficial') ? (window.UnofficialView.back() || go('')) : location.hash === '#ucl' ? (location.hash = '#official') : location.hash === '#league' ? (window.LeagueView.back() || (location.hash = '#official')) : location.hash.startsWith('#rules') ? (window.RulesView.back() || go('')) : go(''));
  $('#official').addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return go('');
    const m = e.target.closest('[data-mode]');
    if (m?.dataset.mode === 'leagues') { location.hash = '#league'; return; }
    if (m?.dataset.mode === 'cl') { window.UT_MODE = null; location.hash = '#ucl'; return; }
    if (m?.dataset.mode === 'world') { window.UT_MODE = 'wc'; location.hash = '#unofficial'; return; }   // JCH: faqat JCH turnirlari va JCH yaratish
    if (m) { tg?.HapticFeedback?.impactOccurred('light'); toast(window.I18N[lang].soon); } // bo'limlar keyingi qismlarda
  });
  $('#admin').addEventListener('click', (e) => { if (e.target.closest('[data-back]') || e.target.closest('[data-act="adm-back"]')) go(''); });

  // Til menyusi
  const btn = $('#langBtn'), menu = $('#langMenu');
  const closeMenu = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    btn.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.addEventListener('click', (e) => {
    const l = e.target.closest('[data-lang]')?.dataset.lang;
    if (!l) return;
    applyLang(l);
    tg?.HapticFeedback?.selectionChanged();
    closeMenu();
  });
  document.addEventListener('click', closeMenu);

  // Bo'limlar (keyingi qismlarda to'ldiriladi)
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 1800);
  }
  function openSection(name) {
    tg?.HapticFeedback?.impactOccurred('light');
    if (name === 'rules') { location.hash = '#rules'; return; }
    if (name === 'official') { location.hash = '#official'; return; }
    if (name === 'admin') { location.hash = '#admin'; return; }
    if (name === 'private') { window.UT_MODE = null; location.hash = '#unofficial'; return; }   // norasmiy turnirlar: hamma uchun ochiq
    // TODO: har bir bo'lim sahifasi keyingi qismlarda qo'shiladi
    toast(window.I18N[lang].soon);
  }
  document.querySelectorAll('[data-section]').forEach((el) =>
    el.addEventListener('click', () => openSection(el.dataset.section))
  );

  // Rejimlar slayderi nuqtalari
  const ms = $('#modeSlider'), mdots = document.querySelectorAll('#modeDots i');
  ms.addEventListener('scroll', () => {
    const step = ms.firstElementChild.offsetWidth + 14;
    const i = Math.min(mdots.length - 1, Math.round(ms.scrollLeft / step));
    mdots.forEach((d, k) => d.classList.toggle('on', k === i));
  }, { passive: true });

  // Ism (yuqori o'ngda)
  const first = tg?.initDataUnsafe?.user?.first_name;
  if (first) $('#uname').textContent = first;

  // ?open=rules — botdagi "Umumiy qoidalar" tugmasi (eski ?open=guide ham shu sahifani ochadi)
  if (['rules', 'guide'].includes(new URLSearchParams(location.search).get('open')) && !location.hash) history.replaceState(null, '', '#rules');

  // ?open=games — o'yin hisobi xabaridagi tugma (Profil → Mening o'yinlarim); ?open=admin — /admin tugmasi
  const openParam = new URLSearchParams(location.search).get('open');
  if (openParam === 'games' && !location.hash) { window.LeagueView.preset('profile'); history.replaceState(null, '', '#league'); }
  if (openParam === 'support' && !location.hash) { window.LeagueView.preset('support'); history.replaceState(null, '', '#league'); }
  if (openParam && openParam.startsWith('chat/') && !location.hash) { window.LeagueView.preset('chat', openParam.slice(5)); history.replaceState(null, '', '#league'); }
  if (openParam === 'admin' && !location.hash) history.replaceState(null, '', '#admin');
  // ?open=ut/<id> — turnirni ochish; ?open=join/<KOD> — taklif kodi bo'yicha turnirga qo'shilish
  if (openParam && !location.hash) {
    const [k, v] = openParam.split('/');
    if (k === 'ut' && v) history.replaceState(null, '', '#unofficial/' + v);
    if (k === 'join' && v) history.replaceState(null, '', '#unofficial/code/' + v);
  }

  // Admin tugmasi faqat adminlarga ko'rinadi (yoki localhost/test rejimida)
  const isLocalOrTest = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || new URLSearchParams(location.search).get('admin') === '1';
  if (isLocalOrTest) {
    window.IS_STAFF = true;
    const ab = $('#adminBtn');
    if (ab) ab.hidden = false;
  }
  if (tg?.initData) setInterval(() => fetch('/api/me', { headers: { 'x-init-data': tg.initData } }).catch(() => {}), 60000);
  if (tg?.initData) fetch('/api/me', { headers: { 'x-init-data': tg.initData } }).then((r) => r.json()).then((d) => { window.IS_STAFF = !!d.admin; window.dispatchEvent(new Event('staffready')); const ab = $('#adminBtn'); if (ab && d.admin) ab.hidden = false; if ('bg' in d) window.AppBg.setOwn(d.bg); }).catch(() => {});

  // ——— Majburiy obuna: har ochilishda tekshiriladi ———
  let subShown = false;
  const showSubGate = (channels) => {
    if (subShown) return; subShown = true;
    const T = { uz: { title: "Davom etish uchun kanallarga obuna bo'ling", btn: "Obuna bo'ldim", no: "Hali obuna bo'lmagansiz" },
                 en: { title: 'Subscribe to the channels to continue', btn: "I've subscribed", no: "You are not subscribed yet" },
                 ru: { title: 'Подпишитесь на каналы, чтобы продолжить', btn: 'Я подписался', no: 'Вы ещё не подписаны' } }[lang] || { title: 'Subscribe', btn: 'OK', no: '' };
    const g = document.createElement('div');
    g.id = 'subGate';
    g.innerHTML = `<div class="sg-box"><h3>${T.title}</h3><div class="sg-list">${channels.map((c) => `<a class="sg-ch${c.subscribed ? ' ok' : ''}" href="${c.url}" target="_blank" rel="noopener">${c.subscribed ? '✅' : '📢'} ${c.id}</a>`).join('')}</div><button class="sg-go" id="subCheck">${T.btn}</button><p class="sg-no" id="subNo"></p></div>`;
    document.body.appendChild(g);
    g.querySelector('#subCheck').addEventListener('click', async () => {
      const r = await fetch('/api/sub/check', { method: 'POST', headers: { 'x-init-data': window.Telegram?.WebApp?.initData || '' } }).then((x) => x.json()).catch(() => ({}));
      if (r.ok) { g.remove(); location.reload(); return; }
      if (r.channels) g.querySelector('.sg-list').innerHTML = r.channels.map((c) => `<a class="sg-ch${c.subscribed ? ' ok' : ''}" href="${c.url}" target="_blank" rel="noopener">${c.subscribed ? '✅' : '📢'} ${c.id}</a>`).join('');
      g.querySelector('#subNo').textContent = T.no;
    });
  };
  const checkSub = async () => {
    const r = await fetch('/api/sub/status', { headers: { 'x-init-data': window.Telegram?.WebApp?.initData || '' } }).then((x) => x.json()).catch(() => ({}));
    if (r && r.ok === false && r.channels) showSubGate(r.channels);
  };
  checkSub();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkSub(); });

  applyLang(lang);

  // Yuklanish ekrani CSS orqali o'zi yo'qoladi; bu esa uni DOM'dan olib tashlaydi
  setTimeout(() => $('#splash')?.remove(), 4200);
})();
