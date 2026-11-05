// "Me" bo'limi: profil kartasi, turnirlar panellari, Kolleksiya, klublarim
window.ProfileView = (() => {
  const T = {
    uz: { season: 'Mavsum', collection: 'Kolleksiya', collEmpty: "Hali yutilgan kubok yoki sotib olingan narsa yo'q", clubs: 'Klublarim', noClubs: "Hozircha klubingiz yo'q", games: "Mening o'yinlarim", none: "Hali o'yinlar yo'q", place: "O'rin", w: "G'alaba", d: 'Durang', l: "Mag'lubiyat", back: 'Ortga', leave: 'Klubdan voz kechaman', auction: "Auksionga qo'yaman", unauction: 'Auksiondan olish', onAuction: 'Auksionda', price: 'Narx',
      round: 'Tur', report: 'Hisob kiritish', edit: "Hisobni o'zgartirish", me: 'Men', opp: 'Raqib', send: 'Yuborish', waiting: 'Raqib tasdiqlashini kutmoqda', theirs: 'Raqib kiritgan hisob', ok: 'Tasdiqlash', fake: "Yolg'on", disputed: 'Hisob bekor qilindi — natijani admin kiritadi',
      sent: 'Hisob yuborildi, raqib tasdiqlashi kerak ✅', confirmed: "Tasdiqlandi — natija jadvalga o'tdi ✅", rejected: 'Hisob bekor qilindi, admin kiritadi', badScore: "Hisobni to'g'ri kiriting (0–99)", gone: "O'yin holati o'zgargan", fail: "Xatolik, qayta urinib ko'ring", confirmFake: "Hisobni yolg'on deb belgilaysizmi? U bekor bo'ladi va admin kiritadi.",
      tournaments: 'Turnirlar', qual: 'FA Cup saralash', shield: 'Community Shield', shieldWait: "Finalchilar hali aniqlanmagan — sezon oxirida paydo bo'ladi", drawAt: 'Qura marosimi', locked: 'Tur hali ochilmagan — raqib aniq, o\'yinni boshlash mumkin emas', openNow: 'Tur ochiq', deadline: 'Dedlayn', noDraw: 'Qura hali tashlanmagan', leaderboard: 'Jadval' },
    en: { season: 'Season', collection: 'Collection', collEmpty: 'No trophies won or items bought yet', clubs: 'My clubs', noClubs: 'You have no clubs yet', games: 'My games', none: 'No games yet', place: 'Place', w: 'Wins', d: 'Draws', l: 'Losses', back: 'Back', leave: 'Give up the club now', auction: 'Put on auction', unauction: 'Take off auction', onAuction: 'On auction', price: 'Price',
      round: 'Round', report: 'Enter score', edit: 'Change score', me: 'Me', opp: 'Opponent', send: 'Send', waiting: 'Waiting for the opponent to confirm', theirs: 'Score entered by opponent', ok: 'Confirm', fake: 'Fake', disputed: 'Score cancelled — the admin will enter the result',
      sent: 'Score sent, your opponent must confirm ✅', confirmed: 'Confirmed — the result is in the table ✅', rejected: 'Score cancelled, the admin will enter it', badScore: 'Enter a valid score (0–99)', gone: 'The match status has changed', fail: 'Error, please try again', confirmFake: 'Mark this score as fake? It will be cancelled and the admin will enter it.',
      tournaments: 'Tournaments', qual: 'FA Cup qualifying', shield: 'Community Shield', shieldWait: 'Finalists are not decided yet — appears at the end of the season', drawAt: 'Draw ceremony', locked: 'Round not opened yet — you can see the opponent but cannot play', openNow: 'Round is open', deadline: 'Deadline', noDraw: 'The draw has not been made yet', leaderboard: 'Standings' },
    ru: { season: 'Сезон', collection: 'Коллекция', collEmpty: 'Пока нет выигранных кубков или купленных предметов', clubs: 'Мои клубы', noClubs: 'У вас пока нет клубов', games: 'Мои игры', none: 'Игр пока нет', place: 'Место', w: 'Победы', d: 'Ничьи', l: 'Поражения', back: 'Назад', leave: 'Отказаться от клуба сейчас', auction: 'Выставить на аукцион', unauction: 'Снять с аукциона', onAuction: 'На аукционе', price: 'Цена',
      round: 'Тур', report: 'Ввести счёт', edit: 'Изменить счёт', me: 'Я', opp: 'Соперник', send: 'Отправить', waiting: 'Ждём подтверждения соперника', theirs: 'Счёт, введённый соперником', ok: 'Подтвердить', fake: 'Ложь', disputed: 'Счёт отменён — результат внесёт админ',
      sent: 'Счёт отправлен, соперник должен подтвердить ✅', confirmed: 'Подтверждено — результат в таблице ✅', rejected: 'Счёт отменён, его внесёт админ', badScore: 'Введите корректный счёт (0–99)', gone: 'Статус матча изменился', fail: 'Ошибка, попробуйте ещё раз', confirmFake: 'Отметить счёт как ложный? Он будет отменён, результат внесёт админ.',
      tournaments: 'Турниры', qual: 'Квалификация Кубка', shield: 'Суперкубок', shieldWait: 'Финалисты ещё не определены — появится в конце сезона', drawAt: 'Жеребьёвка', locked: 'Тур ещё не открыт — соперник виден, но играть нельзя', openNow: 'Тур открыт', deadline: 'Дедлайн', noDraw: 'Жеребьёвка ещё не проведена', leaderboard: 'Таблица' },
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const key = (c) => c.league + '|' + c.club;

  const btn = (act, id, label, cls = '') => `<button class="gm-btn sm ${cls}" data-act="${act}" data-gid="${esc(id)}">${label}</button>`;
  // O'yin qatori (ixcham): tur · mening klubim  hisob  raqib klubi · holat/tugma · chat. Natija kiritish — alohida oynada
  function gameHtml(t, g, sel, lang) {
    const M = window.MatchView.T[lang] || window.MatchView.T.uz, EFL = window.EFL;
    const mine = EFL.crest(sel.league, sel.club, '', 'crest'), opp = EFL.crest(sel.league, g.oppClub, g.opponent, 'crest');
    let score = '<b class="gm2-s none">–:–</b>', chip = '', act = '', extra = '';
    if (g.status === 'confirmed') { score = `<b class="gm2-s">${esc(g.score)}</b>`; chip = `<span class="gm-chip ok">${M.cConfirmed}</span>`; }
    else if (g.status === 'scheduled' && g.locked) { chip = `<span class="gm-chip wait">🔒</span>`; extra = `<p class="gm-note">🔒 ${t.roundLocked || 'Tur hali ochilmagan'}</p>`; }
    else if (g.status === 'scheduled') act = btn('m-result', g.id, M.result, 'ok');
    else if (g.status === 'pending' && g.byMe) { score = `<b class="gm2-s wait">${esc(g.score)}</b>`; chip = `<span class="gm-chip wait">${M.cPending}</span>`; act = btn('m-result', g.id, '✎', 'ghost'); extra = `<p class="gm-note">⏳ ${t.waiting}</p>`; }
    else if (g.status === 'pending') { score = `<b class="gm2-s wait">${esc(g.score)}</b>`; chip = `<span class="gm-chip wait">${M.cPending}</span>`; extra = `<p class="gm-note">${t.theirs}</p><div class="gm-row">${btn('g-ok', g.id, '✅ ' + t.ok, 'ok')}${btn('m-bad', g.id, '❌ ' + t.fake, 'bad')}</div>`; }
    else if (g.status === 'disputed') {
      chip = `<span class="gm-chip bad">${M.cDisputed}</span>`; act = btn('m-proof', g.id, '📎 ' + M.addProof, 'ghost');
      extra = `<p class="gm-note bad">⚠️ ${t.disputed}${g.claimScore ? ` (${esc(g.claimScore)})` : ''}${g.proofs ? ` · 📎 ${g.proofs}` : ''}</p>`;
    }
    const chat = `<button class="gm-chat" data-act="m-actions" data-gid="${esc(g.id)}">💬${g.unread ? `<i>${g.unread}</i>` : ''}</button>`;
    return `<div class="g-card gm2"><div class="gm2-main"><span class="gm2-r">${g.round}</span><span class="gm2-t">${mine}${score}${opp}</span><span class="gm2-a">${chip}${act}${chat}</span></div>
      <div class="gm2-who"><b>${esc(g.opponent || '—')}</b>${g.user ? ` <em>${esc(g.user)}</em>` : ''}</div>${extra}</div>`;
  }

  const dt = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    let cdTimer = null;
  const left = (ms) => {
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    const p = (n) => String(n).padStart(2, '0');
    return d > 0 ? `${d}k ${p(Math.floor(s % 86400 / 3600))}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`
                 : `${p(Math.floor(s / 3600))}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`;
  };
  function startCd() {
    if (cdTimer) return;
    cdTimer = setInterval(() => {
      document.querySelectorAll('[data-cd]').forEach((e) => {
        const ms = Date.parse(e.dataset.cd) - Date.now();
        e.textContent = ms > 0 ? left(ms) : 'boshlandi';
      });
    }, 1000);
  }
  // ——— FA Cup / Community Shield panellari ———
  function cupPanels(t, st, EFL) {
    const c = st.cups;
    if (!c || !c.stages) return '';
    const stageOf = (r) => c.stages.find((s) => s.round === r) || {};
    const my = (c.myMatches || []).map((m) => {
      const s = stageOf(m.round);
      if (!s.label) s.label = m.round === 8 ? 'Community Shield' : `Tur ${m.round}`;
      const oppName = m.oppClub ? EFL.clubName(m.oppLeague || '', m.oppClub) : '—';
      const score = (m.hg != null && m.ag != null) ? `${m.mine ? m.hg : m.ag}:${m.mine ? m.ag : m.hg}` : '–:–';
      const locked = !s.startedAt;
      const chip = m.status === 'confirmed' ? 'ok' : m.status === 'disputed' ? 'bad' : 'wait';
      return `<div class="cup-row" data-act="m-actions" data-gid="${esc(m.id)}">
        <span class="cup-r">${esc(s.label || m.round)}</span>
        <b>${esc(oppName)}</b>
        <span class="cup-s ${m.status}">${esc(score)}</span>
        <span class="cup-chip ${chip}">${locked ? '🔒' : ''} ${m.status === 'confirmed' ? '✓' : m.status === 'pending' ? '⏳' : m.status === 'disputed' ? '⚠️' : ''}</span>
      </div>`;
    }).join('');
    startCd();

    const qual = c.stages.filter((s) => ['pl-q', 'ch-q1', 'ch-q2'].includes(s.stage));
    const qLines = qual.map((s) => `<div class="cup-st-row"><span>${esc(s.label)}</span><em>${s.drawnAt ? `${s.teams} klub` : (s.drawAt ? `🎲 ${dt(s.drawAt)}` : t.noDraw)}</em></div>`).join('');
    const drawAt = qual.map((s) => s.drawAt).filter(Boolean).sort()[0];

    return `<div class="g-label"><span>${t.tournaments}</span></div>
      <div class="cup-panels">
                <div class="cup-panel" data-act="cup-open">
          <div class="cup-h">🏆 ${t.qual} <em>›</em></div>
          ${qLines}
          ${drawAt ? `<p class="cup-note">🎲 ${t.drawAt}: <b>${dt(drawAt)}</b> · <em data-cd="${drawAt}"></em></p>` : ''}
          ${my || `<p class="cup-note">${t.none}</p>`}
        </div>
        <div class="cup-panel">
          /* KEYIN */
        <div class="cup-panel">
          <div class="cup-h">🛡 ${t.shield}</div>
          ${!c.shield
            ? `<p class="cup-note">${t.shieldWait}</p>`
            : `<p class="cup-note">Finalchilar: <b>${c.shield.teams === 1 ? "1 (o'yinsiz g'olib)" : c.shield.teams}</b>${c.shield.startedAt ? ` · ${t.openNow}` : ` · ${t.locked}`}${c.shield.deadline ? ` · ${t.deadline}: ${dt(c.shield.deadline)}` : ''}</p>`}
        </div>
      </div>`;
  }

  // st: { clubs, collection, sel, openGame, cups }
  function html(lang, st) {
    const t = T[lang], EFL = window.EFL, u = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const avatar = u.photo_url ? `<img src="${esc(u.photo_url)}" alt="">` : `<b>${esc((u.first_name || '?')[0])}</b>`;
    const sel = st.sel && (st.clubs || []).find((c) => key(c) === st.sel);

    if (sel) {                       // ——— klub ichida ———
      const name = EFL.clubName(sel.league, sel.club), lg = EFL.byId[sel.league]?.name || '';
      const games = (sel.games || []).map((g) => gameHtml(t, g, sel, lang)).join('');
      return `<button class="back" data-act="meback"><span>‹</span> ${t.back}</button>
        <div class="cl-top">
          <button class="cl-btn leave" data-act="leave">🚪 ${t.leave}</button>
          <button class="cl-btn auc${sel.auction ? ' on' : ''}" data-act="${sel.auction ? 'unauction' : 'auction'}">${sel.auction ? '↩ ' + t.unauction : '🔨 ' + t.auction}</button>
        </div>
        <div class="pf-card"><div class="pf-ava">${EFL.crest(sel.league, sel.club, name, 'crest')}</div>
          <div class="pf-info"><h2>${esc(name)}</h2><p>${esc(lg)}</p>${sel.auction ? `<a>🔨 ${t.onAuction}: ${esc(sel.auction.price)} ${window.ShopView.coin('sm')}</a>` : ''}</div></div>
        <div class="pf-stats"><div><b>${sel.pos ? '#' + sel.pos : '—'}</b><small>${t.place}</small></div><div><b>${sel.w}</b><small>${t.w}</small></div><div><b>${sel.d}</b><small>${t.d}</small></div><div><b>${sel.l}</b><small>${t.l}</small></div></div>
        <div class="g-label"><span>${t.games}</span></div>
        ${games || `<div class="pf-empty"><span>⚽</span><p>${t.none}</p></div>`}`;
    }

    // ——— asosiy: profil · Turnirlar · Kolleksiya · klub logolari ———
    const SELLING = { uz: 'Sotilmoqda', en: 'Selling', ru: 'Продаётся' };
    const coll = (st.collection || []).map((c) => {
      if (c.kind === 'trophy') return `<div class="coll-item trophy"><span class="coll-img">${window.ShopView.cupImg(c.cup)}</span><b>${esc(EFL.byId[c.cup]?.name || c.cup)}</b><small>${t.season} ${esc(c.season)}${c.selling ? ' · ⏳ ' + SELLING[lang] : ''}</small></div>`;
      const it = window.SHOP.findItem(c.id);
      return it ? `<div class="coll-item"><span>${it.kind === 'frame' ? '⭕' : '🌌'}</span><b>${esc(it.name[lang] || it.name.uz)}</b></div>` : '';
    }).join('');
    const eq = st.equipped || {};
    const tiles = (st.clubs || []).map((c) => {
      const name = EFL.clubName(c.league, c.club);
      return `<button class="mc" data-mc="${esc(key(c))}">${EFL.crest(c.league, c.club, name)}<b>${esc(name)}</b><small>${esc(EFL.byId[c.league]?.name || '')}</small>${c.auction ? '<em>🔨</em>' : ''}</button>`;
    }).join('');
    const adminTile = `<button class="mc" data-act="staffpanel"><span style="font-size:40px;line-height:1">🛠</span><b>Admin panel</b><small>Turlar · dedlayn</small></button>`;
    return `<button class="back" data-act="back"><span>‹</span> ${t.back}</button>
      <div class="pf-card ${window.ShopView.bgClass(eq.bg)}"${u.username ? ` data-tgu="${esc(u.username)}" style="cursor:pointer"` : ''}><div class="pf-ava${eq.frame ? ' fr-' + eq.frame : ''}">${avatar}</div>
        <div class="pf-info"><h2>${esc(u.first_name || '')}</h2>${u.username ? `<a>@${esc(u.username)}</a>` : ''}</div></div>
      <button class="sup-card" data-act="m-support"><span class="sup-ic">🛟</span><span class="sup-tx"><b>${window.MatchView.T[lang].supportCard}</b><small>${window.MatchView.T[lang].supportDesc}</small></span>${st.supportUnread ? `<i class="gm-badge">${st.supportUnread}</i>` : `<em>›</em>`}</button>
      <div class="g-label"><span>${t.collection}</span></div>
      ${coll ? `<div class="coll">${coll}</div>` : `<div class="pf-empty"><span>🏆</span><p>${t.collEmpty}</p></div>`}
      <div class="g-label"><span>${t.clubs}</span></div>
      ${tiles || st.staff ? `<div class="myclubs">${tiles}${st.staff ? adminTile : ''}</div>` : `<div class="pf-empty"><span>⚽</span><p>${t.noClubs}</p></div>`}
      ${cupPanels(t, st, EFL)}`;
  }

  // Boshqa ishtirokchi profili (faqat ko'rish): kolleksiya va klublar
  function publicHtml(lang, d) {
    const t = T[lang], EFL = window.EFL, eq = d.equipped || {};
    const coll = (d.collection || []).map((c) => {
      if (c.kind === 'trophy') return `<div class="coll-item trophy"><span class="coll-img">${window.ShopView.cupImg(c.cup)}</span><b>${esc(EFL.byId[c.cup]?.name || c.cup)}</b><small>${t.season} ${esc(c.season)}</small></div>`;
      const it = window.SHOP.findItem(c.id);
      return it ? `<div class="coll-item"><span>${it.kind === 'frame' ? '⭕' : '🌌'}</span><b>${esc(it.name[lang] || it.name.uz)}</b></div>` : '';
    }).join('');
    const tiles = (d.clubs || []).map((c) => {
      const name = EFL.clubName(c.league, c.club);
      return `<div class="mc">${EFL.crest(c.league, c.club, name)}<b>${esc(name)}</b><small>${esc(EFL.byId[c.league]?.name || '')}${c.pos ? ' · #' + c.pos : ''}</small></div>`;
    }).join('');
    return `<button class="back" data-act="pvback"><span>‹</span> ${t.back}</button>
      <div class="pf-card ${window.ShopView.bgClass(eq.bg)}"${d.username ? ` data-tgu="${esc(d.username)}" style="cursor:pointer"` : ''}><div class="pf-ava ph${eq.frame ? ' fr-' + eq.frame : ''}"><b>${esc((d.name || d.username || '?')[0])}</b>${d.photo ? `<img src="${esc(d.photo)}" alt="" onerror="this.remove()">` : ''}</div>
        <div class="pf-info"><h2>${esc(d.name || '')}</h2>${d.username ? `<a>@${esc(d.username)}</a>` : ''}</div></div>
      <div class="g-label"><span>${t.collection}</span></div>
      ${coll ? `<div class="coll">${coll}</div>` : `<div class="pf-empty"><span>🏆</span><p>${t.collEmpty}</p></div>`}
      <div class="g-label"><span>${t.clubs}</span></div>
      ${tiles ? `<div class="myclubs">${tiles}</div>` : `<div class="pf-empty"><span>⚽</span><p>${t.noClubs}</p></div>`}`;
  }
  return { html, publicHtml, T };
})();