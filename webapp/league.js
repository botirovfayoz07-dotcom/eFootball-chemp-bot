window.LeagueView = (() => {
  const T = {
    uz: { continents: { europe: 'Europe', asia: 'Asia', africa: 'Africa' }, pickCountry: 'Davlatni tanlang', cups: 'Turnirlar', noLeagues: "Bu davlatning turnirlari tez orada qo'shiladi", back: 'Ortga', full: "TO'LIQ", open: 'OCHIQ', players: "O'yinchilar", max: 'Maksimal', season: 'Mavsum', register: "Ro'yxatdan o'tish", registered: "Ro'yxatdan o'tdingiz", pick: 'Klubni tanlang',
      choose: 'Liga tanlash', clubs: 'Ligadagi klublar', rules: 'Qoidalar', notice: "E'lon", details: 'Batafsil', prize: 'Sovrin',
      nav: ['Asosiy', 'Reyting', 'Profil', 'Sovrinlar', "Do'kon"], soon: 'Tez orada', ok: "Ro'yxatdan o'tdingiz ✅", taken: 'Bu klub band', already: "Siz allaqachon ro'yxatdan o'tgansiz", fail: "Xatolik, qayta urinib ko'ring",
      rulesList: ["O'yin **8 daqiqa** davom etadi.", 'Ikkitalik himoya yoqish **mumkin emas**.', `O'yinchilar holati **"Excellent"** bo'lishi kerak.`, 'Extra time va penalti **yo\'q**.', 'Dedline har kuni tungi soat **23:30** da.', "Agar raqib javob bermasa yoki hisobni noto'g'ri kiritsa — **rasm yoki video bilan adminga murojaat qiling**."],
      myLeague: "Siz shu ligada qatnashyapsiz", otherLeague: "Siz allaqachon boshqa ligada qatnashyapsiz — mavsumda faqat bitta ligada o'ynash mumkin.", fullErr: "Liga to'lgan",
      releasing: 'Klubini topshirayotganlar', relHint: "Klub yetmay qoldimi? Quyidagi klublardan birini o'zingizga rasmiylashtiring — jadval va natijalari bilan birga.", inLeagueNote: 'Siz allaqachon ligada qatnashyapsiz.', played: "o'yin o'ynalgan", take: 'Olish', confirmTake: 'Bu klubni olasizmi?', claimed: 'Klub sizniki ✅', gone: 'Klub allaqachon olingan', relOn: "Klubingiz ro'yxatga qo'yildi ✅", relOff: "Klubingiz ro'yxatdan olindi",
      noticeText: "Bot a'zo bo'lishni so'ragan kanalda yangiliklar joriy qilinadi.",
      detailsText: "Botni haqiqiy futbol formatiga asta-sekin o'tkazib boramiz. Ishtirokchilar soni oshsa, ligalar soni 5 taga oshiriladi va Chempionlar ligasi ham qo'shiladi. Milliy ligadagi 1-o'rindan 6-o'ringacha bo'lgan klublar Chempionlar ligasida qatnashish imkoniyatiga ega bo'lishadi.",
      prizeText: 'Sovrinlar masalasida homiylarga mutanosib ravishda pul ham beriladi.' },
    en: { continents: { europe: 'Europe', asia: 'Asia', africa: 'Africa' }, pickCountry: 'Choose a country', cups: 'Tournaments', noLeagues: "This country's tournaments are coming soon", back: 'Back', full: 'FULL', open: 'OPEN', players: 'Players', max: 'Maximum', season: 'Season', register: 'Sign up', registered: 'You are signed up', pick: 'Pick a club',
      choose: 'Choose a league', clubs: 'Clubs in the league', rules: 'Rules', notice: 'Notice', details: 'Details', prize: 'Prize',
      nav: ['Home', 'Ranking', 'Profile', 'Prizes', 'Shop'], soon: 'Coming soon', ok: 'You are signed up ✅', taken: 'This club is taken', already: 'You are already signed up', fail: 'Error, please try again',
      rulesList: ['A match lasts **8 minutes**.', 'Double defence is **not allowed**.', 'Player condition must be **"Excellent"**.', 'No extra time or penalties.', 'The deadline is every day at **23:30**.', "If your opponent doesn't respond or enters the score wrongly — **contact the admin with a photo or video**."],
      myLeague: 'You are playing in this league', otherLeague: 'You are already in another league — only one league per season.', fullErr: 'League is full',
      releasing: 'Clubs being given up', relHint: 'Short of clubs? Take one of the clubs below as your own — with its table and results.', inLeagueNote: 'You are already playing in a league.', played: 'games played', take: 'Take', confirmTake: 'Take this club?', claimed: 'The club is yours ✅', gone: 'The club has already been taken', relOn: 'Your club has been listed ✅', relOff: 'Your club was removed from the list',
      noticeText: 'News is published in the channel the bot asks you to join.',
      detailsText: 'We are gradually moving the bot to a real football format. As the number of participants grows, the number of leagues will rise to 5 and a Champions League will be added. Clubs placed 1st to 6th in a national league will be able to enter the Champions League.',
      prizeText: 'Prize money is also paid out in proportion to sponsor funding.' },
    ru: { continents: { europe: 'Европа', asia: 'Азия', africa: 'Африка' }, pickCountry: 'Выберите страну', cups: 'Турниры', noLeagues: 'Турниры этой страны скоро появятся', back: 'Назад', full: 'ЗАПОЛНЕНА', open: 'ОТКРЫТА', players: 'Игроки', max: 'Максимум', season: 'Сезон', register: 'Записаться', registered: 'Вы записаны', pick: 'Выберите клуб',
      choose: 'Выбор лиги', clubs: 'Клубы лиги', rules: 'Правила', notice: 'Объявление', details: 'Подробнее', prize: 'Призы',
      nav: ['Главная', 'Рейтинг', 'Профиль', 'Призы', 'Магазин'], soon: 'Скоро', ok: 'Вы записаны ✅', taken: 'Этот клуб занят', already: 'Вы уже записаны', fail: 'Ошибка, попробуйте ещё раз',
      rulesList: ['Матч длится **8 минут**.', 'Двойную защиту включать **нельзя**.', 'Состояние игроков должно быть **«Excellent»**.', 'Дополнительного времени и пенальти **нет**.', 'Дедлайн каждый день в **23:30**.', 'Если соперник не отвечает или неверно вводит счёт — **обратитесь к админу с фото или видео**.'],
      myLeague: 'Вы участвуете в этой лиге', otherLeague: 'Вы уже участвуете в другой лиге — в сезоне можно играть только в одной.', fullErr: 'Лига заполнена',
      releasing: 'Клубы, которые отдают', relHint: 'Не хватило клубов? Оформите на себя один из клубов ниже — вместе с таблицей и результатами.', inLeagueNote: 'Вы уже участвуете в лиге.', played: 'игр сыграно', take: 'Взять', confirmTake: 'Взять этот клуб?', claimed: 'Клуб ваш ✅', gone: 'Клуб уже забрали', relOn: 'Ваш клуб выставлен в список ✅', relOff: 'Клуб убран из списка',
      noticeText: 'Новости публикуются в канале, на который бот просит подписаться.',
      detailsText: 'Мы постепенно переводим бота на формат настоящего футбола. С ростом числа участников лиг станет 5 и добавится Лига чемпионов. Клубы, занявшие в национальной лиге места с 1-го по 6-е, получат шанс сыграть в Лиге чемпионов.',
      prizeText: 'Денежные призы выплачиваются пропорционально средствам спонсоров.' },
  };
  const tg = window.Telegram?.WebApp;
  const EFL = window.EFL;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '' } }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));

  let prof = { league: null, club: null, pos: null, w: 0, d: 0, l: 0, games: [] }, tab = 'home', view = 'geo', country = null, cont = 'europe',
    rank = { group: '1', chip: 'laliga', league: 'laliga', rows: [] },
    data = { mine: null, stats: {}, releasing: [] }, // stats: { [ligaId]: { players, taken[] } }
    cur = null, selected = null, el, lang = 'uz', toast, firstLoad = true, settle;

  const stat = (id) => data.stats[id] || { players: 0, taken: [] };
  const isFull = (l) => stat(l.id).players >= l.max;

  const navHtml = (t, active) => `<nav class="l-nav">${['🏠', '🏆', '👤', '🎁', '⚽'].map((i, k) => `<button class="${k === active ? 'on' : ''}" data-act="${['home', 'rating', 'profile', 'soon', 'soon'][k]}"><span>${i}</span><small>${t.nav[k]}</small></button>`).join('')}</nav>`;

  // Reyting/Profil bo'limlari ro'yxatdan o'tgandan keyin ochiladi
  const nav = (t, active) => (data.mine ? navHtml(t, active) : '');

  function renderRating() {
    el.innerHTML = `<div class="page l-page"><button class="back" data-act="back"><span>‹</span> ${T[lang].back}</button>${window.RatingView.html(lang, rank)}</div>${nav(T[lang], 1)}`;
  }
  async function loadRank() {
    const id = rank.league, r = await api('/api/rankings/' + id);
    if (r.ok && id === rank.league) { rank.rows = r.rows; if (tab === 'rating') renderRating(); }
  }
  function openRating() {
    const id = data.mine?.league || cur || EFL.LEAGUES[0].id;
    rank = { group: String(EFL.byId[id].group), chip: id, league: id, rows: [] };
    tab = 'rating'; renderRating(); loadRank();
  }

  function renderProfile() {
    el.innerHTML = `<div class="page l-page">${window.ProfileView.html(lang, prof)}</div>${nav(T[lang], 2)}`;
  }
  async function loadProfile() {
    const r = await api('/api/profile');
    if (r.ok) { prof = r; if (tab === 'profile') renderProfile(); }
  }

  // ——— Bosh sahifa: liga karuseli ———
  function heroHtml() {
    const t = T[lang], l = EFL.byId[cur], s = stat(cur), full = isFull(l), mine = data.mine, mineHere = mine?.league === cur;
    const canReg = !mine && !full && selected;
    const btn = mineHere ? `✓ ${t.registered}: ${esc(EFL.clubName(cur, mine.club))}` : mine ? t.registered : full ? t.full : selected ? t.register : t.pick;
    return `<span class="l-badge ${full ? 'full' : 'open'}">${full ? t.full : t.open}</span>
      <div class="l-title"><img src="cards/leagues/${l.id}.png" alt="" onerror="this.remove()"><h2>${esc(l.name.toUpperCase())}</h2></div>
      <div class="l-stats"><div><b>${s.players}</b><small>${t.players}</small></div><div><b>${l.max}</b><small>${t.max}</small></div><div><b>${EFL.season}</b><small>${t.season}</small></div></div>
      <button class="l-reg" data-act="register" ${canReg ? '' : 'disabled'}>${btn}</button>`;
  }
  const cardHtml = (l) => {
    const t = T[lang], s = stat(l.id), full = isFull(l);
    return `<button class="lc${l.id === cur ? ' on' : ''}" data-lg="${l.id}"><img src="cards/leagues/${l.id}.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'lc-cup',textContent:'🏆'}))"><b>${esc(l.name)}</b><small>${s.players}/${l.max} ${t.players}</small><span class="l-badge ${full ? 'full' : 'open'}">${full ? t.full : t.open}</span></button>`;
  };
  function releasingHtml() {
    const t = T[lang], list = data.releasing, mine = data.mine;
    if (!list.length) return '';
    const items = list.map((r) => {
      const name = EFL.clubName(r.league, r.club), lg = EFL.byId[r.league]?.name || '';
      return `<div class="rl-item"><span class="crest"><img src="cards/clubs/${r.club}.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:this.dataset.i}))" data-i="${esc(name[0])}"></span>
        <span class="rl-info"><b>${esc(name)}</b><small>${esc(lg)} · ${r.games} ${t.played}</small></span>
        <button class="rl-take" data-claim="${esc(r.league)}|${esc(r.club)}" ${mine ? 'disabled' : ''}>${t.take}</button></div>`;
    }).join('');
    return `<div class="g-label"><span>${t.releasing} (${list.length})</span></div>
      <div class="g-card rl-box"><p>${esc(t.relHint)}</p>${mine ? `<p class="rl-warn">${esc(t.inLeagueNote)}</p>` : ''}${items}</div>`;
  }
  // Ro'yxatda bo'lmasa — tanlangan ligadagi klublar; bo'lsa — qaysi ligada ekani haqida xabar
  function belowHtml() {
    const t = T[lang], l = EFL.byId[cur], mine = data.mine, rel = releasingHtml();
    if (mine) {
      const here = mine.league === cur;
      return rel + `<div class="note n-info"><small>⚽ ${(here ? t.myLeague : t.otherLeague.split(' — ')[0]).toUpperCase()}</small><p>${here ? esc(EFL.clubName(cur, mine.club)) : esc(t.otherLeague)}</p></div>`;
    }
    const taken = stat(cur).taken, full = isFull(l);
    const clubs = l.clubs.map((c) => {
      const off = taken.includes(c.id) || full;
      return `<button class="club${selected === c.id ? ' sel' : ''}${off ? ' taken' : ''}" data-club="${c.id}" ${off ? 'disabled' : ''}>
        <span class="crest"><img src="cards/clubs/${c.id}.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:this.dataset.i}))" data-i="${esc(c.name[0])}"></span><span>${esc(c.name)}</span></button>`;
    }).join('');
    return rel + `<div class="g-label"><span>${t.clubs}</span></div><div class="clubs">${clubs}</div>`;
  }
  const updHero = () => { const h = el.querySelector('#lHero'); if (h) h.innerHTML = heroHtml(); };
  const updBelow = () => { const b = el.querySelector('#lBelow'); if (b) b.innerHTML = belowHtml(); };

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
      updHero(); updBelow();
    }, 90);
  }

  // ——— Qit'a -> davlat bayrog'i (2x6) ———
  function geoHtml() {
    const t = T[lang];
    const tabs = EFL.CONTINENTS.map((c) => `<button class="ct${c.id === cont ? ' on' : ''}${c.open ? '' : ' lock'}" data-cont="${c.id}">${c.open ? '' : '🔒 '}${esc(t.continents[c.id])}</button>`).join('');
    const flags = EFL.COUNTRIES.filter((c) => c.continent === cont).map((c) => `<button class="flag${EFL.leaguesOf(c.id).length ? '' : ' dim'}" data-country="${c.id}" aria-label="${esc(c.name[lang])}">${c.flag}</button>`).join('');
    return `<div class="page l-page">
      <button class="back" data-act="back"><span>‹</span> ${t.back}</button>
      <div class="ct-tabs">${tabs}</div>
      <div class="g-label"><span>${t.pickCountry}</span></div>
      <div class="flags">${flags}</div></div>${nav(t, 0)}`;
  }

  // ——— Davlat sahifasi: tepada kuboklar (turnirlar), keyin ro'yxatdan o'tish, pastda klublar ———
  function countryHtml() {
    const t = T[lang], c = EFL.countryById[country], ls = EFL.leaguesOf(country);
    const head = `<button class="back" data-act="back"><span>‹</span> ${t.back}</button>
      <div class="ct-head"><span class="ct-flag">${c.flag}</span><h2>${esc(c.name[lang])}</h2></div>`;
    if (!ls.length) return `<div class="page l-page">${head}<div class="note n-info"><small>🏆 ${t.cups.toUpperCase()}</small><p>${esc(t.noLeagues)}</p></div></div>${nav(t, 0)}`;
    return `<div class="page l-page">${head}
      <div class="g-label"><span>${t.cups}</span></div>
      <div class="lc-track" id="lTrack">${ls.map(cardHtml).join('')}</div>
      <div class="l-hero" id="lHero">${heroHtml()}</div>
      <div id="lBelow">${belowHtml()}</div>
      <div class="g-card l-rules"><h3>📋 ${t.rules}</h3><ul>${t.rulesList.map((x) => `<li>${rich(x)}</li>`).join('')}</ul></div>
      <div class="note n-info"><small>📢 ${t.notice.toUpperCase()}</small><p>${esc(t.noticeText)}</p></div>
      <div class="note n-det"><small>${t.details.toUpperCase()}</small><p>${esc(t.detailsText)}</p></div>
      <div class="note n-prize"><small>🏆 ${t.prize.toUpperCase()}</small><p>${esc(t.prizeText)}</p></div></div>
      ${nav(t, 0)}`;
  }

  function enterCountry(code) {
    const ls = EFL.leaguesOf(code);
    country = code; view = 'country'; selected = null;
    cur = (data.mine && ls.find((l) => l.id === data.mine.league)?.id) || ls[0]?.id || null;
    tg?.HapticFeedback?.selectionChanged();
    window.scrollTo(0, 0);
    render();
  }

  // Telegram/ilova "orqaga": davlat sahifasidan davlatlar ro'yxatiga. Boshqa joyda false qaytaradi.
  function back() {
    if (tab === 'home' && view === 'country') { view = 'geo'; selected = null; window.scrollTo(0, 0); render(); return true; }
    return false;
  }

  function render() {
    if (tab === 'rating') return renderRating();
    if (tab === 'profile') return renderProfile();
    el.innerHTML = view === 'country' && country ? countryHtml() : geoHtml();
    const tr = el.querySelector('#lTrack');
    if (tr) { centerOn(cur, false); nearest(tr); }
  }

  async function load() {
    const r = await api('/api/leagues');
    if (!r.ok) return;
    data = { mine: r.mine, releasing: r.releasing || [], stats: Object.fromEntries(r.leagues.map((l) => [l.id, { players: l.players, taken: l.taken }])) };
    if (firstLoad) { firstLoad = false; const m = r.mine && EFL.byId[r.mine.league]; if (view === 'country' && m && m.country === country) cur = m.id; }
    selected = null;
    if (tab === 'home') render();
  }

  async function claim(key) {
    const t = T[lang], [league, club] = key.split('|');
    const ok = await new Promise((res) => (tg?.showConfirm ? tg.showConfirm(t.confirmTake, res) : res(window.confirm(t.confirmTake))));
    if (!ok) return;
    const r = await api('/api/claim', { method: 'POST', body: JSON.stringify({ league, club }) });
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(t.claimed); }
    else toast(t[r.error] || t.fail);
    await load();
  }
  async function toggleRelease() {
    const t = T[lang], on = !prof.releasing, r = await api('/api/profile/release', { method: 'POST', body: JSON.stringify({ on }) });
    if (!r.ok) return toast(t.fail);
    prof.releasing = r.releasing; tg?.HapticFeedback?.notificationOccurred('success');
    toast(r.releasing ? t.relOn : t.relOff);
    if (tab === 'profile') renderProfile();
  }

  async function register() {
    const t = T[lang], r = await api(`/api/leagues/${cur}/register`, { method: 'POST', body: JSON.stringify({ club: selected }) });
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(t.ok); }
    else toast(t[r.error === 'full' ? 'fullErr' : r.error] || t.fail);
    await load();
  }

  function show(root, l, toastFn) {
    el = root; lang = l; toast = toastFn;
    render();
    if (el.dataset.loaded !== '1') { el.dataset.loaded = '1'; load(); }
    if (!el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener('scroll', (e) => { if (e.target.id === 'lTrack') onTrackScroll(e.target); }, { capture: true, passive: true });
      el.addEventListener('click', (e) => {
        const cl = e.target.closest('[data-claim]'), c = e.target.closest('[data-club]'), a = e.target.closest('[data-act]')?.dataset.act, lg = e.target.closest('[data-lg]'), ct = e.target.closest('[data-cont]'), cn = e.target.closest('[data-country]');
        if (ct) { const k = EFL.CONTINENTS.find((x) => x.id === ct.dataset.cont); if (k?.open) { cont = k.id; render(); } else { tg?.HapticFeedback?.impactOccurred('light'); toast(T[lang].soon); } }
        else if (cn) enterCountry(cn.dataset.country);
        else if (cl) { if (!cl.disabled) claim(cl.dataset.claim); }
        else if (lg && lg.dataset.lg !== cur) centerOn(lg.dataset.lg, true);
        else if (c && !c.disabled) { selected = c.dataset.club; tg?.HapticFeedback?.selectionChanged(); updHero(); updBelow(); }
        else if (a === 'register') register();
        else if (a === 'release') toggleRelease();
        else if (a === 'back') { if (!back()) location.hash = '#official'; }
        else if (a === 'soon') toast(T[lang].soon);
        else if (a === 'home') { tab = 'home'; render(); }
        else if (a === 'profile') { tab = 'profile'; renderProfile(); loadProfile(); }
        else if (a === 'rating') openRating();
        const g = e.target.closest('[data-grp]'), ch = e.target.closest('[data-chip]');
        if (g) {
          const first = EFL.LEAGUES.find((x) => String(x.group) === g.dataset.grp).id;
          rank = { group: g.dataset.grp, chip: first, league: first, rows: [] }; renderRating(); loadRank();
        } else if (ch) {
          const id = ch.dataset.chip;
          if (id === 'scorers') { rank.chip = id; renderRating(); }
          else { rank = { ...rank, chip: id, league: id, rows: [] }; renderRating(); loadRank(); }
        }
      });
    }
  }
  const leave = () => { if (el) el.dataset.loaded = ''; tab = 'home'; view = 'geo'; country = null; firstLoad = true; };
  return { show, leave, back };
})();
