window.RatingView = (() => {
  const T = {
    uz: { title: 'Reyting jadvali', scorers: "To'p urarlar", player: "O'yinchi", goals: 'Gol', empty: "Hozircha o'yinchi yo'q", soon: 'Tez orada', form: 'Forma', fl: { W: 'G', D: 'D', L: 'M' },
      legend: ['Chempionlar ligasi (1–5)', 'Yevropa ligasi (6–10)', "6-o'rin: eng yaxshisi ChL, qolganlari YeL", "11-o'rin: eng yaxshi 2 tasi YeL", 'Quyi ligaga tushish zonasi'] },
    en: { title: 'Standings', scorers: 'Top scorers', player: 'Player', goals: 'Goals', empty: 'No players yet', soon: 'Coming soon', form: 'Form', fl: { W: 'W', D: 'D', L: 'L' },
      legend: ['Champions League (1–5)', 'Europa League (6–10)', '6th place: the best goes to CL, the rest to EL', '11th place: the best 2 go to EL', 'Relegation zone'] },
    ru: { title: 'Таблица рейтинга', scorers: 'Бомбардиры', player: 'Игрок', goals: 'Голы', empty: 'Пока нет игроков', soon: 'Скоро', form: 'Форма', fl: { W: 'В', D: 'Н', L: 'П' },
      legend: ['Лига чемпионов (1–5)', 'Лига Европы (6–10)', '6-е место: лучший в ЛЧ, остальные в ЛЕ', '11-е место: 2 лучших в ЛЕ', 'Зона вылета'] },
  };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const clubName = (league, id) => window.EFL.clubName(league, id);
  const crest = (lg, id) => `<img class="r-crest" src="${window.EFL.clubSrc(lg, id)}" loading="lazy" alt="" onerror="this.style.visibility='hidden'">`;
  const posCls = (p) => (p <= 5 ? 'cl' : p === 6 ? 'p6' : p <= 10 ? 'el' : p === 11 ? 'p11' : '');
  const zoneCls = (p, max) => (p <= 5 ? ' z-cl' : p <= 10 ? ' z-el' : p >= max - 2 ? ' z-rel' : '');
  const formHtml = (f, t) => `<td class="frm"><span class="fm">${(f || []).map((c) => `<i class="fd ${c.toLowerCase()}" title="${t.fl[c]}">${t.fl[c]}</i>`).join('') || '<em>—</em>'}</span></td>`;
  const medal = (p) => (p === 1 ? ' gold' : p === 2 ? ' silver' : p === 3 ? ' bronze' : '');

  // st: { chip (liga id | 'scorers'), league (oxirgi tanlangan liga id), rows }
  function html(lang, st) {
    const t = T[lang], isScorers = st.chip === 'scorers', max = window.EFL.byId[st.league]?.max || 20;
    const chips = window.EFL.LEAGUES.map(({ id, name }) => `<button class="chip${st.chip === id ? ' on' : ''}" data-chip="${id}"><img src="${window.EFL.leagueSrc(id)}" alt="" onerror="this.remove()">${esc(name)}</button>`).join('') +
      `<button class="chip${isScorers ? ' on' : ''}" data-chip="scorers">⚽ ${t.scorers}</button>`;
    let rows = st.rows || [];
    if (isScorers) rows = [...rows].sort((a, b) => b.gf - a.gf).map((r, i) => ({ ...r, pos: i + 1 }));
    const body = rows.map((r) => {
      const who = `<td class="pl"><div class="pl-in">${crest(st.league, r.club)}<span class="pl-txt"><b>${esc(clubName(st.league, r.club))}</b><small>${r.user ? '👤 ' + esc(r.user) : '—'}</small></span></div></td>`;
      const line = !isScorers && r.pos === max - 2 ? ' relegation' : '';
      const nums = isScorers ? `<td class="hl">${r.gf}</td>` : `<td class="hl">${r.pts}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td>${formHtml(r.form, t)}`;
      return `<tr class="${medal(r.pos).trim()}${line}${isScorers ? '' : zoneCls(r.pos, max)} pvrow" data-pv="${st.league}|${esc(r.club)}"><td class="ps"><span class="pos ${isScorers ? '' : posCls(r.pos)}">${r.pos}</span></td>${who}${nums}</tr>`;
    }).join('');
    const head = isScorers ? `<th>${t.goals}</th>` : `<th>B</th><th>G</th><th>D</th><th>M</th><th>GF</th><th>GA</th><th>GD</th><th class="frm">${t.form}</th>`;
    const legend = isScorers ? '' : `<div class="legend"><p><i class="pos cl">1</i>${t.legend[0]}</p><p><i class="pos el">7</i>${t.legend[1]}</p><p><i class="pos p6">6</i>${t.legend[2]}</p><p><i class="pos p11">11</i>${t.legend[3]}</p><p><i class="rline"></i>${t.legend[4]}</p></div>`;
    return `<div class="g-label"><span>${t.title}</span></div>
      ${st.single ? '' : `<div class="chips">${chips}</div>`}
      <div class="r-wrap"><table class="r-table"><thead><tr><th>#</th><th class="pl">${t.player}</th>${head}</tr></thead><tbody>${st.loading ? window.Skel.tableRows(8, isScorers ? 3 : 10) : body || `<tr><td colspan="10" class="empty">${t.empty}</td></tr>`}</tbody></table></div>${legend}`;
  }
  return { html, T };
})();
