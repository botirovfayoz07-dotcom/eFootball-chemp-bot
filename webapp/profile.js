window.ProfileView = (() => {
  const T = {
    uz: { stats: 'Statistika', place: "O'rin", w: "G'alaba", d: 'Durang', l: "Mag'lubiyat", games: "Mening o'yinlarim", none: "Hali o'yinlar yo'q", noClub: 'Klub tanlanmagan',
      release: 'Klubimni topshiraman', relOff: "Yoqsangiz, klubingiz bosh sahifadagi ro'yxatga chiqadi. Kimdir olsa — siz ligadan chiqasiz.", relOn: "⏳ Klubingiz ro'yxatda. Kimdir olsa, sizga xabar keladi. Fikringiz o'zgarsa — o'chiring." },
    en: { stats: 'Statistics', place: 'Place', w: 'Wins', d: 'Draws', l: 'Losses', games: 'My games', none: 'No games yet', noClub: 'No club selected',
      release: 'I am giving up my club', relOff: 'If on, your club appears in the list on the home page. If someone takes it, you leave the league.', relOn: '⏳ Your club is listed. You will be notified if someone takes it. Changed your mind — turn it off.' },
    ru: { stats: 'Статистика', place: 'Место', w: 'Победы', d: 'Ничьи', l: 'Поражения', games: 'Мои игры', none: 'Игр пока нет', noClub: 'Клуб не выбран',
      release: 'Отдаю свой клуб', relOff: 'Если включить, клуб появится в списке на главной. Если кто-то его возьмёт — вы выйдете из лиги.', relOn: '⏳ Ваш клуб в списке. Если кто-то возьмёт его, вам придёт сообщение. Передумали — выключите.' },
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // st: { league, club, pos, w, d, l, games[] }
  function html(lang, st) {
    const t = T[lang], u = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const club = st.club ? { id: st.club, name: window.EFL.clubName(st.league, st.club) } : null;
    const avatar = u.photo_url ? `<img src="${esc(u.photo_url)}" alt="">` : `<b>${esc((u.first_name || '?')[0])}</b>`;
    const games = (st.games || []).map((g) => `<div class="g-card pf-game"><b>${esc(g.opponent)}</b><span>${esc(g.score)}</span></div>`).join('');
    return `<div class="pf-card"><div class="pf-ava">${avatar}</div>
      <div class="pf-info"><h2>${esc(club?.name || t.noClub)}</h2><p>${esc(u.first_name || '')}</p>${u.username ? `<a>@${esc(u.username)}</a>` : ''}</div>
      ${club ? `<img class="pf-crest" src="cards/clubs/${club.id}.png" alt="" onerror="this.style.visibility='hidden'">` : ''}</div>
      ${club ? `<button class="rel-card${st.releasing ? ' on' : ''}" data-act="release"><span class="rel-txt"><b>${t.release}</b><small>${esc(club.name)} · ${esc(window.EFL.byId[st.league]?.name || '')}</small><em>${st.releasing ? t.relOn : t.relOff}</em></span><i class="sw${st.releasing ? ' on' : ''}"></i></button>` : ''}
      <div class="g-label"><span>${t.stats}</span></div>
      <div class="pf-stats"><div><b>${st.pos ? '#' + st.pos : '—'}</b><small>${t.place}</small></div><div><b>${st.w}</b><small>${t.w}</small></div><div><b>${st.d}</b><small>${t.d}</small></div><div><b>${st.l}</b><small>${t.l}</small></div></div>
      <div class="g-label"><span>${t.games}</span></div>
      ${games || `<div class="pf-empty"><span>⚽</span><p>${t.none}</p></div>`}`;
  }
  return { html };
})();
