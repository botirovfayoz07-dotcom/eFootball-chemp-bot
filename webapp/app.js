(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#070a14'); tg.setBackgroundColor('#070a14'); } catch (_) {}
  }

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

  // Marshrut: '' (bosh sahifa) | #guide | #official | #league | #private/<id>/<tab>
  function route() {
    const parts = location.hash.slice(1).split('/');
    const inGuide = parts[0] === 'guide', inOfficial = parts[0] === 'official', inLeague = parts[0] === 'league',
      inPrivate = parts[0] === 'private';
    document.querySelector('.topbar').hidden = inGuide || inPrivate;
    document.querySelector('main.page').hidden = inGuide || inOfficial || inLeague || inPrivate;
    $('#official').hidden = !inOfficial;
    $('#league').hidden = !inLeague;
    $('#private').hidden = !inPrivate;
    $('#guide').hidden = !inGuide;
    if (inLeague) window.LeagueView.show($('#league'), lang, toast); else window.LeagueView.leave();
    if (inPrivate) window.PrivateView.show($('#private'), lang, toast, parts[1], parts[2]);
    else window.PrivateView.leave();
    if (inGuide) window.GuideView.render($('#guide'), lang, parts[1]);
    else window.scrollTo(0, 0);
    if (tg?.BackButton) { (inGuide || inOfficial || inLeague || inPrivate) ? tg.BackButton.show() : tg.BackButton.hide(); }
  }
  const go = (id) => { location.hash = id === '' ? '' : id === 'index' ? '#guide' : '#guide/' + id; if (id === '') history.replaceState(null, '', location.pathname + location.search); route(); };
  window.addEventListener('hashchange', route);
  tg?.BackButton?.onClick(() => {
    const root = location.hash.slice(1).split('/')[0];
    if (root === 'private') return window.PrivateView.back();
    if (location.hash === '#league') return window.LeagueView.back() || (location.hash = '#official');
    return go(location.hash.split('/')[1] ? 'index' : '');
  });
  $('#official').addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return go('');
    const m = e.target.closest('[data-mode]');
    if (m?.dataset.mode === 'leagues') { location.hash = '#league'; return; }
    if (m) { tg?.HapticFeedback?.impactOccurred('light'); toast(window.I18N[lang].soon); } // bo'limlar keyingi qismlarda
  });
  $('#guide').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-admin]');
    if (a && tg?.openTelegramLink) { e.preventDefault(); tg.openTelegramLink(a.href); return; }
    const b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });

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
    if (name === 'guide') return go('index');
    if (name === 'official') { location.hash = '#official'; return; }
    if (name === 'private') { location.hash = '#private'; return; }
    // TODO: har bir bo'lim sahifasi keyingi qismlarda qo'shiladi
    toast(window.I18N[lang].soon);
  }
  document.querySelectorAll('[data-section]').forEach((el) =>
    el.addEventListener('click', () => openSection(el.dataset.section))
  );

  // Karusel nuqtalari
  const car = $('#carousel'), dots = document.querySelectorAll('#dots i');
  car.addEventListener('scroll', () => {
    const step = car.firstElementChild.offsetWidth + 14;
    const i = Math.min(dots.length - 1, Math.round(car.scrollLeft / step));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  }, { passive: true });

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

  // ?open=guide / ?open=private — botdagi tugmalar
  const open = new URLSearchParams(location.search).get('open');
  if (open === 'guide' && !location.hash) history.replaceState(null, '', '#guide');
  if (open === 'private' && !location.hash) history.replaceState(null, '', '#private');

  applyLang(lang);

  // Yuklanish ekrani CSS orqali o'zi yo'qoladi; bu esa uni DOM'dan olib tashlaydi
  setTimeout(() => $('#splash')?.remove(), 4200);
})();
