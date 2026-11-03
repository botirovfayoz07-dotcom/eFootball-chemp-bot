window.ProfileView = (() => {
  const T = {
    uz: { stats: 'Statistika', place: "O'rin", w: "G'alaba", d: 'Durang', l: "Mag'lubiyat", games: "Mening o'yinlarim", none: "Hali o'yinlar yo'q", noClub: 'Klub tanlanmagan',
      round: 'Tur', report: 'Hisob kiritish', edit: "Hisobni o'zgartirish", me: 'Men', opp: 'Raqib', send: 'Yuborish', waiting: 'Raqib tasdiqlashini kutmoqda', theirs: 'Raqib kiritgan hisob', ok: 'Tasdiqlash', fake: "Yolg'on", disputed: 'Hisob bekor qilindi — natijani admin kiritadi',
      sent: 'Hisob yuborildi, raqib tasdiqlashi kerak ✅', confirmed: "Tasdiqlandi — natija jadvalga o'tdi ✅", rejected: "Hisob bekor qilindi, admin kiritadi", badScore: "Hisobni to'g'ri kiriting (0–99)", gone: "O'yin holati o'zgargan", fail: "Xatolik, qayta urinib ko'ring", confirmFake: "Hisobni yolg'on deb belgilaysizmi? U bekor bo'ladi va admin kiritadi.",
      release: 'Klubimni topshiraman', relOff: "Yoqsangiz, klubingiz bosh sahifadagi ro'yxatga chiqadi. Kimdir olsa — siz ligadan chiqasiz.", relOn: "⏳ Klubingiz ro'yxatda. Kimdir olsa, sizga xabar keladi. Fikringiz o'zgarsa — o'chiring." },
    en: { stats: 'Statistics', place: 'Place', w: 'Wins', d: 'Draws', l: 'Losses', games: 'My games', none: 'No games yet', noClub: 'No club selected',
      round: 'Round', report: 'Enter score', edit: 'Change score', me: 'Me', opp: 'Opponent', send: 'Send', waiting: 'Waiting for the opponent to confirm', theirs: 'Score entered by opponent', ok: 'Confirm', fake: 'Fake', disputed: 'Score cancelled — the admin will enter the result',
      sent: 'Score sent, your opponent must confirm ✅', confirmed: 'Confirmed — the result is in the table ✅', rejected: 'Score cancelled, the admin will enter it', badScore: 'Enter a valid score (0–99)', gone: 'The match status has changed', fail: 'Error, please try again', confirmFake: 'Mark this score as fake? It will be cancelled and the admin will enter it.',
      release: 'I am giving up my club', relOff: 'If on, your club appears in the list on the home page. If someone takes it, you leave the league.', relOn: '⏳ Your club is listed. You will be notified if someone takes it. Changed your mind — turn it off.' },
    ru: { stats: 'Статистика', place: 'Место', w: 'Победы', d: 'Ничьи', l: 'Поражения', games: 'Мои игры', none: 'Игр пока нет', noClub: 'Клуб не выбран',
      round: 'Тур', report: 'Ввести счёт', edit: 'Изменить счёт', me: 'Я', opp: 'Соперник', send: 'Отправить', waiting: 'Ждём подтверждения соперника', theirs: 'Счёт, введённый соперником', ok: 'Подтвердить', fake: 'Ложь', disputed: 'Счёт отменён — результат внесёт админ',
      sent: 'Счёт отправлен, соперник должен подтвердить ✅', confirmed: 'Подтверждено — результат в таблице ✅', rejected: 'Счёт отменён, его внесёт админ', badScore: 'Введите корректный счёт (0–99)', gone: 'Статус матча изменился', fail: 'Ошибка, попробуйте ещё раз', confirmFake: 'Отметить счёт как ложный? Он будет отменён, результат внесёт админ.',
      release: 'Отдаю свой клуб', relOff: 'Если включить, клуб появится в списке на главной. Если кто-то его возьмёт — вы выйдете из лиги.', relOn: '⏳ Ваш клуб в списке. Если кто-то возьмёт его, вам придёт сообщение. Передумали — выключите.' },
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const btn = (act, id, label, cls = '') => `<button class="gm-btn ${cls}" data-act="${act}" data-gid="${esc(id)}">${label}</button>`;
  function gameHtml(t, g, open) {
    const who = `<div class="gm-top"><small>${t.round} ${g.round}</small><b>${esc(g.opponent || '—')}</b>${g.user ? `<em>${esc(g.user)}</em>` : ''}</div>`;
    let side = '', extra = '';
    if (g.status === 'confirmed') side = `<span class="gm-score">${esc(g.score)}</span>`;
    else if (g.status === 'scheduled') side = btn('g-open', g.id, t.report);
    else if (g.status === 'pending' && g.byMe) { side = `<span class="gm-score wait">${esc(g.score)}</span>`; extra = `<p class="gm-note">⏳ ${t.waiting}</p>${btn('g-open', g.id, t.edit, 'ghost')}`; }
    else if (g.status === 'pending') { side = `<span class="gm-score wait">${esc(g.score)}</span>`; extra = `<p class="gm-note">${t.theirs}</p><div class="gm-row">${btn('g-ok', g.id, '✅ ' + t.ok, 'ok')}${btn('g-bad', g.id, '❌ ' + t.fake, 'bad')}</div>`; }
    else if (g.status === 'disputed') extra = `<p class="gm-note bad">⚠️ ${t.disputed}</p>`;
    const form = open ? `<div class="gm-form" data-box="${esc(g.id)}"><label>${t.me}<input type="number" inputmode="numeric" min="0" max="99" data-in="my"></label><b>:</b><label>${t.opp}<input type="number" inputmode="numeric" min="0" max="99" data-in="opp"></label>${btn('g-send', g.id, t.send, 'ok')}</div>` : '';
    return `<div class="g-card pf-game gm"><div class="gm-main">${who}${side}</div>${extra}${form}</div>`;
  }

  // st: { league, club, pos, w, d, l, games[], openGame }
  function html(lang, st) {
    const t = T[lang], u = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const club = st.club ? { id: st.club, name: window.EFL.clubName(st.league, st.club) } : null;
    const avatar = u.photo_url ? `<img src="${esc(u.photo_url)}" alt="">` : `<b>${esc((u.first_name || '?')[0])}</b>`;
    const games = (st.games || []).map((g) => gameHtml(t, g, st.openGame === g.id)).join('');
    return `<div class="pf-card"><div class="pf-ava">${avatar}</div>
      <div class="pf-info"><h2>${esc(club?.name || t.noClub)}</h2><p>${esc(u.first_name || '')}</p>${u.username ? `<a>@${esc(u.username)}</a>` : ''}</div>
      ${club ? `<img class="pf-crest" src="cards/clubs/${club.id}.png" alt="" onerror="this.style.visibility='hidden'">` : ''}</div>
      ${club ? `<button class="rel-card${st.releasing ? ' on' : ''}" data-act="release"><span class="rel-txt"><b>${t.release}</b><small>${esc(club.name)} · ${esc(window.EFL.byId[st.league]?.name || '')}</small><em>${st.releasing ? t.relOn : t.relOff}</em></span><i class="sw${st.releasing ? ' on' : ''}"></i></button>` : ''}
      <div class="g-label"><span>${t.stats}</span></div>
      <div class="pf-stats"><div><b>${st.pos ? '#' + st.pos : '—'}</b><small>${t.place}</small></div><div><b>${st.w}</b><small>${t.w}</small></div><div><b>${st.d}</b><small>${t.d}</small></div><div><b>${st.l}</b><small>${t.l}</small></div></div>
      <div class="g-label"><span>${t.games}</span></div>
      ${games || `<div class="pf-empty"><span>⚽</span><p>${t.none}</p></div>`}`;
  }
  return { html, T };
})();
