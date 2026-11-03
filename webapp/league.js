window.LeagueView = (() => {
  const T = {
    uz: { continents: { europe: 'Europe', asia: 'Asia', africa: 'Africa' }, pickCountry: 'Davlatni tanlang', cups: 'Turnir tanlash', cupsLabel: 'Kuboklar', format: 'Turnir formati', cupTypes: { league: 'Liga', league2: '2-liga', cup: 'Kubok', supercup: 'Superkubok' }, noLeagues: "Bu davlatning turnirlari tez orada qo'shiladi", back: 'Ortga', full: "TO'LIQ", open: 'OCHIQ', players: "O'yinchilar", max: 'Maksimal', season: 'Mavsum', register: "Ro'yxatdan o'tish", pick: 'Klubni tanlang',
      clubs: 'Ligadagi klublar', rules: 'Qoidalar', notice: "E'lon", details: 'Batafsil', prize: 'Sovrin', yourLeague: 'Siz qatnashayotgan liga', place: "O'rin",
      nav: ["Ma'lumotlar", 'Me', "Do'kon"], soon: 'Tez orada', ok: "Ro'yxatdan o'tdingiz ✅", taken: 'Bu klub band', already: "Siz allaqachon ro'yxatdan o'tgansiz", fail: "Xatolik, qayta urinib ko'ring", fullErr: "Liga to'lgan",
      aucTitle: "Klubni auksionga qo'yish", aucPrice: 'Narxni kiriting', aucConfirm: 'Tasdiqlash', aucCancel: 'Bekor qilish', aucOk: "Klub auksionga qo'yildi ✅", aucOff: 'Klub auksiondan olindi', badPrice: "Narx noto'g'ri",
      leaveConfirm: "Klubdan voz kechasizmi? Klub yana ro'yxatdan o'tish bo'limiga qaytadi.", leftOk: 'Klubdan voz kechdingiz',
      rulesList: ["O'yin **8 daqiqa** davom etadi.", 'Ikkitalik himoya yoqish **mumkin emas**.', `O'yinchilar holati **"Excellent"** bo'lishi kerak.`, 'Extra time va penalti **yo\'q**.', 'Dedline har kuni tungi soat **23:30** da.', "Agar raqib javob bermasa yoki hisobni noto'g'ri kiritsa — **rasm yoki video bilan adminga murojaat qiling**."],
      noticeText: "Bot a'zo bo'lishni so'ragan kanalda yangiliklar joriy qilinadi.",
      detailsText: "Botni haqiqiy futbol formatiga asta-sekin o'tkazib boramiz. Ishtirokchilar soni oshsa, ligalar soni 5 taga oshiriladi va Chempionlar ligasi ham qo'shiladi. Milliy ligadagi 1-o'rindan 6-o'ringacha bo'lgan klublar Chempionlar ligasida qatnashish imkoniyatiga ega bo'lishadi.",
      prizeText: 'Sovrinlar masalasida homiylarga mutanosib ravishda pul ham beriladi.' },
    en: { continents: { europe: 'Europe', asia: 'Asia', africa: 'Africa' }, pickCountry: 'Choose a country', cups: 'Choose a tournament', cupsLabel: 'Cups', format: 'Tournament format', cupTypes: { league: 'League', league2: '2nd tier', cup: 'Cup', supercup: 'Super Cup' }, noLeagues: "This country's tournaments are coming soon", back: 'Back', full: 'FULL', open: 'OPEN', players: 'Players', max: 'Maximum', season: 'Season', register: 'Sign up', pick: 'Pick a club',
      clubs: 'Clubs in the league', rules: 'Rules', notice: 'Notice', details: 'Details', prize: 'Prize', yourLeague: 'Your league', place: 'Place',
      nav: ['Info', 'Me', 'Shop'], soon: 'Coming soon', ok: 'You are signed up ✅', taken: 'This club is taken', already: 'You are already signed up', fail: 'Error, please try again', fullErr: 'League is full',
      aucTitle: 'Put the club up for auction', aucPrice: 'Enter the price', aucConfirm: 'Confirm', aucCancel: 'Cancel', aucOk: 'The club is on auction ✅', aucOff: 'The club was taken off auction', badPrice: 'Invalid price',
      leaveConfirm: 'Give up the club? It will go back to the sign-up list.', leftOk: 'You gave up the club',
      rulesList: ['A match lasts **8 minutes**.', 'Double defence is **not allowed**.', 'Player condition must be **"Excellent"**.', 'No extra time or penalties.', 'The deadline is every day at **23:30**.', "If your opponent doesn't respond or enters the score wrongly — **contact the admin with a photo or video**."],
      noticeText: 'News is published in the channel the bot asks you to join.',
      detailsText: 'We are gradually moving the bot to a real football format. As the number of participants grows, the number of leagues will rise to 5 and a Champions League will be added. Clubs placed 1st to 6th in a national league will be able to enter the Champions League.',
      prizeText: 'Prize money is also paid out in proportion to sponsor funding.' },
    ru: { continents: { europe: 'Европа', asia: 'Азия', africa: 'Африка' }, pickCountry: 'Выберите страну', cups: 'Выбор турнира', cupsLabel: 'Кубки', format: 'Формат турнира', cupTypes: { league: 'Лига', league2: '2-я лига', cup: 'Кубок', supercup: 'Суперкубок' }, noLeagues: 'Турниры этой страны скоро появятся', back: 'Назад', full: 'ЗАПОЛНЕНА', open: 'ОТКРЫТА', players: 'Игроки', max: 'Максимум', season: 'Сезон', register: 'Записаться', pick: 'Выберите клуб',
      clubs: 'Клубы лиги', rules: 'Правила', notice: 'Объявление', details: 'Подробнее', prize: 'Призы', yourLeague: 'Ваша лига', place: 'Место',
      nav: ['Инфо', 'Я', 'Магазин'], soon: 'Скоро', ok: 'Вы записаны ✅', taken: 'Этот клуб занят', already: 'Вы уже записаны', fail: 'Ошибка, попробуйте ещё раз', fullErr: 'Лига заполнена',
      aucTitle: 'Выставить клуб на аукцион', aucPrice: 'Укажите цену', aucConfirm: 'Подтвердить', aucCancel: 'Отмена', aucOk: 'Клуб выставлен на аукцион ✅', aucOff: 'Клуб снят с аукциона', badPrice: 'Неверная цена',
      leaveConfirm: 'Отказаться от клуба? Он вернётся в список для записи.', leftOk: 'Вы отказались от клуба',
      rulesList: ['Матч длится **8 минут**.', 'Двойную защиту включать **нельзя**.', 'Состояние игроков должно быть **«Excellent»**.', 'Дополнительного времени и пенальти **нет**.', 'Дедлайн каждый день в **23:30**.', 'Если соперник не отвечает или неверно вводит счёт — **обратитесь к админу с фото или видео**.'],
      noticeText: 'Новости публикуются в канале, на который бот просит подписаться.',
      detailsText: 'Мы постепенно переводим бота на формат настоящего футбола. С ростом числа участников лиг станет 5 и добавится Лига чемпионов. Клубы, занявшие в национальной лиге места с 1-го по 6-е, получат шанс сыграть в Лиге чемпионов.',
      prizeText: 'Денежные призы выплачиваются пропорционально средствам спонсоров.' },
  };
  const tg = window.Telegram?.WebApp;
  const EFL = window.EFL;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '' } }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
  const confirmBox = (msg) => new Promise((res) => (tg?.showConfirm ? tg.showConfirm(msg, res) : res(window.confirm(msg))));

  // Rasm zanjiri: birinchi manba yuklanmasa keyingisi, hammasi bo'lmasa 🏆
  const FALLBACK = `var f=(this.dataset.f||'').split('|').filter(Boolean);if(f.length){this.dataset.f=f.slice(1).join('|');this.src=f[0];}else{this.replaceWith(Object.assign(document.createElement('span'),{className:'lc-cup',textContent:'🏆'}))}`;
  const chain = (srcs) => `<img src="${esc(srcs[0])}" data-f="${esc(srcs.slice(1).join('|'))}" loading="lazy" alt="" onerror="${FALLBACK}">`;

  // tab: home (davlat -> ro'yxatdan o'tish; faqat ro'yxatdan o'tmaganlar) | info | me | shop (ro'yxatdan o'tgach)
  let tab = 'home', view = 'geo', country = null, cont = 'europe', loaded = false, meSel = null, openGame = null, pendingTab = null, autoClub = false,
    prof = { clubs: [], collection: [] }, lots = [], rank = { league: null, chip: null, group: '1', rows: [], single: true },
    data = { mine: null, stats: {} }, // stats: { [ligaId]: { players, taken[] } }
    cur = null, selected = null, el, lang = 'uz', toast, settle;

  const stat = (id) => data.stats[id] || { players: 0, taken: [] };
  const isFull = (l) => stat(l.id).players >= l.max;

  // Pastki menyu: Ma'lumotlar · Me · Do'kon — faqat ro'yxatdan o'tgandan keyin
  const navHtml = (t, active) => `<nav class="l-nav">${['ℹ️', '👤', '🛒'].map((i, k) => `<button class="${k === active ? 'on' : ''}" data-act="${['info', 'me', 'shop'][k]}"><span>${i}</span><small>${t.nav[k]}</small></button>`).join('')}</nav>`;
  const nav = (t, active) => (data.mine ? navHtml(t, active) : '');
  const backBtn = (act = 'back') => `<button class="back" data-act="${act}"><span>‹</span> ${T[lang].back}</button>`;

  // ——— Kuboklar (bosilmaydi) va formatlar ———
  function cupsHtml(c) {
    const t = T[lang];
    if (!c?.cups?.length) return '';
    return `<div class="g-label"><span>${t.cupsLabel}</span></div><div class="cups" style="--n:${c.cups.length}">${c.cups.map((k) => `<div class="cup"><span class="cup-img">${chain(EFL.cupSrcs(k.id))}</span><b>${esc(k.name)}</b><small>${esc(t.cupTypes[k.type])}</small></div>`).join('')}</div>`;
  }
  function formatHtml(countryId, leagueId) {
    const f = EFL.FORMATS[countryId];
    if (!f) return '';
    const blocks = [];
    const lf = f.leagues[leagueId];
    if (lf) blocks.push({ title: EFL.byId[leagueId].name, lines: lf[lang] });
    (f.cups || []).forEach((k) => blocks.push({ title: k.name, lines: k[lang] }));
    return `<div class="g-label"><span>${T[lang].format}</span></div>` + blocks.map((b) => `<div class="g-card l-rules"><h3>🏆 ${esc(b.title)}</h3><ul>${b.lines.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  }
  const notesHtml = (t) => `<div class="g-card l-rules"><h3>📋 ${t.rules}</h3><ul>${t.rulesList.map((x) => `<li>${rich(x)}</li>`).join('')}</ul></div>
      <div class="note n-info"><small>📢 ${t.notice.toUpperCase()}</small><p>${esc(t.noticeText)}</p></div>
      <div class="note n-det"><small>${t.details.toUpperCase()}</small><p>${esc(t.detailsText)}</p></div>
      <div class="note n-prize"><small>🏆 ${t.prize.toUpperCase()}</small><p>${esc(t.prizeText)}</p></div>`;

  // ——— Ma'lumotlar: kuboklar · qaysi ligada + reyting · format ———
  function infoHtml() {
    const t = T[lang], m = data.mine, l = EFL.byId[m.league], c = EFL.countryById[l.country], name = EFL.clubName(l.id, m.club);
    const row = rank.rows.find((r) => r.club === m.club);
    return `<div class="page l-page">${backBtn()}${cupsHtml(c)}
      <div class="g-label"><span>${t.yourLeague}</span></div>
      <div class="g-card inf-league"><span class="inf-logo">${chain([EFL.leagueSrc(l.id)])}</span>
        <div class="inf-txt"><b>${esc(l.name)}</b><small>${c ? c.flag + ' ' + esc(c.name[lang]) : ''}</small><span class="inf-club">${EFL.crest(l.id, m.club, name)}<i>${esc(name)}</i></span></div>
        <div class="inf-pos"><b>${row ? '#' + row.pos : '—'}</b><small>${t.place}</small></div></div>
      ${window.RatingView.html(lang, { ...rank, single: true })}
      ${formatHtml(l.country, l.id)}
      ${notesHtml(t)}</div>${nav(t, 0)}`;
  }
  async function loadRank() {
    const id = data.mine?.league;
    if (!id) return;
    if (rank.league !== id) rank = { league: id, chip: id, group: String(EFL.byId[id].group), rows: [], single: true };
    const r = await api('/api/rankings/' + id);
    if (r.ok && id === rank.league) { rank.rows = r.rows; if (tab === 'info') render(); }
  }

  // ——— Me va Do'kon ———
  const renderMe = () => { el.innerHTML = `<div class="page l-page">${window.ProfileView.html(lang, { clubs: prof.clubs, collection: prof.collection, sel: meSel, openGame })}</div>${nav(T[lang], 1)}`; };
  const renderShop = () => { el.innerHTML = `<div class="page l-page">${window.ShopView.html(lang, { lots })}</div>${nav(T[lang], 2)}`; };
  async function loadProfile() { const r = await api('/api/profile'); if (r.ok) { prof = { clubs: r.clubs || [], collection: r.collection || [] }; if (autoClub && prof.clubs.length) { meSel = prof.clubs[0].league + '|' + prof.clubs[0].club; autoClub = false; } if (tab === 'me') render(); } }
  async function loadLots() { const r = await api('/api/auctions'); if (r.ok) { lots = r.lots || []; if (tab === 'shop') render(); } }

  function setTab(n) {
    tab = n; meSel = null; window.scrollTo(0, 0); render();
    if (n === 'info') loadRank(); else if (n === 'me') loadProfile(); else if (n === 'shop') loadLots();
  }

  const closeModal = () => el.querySelector('#aucModal')?.remove();
  function openAuction() {
    const t = T[lang];
    closeModal();
    el.insertAdjacentHTML('beforeend', `<div class="modal" id="aucModal"><div class="modal-box"><h3>${t.aucTitle}</h3><label>${t.aucPrice}</label><input id="aucPrice" type="number" inputmode="numeric" min="1" step="1" placeholder="0"><div class="modal-btns"><button class="mb-no" data-act="aucno">${t.aucCancel}</button><button class="mb-ok" data-act="aucok">${t.aucConfirm}</button></div></div></div>`);
    el.querySelector('#aucPrice')?.focus();
  }
  async function confirmAuction() {
    const t = T[lang], price = Math.floor(Number(el.querySelector('#aucPrice')?.value));
    if (!(price >= 1)) return toast(t.badPrice);
    const [league, club] = meSel.split('|');
    const r = await post('/api/auction', { league, club, price });
    closeModal();
    if (!r.ok) return toast(t[r.error] || t.fail);
    tg?.HapticFeedback?.notificationOccurred('success'); toast(t.aucOk);
    await loadProfile();
  }
  async function cancelAuction(key) {
    const t = T[lang], [league, club] = (key || meSel).split('|');
    const r = await post('/api/auction/cancel', { league, club });
    if (!r.ok) return toast(t.fail);
    tg?.HapticFeedback?.notificationOccurred('success'); toast(t.aucOff);
    await Promise.all([loadProfile(), loadLots()]);
  }
  async function leaveClub() {
    const t = T[lang], [league, club] = meSel.split('|');
    if (!(await confirmBox(t.leaveConfirm))) return;
    const r = await post('/api/leave', { league, club });
    if (!r.ok) return toast(t.fail);
    tg?.HapticFeedback?.notificationOccurred('success'); toast(t.leftOk);
    meSel = null;
    await load();            // klub qolmagan bo'lsa, davlatlar ro'yxatiga qaytadi
    if (data.mine) loadProfile();
  }

  // ——— Ro'yxatdan o'tish: liga karuseli, klublar ———
  function heroHtml() {
    const t = T[lang], l = EFL.byId[cur], s = stat(cur), full = isFull(l), canReg = !full && selected;
    return `<span class="l-badge ${full ? 'full' : 'open'}">${full ? t.full : t.open}</span>
      <div class="l-title"><img src="${esc(EFL.leagueSrc(l.id))}" alt="" onerror="this.remove()"><h2>${esc(l.name.toUpperCase())}</h2></div>
      <div class="l-stats"><div><b>${s.players}</b><small>${t.players}</small></div><div><b>${l.max}</b><small>${t.max}</small></div><div><b>${EFL.season}</b><small>${t.season}</small></div></div>
      <button class="l-reg" data-act="register" ${canReg ? '' : 'disabled'}>${full ? t.full : selected ? t.register : t.pick}</button>`;
  }
  const cardHtml = (l) => {
    const t = T[lang], s = stat(l.id), full = isFull(l);
    return `<button class="lc${l.id === cur ? ' on' : ''}" data-lg="${l.id}">${chain([EFL.leagueSrc(l.id)])}<b>${esc(l.name)}</b><small>${s.players}/${l.max} ${t.players}</small><span class="l-badge ${full ? 'full' : 'open'}">${full ? t.full : t.open}</span></button>`;
  };
  function belowHtml() {
    const t = T[lang], l = EFL.byId[cur], taken = stat(cur).taken, full = isFull(l);
    const clubs = l.clubs.map((c) => {
      const off = taken.includes(c.id) || full;
      return `<button class="club${selected === c.id ? ' sel' : ''}${off ? ' taken' : ''}" data-club="${c.id}" ${off ? 'disabled' : ''}>${EFL.crest(l.id, c.id, c.name)}<span>${esc(c.name)}</span></button>`;
    }).join('');
    return `<div class="g-label"><span>${t.clubs}</span></div><div class="clubs">${clubs}</div>`;
  }
  const updHero = () => { const h = el.querySelector('#lHero'); if (h) h.innerHTML = heroHtml(); };
  const updBelow = () => { const b = el.querySelector('#lBelow'); if (b) b.innerHTML = belowHtml(); };
  const updFormat = () => { const f = el.querySelector('#lFormat'); if (f) f.innerHTML = formatHtml(country, cur); };

  // Karuselni markazga keltirish va "coverflow" effekti
  function centerOn(id, smooth) {
    const tr = el.querySelector('#lTrack'), c = tr?.querySelector(`[data-lg="${id}"]`);
    if (c) tr.scrollTo({ left: c.offsetLeft - (tr.clientWidth - c.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  }
  function nearest(tr) {
    const mid = tr.scrollLeft + tr.clientWidth / 2;
    let best = null, bd = Infinity;
    tr.querySelectorAll('.lc').forEach((c) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid), n = d / c.offsetWidth;
      const sign = c.offsetLeft + c.offsetWidth / 2 < mid ? 1 : -1, k = Math.min(n, 1.6);
      c.style.transform = `perspective(700px) rotateY(${sign * k * 16}deg) scale(${1 - k * 0.1})`;
      c.style.opacity = String(1 - k * 0.28);
      if (d < bd) { bd = d; best = c; }
    });
    return best?.dataset.lg;
  }
  function onTrackScroll(tr) {
    const id = nearest(tr);
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (!id || id === cur) return;
      cur = id; selected = null;
      tr.querySelectorAll('.lc').forEach((c) => c.classList.toggle('on', c.dataset.lg === cur));
      tg?.HapticFeedback?.selectionChanged();
      updHero(); updBelow(); updFormat();
    }, 90);
  }

  // ——— Qit'a -> davlat (6 qator x 2 ustun) ———
  function geoHtml() {
    const t = T[lang];
    const tabs = EFL.CONTINENTS.map((c) => `<button class="ct${c.id === cont ? ' on' : ''}${c.open ? '' : ' lock'}" data-cont="${c.id}">${c.open ? '' : '🔒 '}${esc(t.continents[c.id])}</button>`).join('');
    const flags = EFL.COUNTRIES.filter((c) => c.continent === cont).map((c) => `<button class="flag${c.open ? '' : ' lock'}" data-country="${c.id}"><span class="fl">${c.flag}</span><b>${esc(c.name[lang])}</b>${c.open ? '' : '<i>🔒</i>'}</button>`).join('');
    return `<div class="page l-page">${backBtn()}
      <div class="ct-tabs">${tabs}</div>
      <div class="g-label"><span>${t.pickCountry}</span></div>
      <div class="flags">${flags}</div></div>`;
  }
  // ——— Davlat sahifasi: kuboklar -> turnir tanlash -> ro'yxatdan o'tish -> klublar -> format ———
  function countryHtml() {
    const t = T[lang], c = EFL.countryById[country], ls = EFL.leaguesOf(country);
    const head = `${backBtn()}<div class="ct-head"><span class="ct-flag">${c.flag}</span><h2>${esc(c.name[lang])}</h2></div>${cupsHtml(c)}`;
    if (!ls.length) return `<div class="page l-page">${head}<div class="note n-info"><small>🏆 ${t.cupsLabel.toUpperCase()}</small><p>${esc(t.noLeagues)}</p></div></div>`;
    return `<div class="page l-page">${head}
      <div class="g-label"><span>${t.cups}</span></div>
      <div class="lc-track" id="lTrack">${ls.map(cardHtml).join('')}</div>
      <div class="l-hero" id="lHero">${heroHtml()}</div>
      <div id="lBelow">${belowHtml()}</div>
      <div id="lFormat">${formatHtml(country, cur)}</div>
      ${notesHtml(t)}</div>`;
  }
  function enterCountry(code) {
    country = code; view = 'country'; selected = null;
    cur = EFL.leaguesOf(code)[0]?.id || null;
    tg?.HapticFeedback?.selectionChanged();
    window.scrollTo(0, 0);
    render();
  }
  // Telegram/ilova "orqaga": ichki sahifadan bir qadam orqaga. Boshqa joyda false qaytaradi.
  function back() {
    if (tab === 'home' && view === 'country') { view = 'geo'; selected = null; window.scrollTo(0, 0); render(); return true; }
    if (tab === 'me' && meSel) { meSel = null; window.scrollTo(0, 0); render(); return true; }
    return false;
  }

  function render() {
    if (!loaded) { el.innerHTML = '<div class="page l-page"><div class="pf-empty"><span>⏳</span></div></div>'; return; }
    if (data.mine && tab === 'home') tab = 'info';       // ro'yxatdan o'tgan -> Ma'lumotlar
    if (!data.mine && tab !== 'home') { tab = 'home'; meSel = null; }
    if (tab === 'info') { el.innerHTML = infoHtml(); return; }
    if (tab === 'me') return renderMe();
    if (tab === 'shop') return renderShop();
    el.innerHTML = view === 'country' && country ? countryHtml() : geoHtml();
    const tr = el.querySelector('#lTrack');
    if (tr) { centerOn(cur, false); nearest(tr); }
  }

  async function load() {
    const r = await api('/api/leagues');
    loaded = true;
    if (r.ok) data = { mine: r.mine, stats: Object.fromEntries(r.leagues.map((l) => [l.id, { players: l.players, taken: l.taken }])) };
    selected = null;
    render();
    if (tab === 'info') loadRank(); else if (tab === 'me') loadProfile();
  }

  // O'yin hisobi: kiritish / tasdiqlash / yolg'on
  async function gameAct(kind, id) {
    const p = window.ProfileView.T[lang];
    const path = kind === 'g-ok' ? 'confirm' : kind === 'g-bad' ? 'reject' : 'report';
    let body = {};
    if (kind === 'g-bad' && !(await confirmBox(p.confirmFake))) return;
    if (kind === 'g-send') {
      const box = [...el.querySelectorAll('[data-box]')].find((b) => b.dataset.box === id);
      const my = parseInt(box?.querySelector('[data-in="my"]').value, 10), opp = parseInt(box?.querySelector('[data-in="opp"]').value, 10);
      if (!(my >= 0 && my <= 99 && opp >= 0 && opp <= 99)) return toast(p.badScore);
      body = { my, opp };
    }
    const r = await post(`/api/matches/${id}/${path}`, body);
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(kind === 'g-ok' ? p.confirmed : kind === 'g-bad' ? p.rejected : p.sent); openGame = null; }
    else toast(p[r.error] || p.fail);
    await loadProfile();
  }

  async function register() {
    const t = T[lang], r = await post(`/api/leagues/${cur}/register`, { club: selected });
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(t.ok); window.scrollTo(0, 0); }
    else toast(t[r.error === 'full' ? 'fullErr' : r.error] || t.fail);
    await load();
  }

  function show(root, l, toastFn) {
    el = root; lang = l; toast = toastFn;
    if (pendingTab) { tab = pendingTab; pendingTab = null; }
    render();
    if (el.dataset.loaded !== '1') { el.dataset.loaded = '1'; load(); }
    if (!el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener('scroll', (e) => { if (e.target.id === 'lTrack') onTrackScroll(e.target); }, { capture: true, passive: true });
      el.addEventListener('click', (e) => {
        const q = (s) => e.target.closest(s), ct = q('[data-cont]'), cn = q('[data-country]'), lg = q('[data-lg]'), c = q('[data-club]'), mc = q('[data-mc]'), btn = q('[data-act]'), a = btn?.dataset.act;
        if (ct) { const k = EFL.CONTINENTS.find((x) => x.id === ct.dataset.cont); if (k?.open) { cont = k.id; render(); } else { tg?.HapticFeedback?.impactOccurred('light'); toast(T[lang].soon); } }
        else if (cn) { const k = EFL.countryById[cn.dataset.country]; if (k?.open) enterCountry(k.id); else { tg?.HapticFeedback?.impactOccurred('light'); toast(T[lang].soon); } }
        else if (mc) { meSel = mc.dataset.mc; openGame = null; window.scrollTo(0, 0); render(); }
        else if (lg && lg.dataset.lg !== cur) centerOn(lg.dataset.lg, true);
        else if (c && !c.disabled) { selected = c.dataset.club; tg?.HapticFeedback?.selectionChanged(); updHero(); updBelow(); }
        else if (a === 'g-open') { const id = btn.dataset.gid; openGame = openGame === id ? null : id; render(); }
        else if (a === 'g-send' || a === 'g-ok' || a === 'g-bad') gameAct(a, btn.dataset.gid);
        else if (a === 'register') register();
        else if (a === 'back') { if (!back()) location.hash = '#official'; }
        else if (a === 'meback') { meSel = null; openGame = null; window.scrollTo(0, 0); render(); }
        else if (a === 'info' || a === 'me' || a === 'shop') setTab(a);
        else if (a === 'leave') leaveClub();
        else if (a === 'auction') openAuction();
        else if (a === 'aucno') closeModal();
        else if (a === 'aucok') confirmAuction();
        else if (a === 'unauction') cancelAuction(btn.dataset.key);
        else if (a === 'buy') { tg?.HapticFeedback?.impactOccurred('light'); toast(T[lang].soon); }
      });
    }
  }
  // ?open=games (o'yin hisobi xabaridagi tugma): Me → klub → Mening o'yinlarim
  const preset = (name) => { pendingTab = name === 'profile' ? 'me' : name; autoClub = pendingTab === 'me'; };
  const leave = () => { if (el) el.dataset.loaded = ''; tab = 'home'; view = 'geo'; country = null; meSel = null; openGame = null; loaded = false; };
  return { show, leave, back, preset };
})();
