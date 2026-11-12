// Chempionlar ligasi (UCL) — o'yinchi ko'rinishi: klub logotiplari, jadval, pley-off, o'z o'yinlari
window.UclView = (() => {
  const T = {
    uz: { title: 'Chempionlar ligasi', season: 'Mavsum', phase: { setup: 'Sozlanmoqda', league: 'Lig bosqichi', knockout: 'Pley-off', finished: 'Tugagan' },
      stage: { league: 'Lig bosqichi', qf: 'Chorak final', sf: 'Yarim final', final: 'Final' },
      champion: 'Chempion', standings: 'Lig jadvali', knockout: 'Pley-off', mine: 'Mening o\'yinlarim', none: 'Hali o\'yin yo\'q',
      notStarted: 'Turnir hali boshlanmagan', err: 'Yuklab bo\'lmadi', cols: { p: 'O', w: 'G', d: 'D', l: 'M', gd: 'Farq', pts: 'Ball' }, vs: 'VS', pending: 'kutilmoqda', qualified: 'Pley-offga o\'tadi' },
    en: { title: 'Champions League', season: 'Season', phase: { setup: 'Being set up', league: 'League phase', knockout: 'Knockout', finished: 'Finished' },
      stage: { league: 'League phase', qf: 'Quarter-finals', sf: 'Semi-finals', final: 'Final' },
      champion: 'Champion', standings: 'League table', knockout: 'Knockout', mine: 'My matches', none: 'No matches yet',
      notStarted: 'The tournament has not started', err: 'Could not load', cols: { p: 'P', w: 'W', d: 'D', l: 'L', gd: 'GD', pts: 'Pts' }, vs: 'VS', pending: 'pending', qualified: 'Advances to knockout' },
    ru: { title: 'Лига чемпионов', season: 'Сезон', phase: { setup: 'Настройка', league: 'Лиговый этап', knockout: 'Плей-офф', finished: 'Завершён' },
      stage: { league: 'Лиговый этап', qf: '1/4 финала', sf: '1/2 финала', final: 'Финал' },
      champion: 'Чемпион', standings: 'Таблица лиги', knockout: 'Плей-офф', mine: 'Мои матчи', none: 'Матчей пока нет',
      notStarted: 'Турнир ещё не начался', err: 'Не удалось загрузить', cols: { p: 'И', w: 'В', d: 'Н', l: 'П', gd: 'Р', pts: 'О' }, vs: 'VS', pending: 'ожидается', qualified: 'Выходит в плей-офф' },
  };
  let root = null, lang = 'uz', toastFn = () => {};
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = () => T[lang] || T.uz;
  const api = (path) => fetch(path, { headers: { 'Content-Type': 'application/json', 'x-init-data': window.Telegram?.WebApp?.initData || '' } })
    .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));

  // Logotip: klub ID va liga bo'lsa haqiqiy logo, bo'lmasa nom bosh harfi
  const crest = (ref, cls = 'uc-crest') => {
    if (!ref || !ref.league) return `<span class="${cls} uc-crest-ph">${esc((ref?.name || '?')[0])}</span>`;
    return window.EFL?.crest ? window.EFL.crest(ref.league, ref.clubId, ref.club || ref.name, cls) : `<span class="${cls} uc-crest-ph">${esc((ref.name || '?')[0])}</span>`;
  };
  const scoreTxt = (a, b) => (a == null || b == null ? '–' : `${a} : ${b}`);
  const stageLbl = (st) => (L().stage[st] || st);

  function hero(d) {
    const t = L();
    return `<div class="uc-hero">
      <div class="uc-hero-top"><span class="uc-badge">${esc(t.title)}</span><span class="uc-season">${t.season} ${new Date().getFullYear()}/${String(new Date().getFullYear() + 1).slice(2)}</span></div>
      <div class="uc-hero-title">${esc(t.title)}</div>
      <div class="uc-chips"><span class="uc-chip">${esc(t.phase[d.phase] || '')}</span>${d.stage ? `<span class="uc-chip uc-chip-hot">${esc(stageLbl(d.stage))}</span>` : ''}</div>
    </div>`;
  }

  function champion(d) {
    if (!d.champion || !d.championRef) return '';
    return `<div class="uc-champ">${crest(d.championRef, 'uc-crest uc-crest-lg')}
      <div><small>🏆 ${esc(L().champion)}</small><b>${esc(d.championRef.club || d.champion)}</b></div></div>`;
  }

  function myCards(d) {
    const t = L();
    if (!d.mine.length) return `<p class="uc-empty">${esc(t.none)}</p>`;
    return d.mine.map((m) => {
      const me = m.myRef, op = m.opponentRef;
      const sc = m.hg != null && m.ag != null ? scoreTxt(m.mine ? m.hg : m.ag, m.mine ? m.ag : m.hg) : t.vs;
      const won = m.hg != null && m.ag != null && (m.mine ? m.hg > m.ag : m.ag > m.hg);
      const lost = m.hg != null && m.ag != null && (m.mine ? m.hg < m.ag : m.ag < m.hg);
      return `<div class="uc-match ${won ? 'won' : lost ? 'lost' : ''}">
        <div class="uc-match-tag">${esc(stageLbl(m.stage))}${m.matchNo ? ` · #${m.matchNo}` : ''}</div>
        <div class="uc-match-row">
          <div class="uc-side">${crest(me)}<b>${esc(me?.club || '')}</b><small>${esc(me?.user || '')}</small></div>
          <div class="uc-score ${m.hg != null ? '' : 'uc-vs'}">${esc(sc)}</div>
          <div class="uc-side">${crest(op)}<b>${esc(op?.club || '')}</b><small>${esc(op?.user || '')}</small></div>
        </div></div>`;
    }).join('');
  }

  function table(d) {
    const t = L(), c = t.cols, k = d.knockoutSize || 0;
    if (!d.standings.length) return '';
    return `<div class="uc-table-wrap"><table class="uc-table">
      <thead><tr><th>#</th><th class="l">${esc(t.standings)}</th><th>${c.p}</th><th>${c.w}</th><th>${c.d}</th><th>${c.l}</th><th>${c.gd}</th><th>${c.pts}</th></tr></thead>
      <tbody>${d.standings.map((r, i) => {
        const q = d.phase !== 'setup' && i < k;
        const gd = (r.gf - r.ga);
        return `<tr class="${q ? 'q' : ''}"><td class="pos">${i + 1}</td>
          <td class="l"><div class="uc-trow">${crest(r.ref, 'uc-crest uc-crest-sm')}<span>${esc(r.name)}</span></div></td>
          <td>${r.w + r.d + r.l}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
          <td class="${gd > 0 ? 'pos-gd' : gd < 0 ? 'neg-gd' : ''}">${gd > 0 ? '+' + gd : gd}</td>
          <td class="pts">${r.pts}</td></tr>`;
      }).join('')}</tbody></table></div>
      ${k ? `<p class="uc-legend"><i></i>${esc(t.qualified)} (${k})</p>` : ''}`;
  }

  function bracket(d) {
    const t = L();
    const stages = ['qf', 'sf', 'final'];
    const cols = stages.map((st) => {
      const ms = d.knockout.filter((m) => m.stage === st);
      if (!ms.length) return '';
      return `<div class="uc-col"><div class="uc-col-h">${esc(stageLbl(st))}</div>${ms.map((m) => `
        <div class="uc-ko">
          <div class="uc-ko-team ${m.hg != null && m.ag != null && m.hg > m.ag ? 'w' : ''}">${crest(m.homeRef, 'uc-crest uc-crest-sm')}<span>${esc(m.homeRef?.club || m.home)}</span><b>${m.hg ?? '–'}</b></div>
          <div class="uc-ko-team ${m.hg != null && m.ag != null && m.ag > m.hg ? 'w' : ''}">${crest(m.awayRef, 'uc-crest uc-crest-sm')}<span>${esc(m.awayRef?.club || m.away)}</span><b>${m.ag ?? '–'}</b></div>
        </div>`).join('')}</div>`;
    }).join('');
    return cols ? `<div class="uc-bracket">${cols}</div>` : '';
  }

  function render(d) {
    const t = L();
    if (d.phase === 'setup') {
      root.innerHTML = `<div class="uc-wrap">${hero(d)}<p class="uc-empty">${esc(t.notStarted)}</p></div>`;
      return;
    }
    root.innerHTML = `<div class="uc-wrap">
      ${hero(d)}
      ${champion(d)}
      <section class="uc-sec"><h3>${esc(t.mine)}</h3><div class="uc-mine">${myCards(d)}</div></section>
      <section class="uc-sec"><h3>${esc(t.standings)}</h3>${table(d)}</section>
      ${d.knockout.length ? `<section class="uc-sec"><h3>${esc(t.knockout)}</h3>${bracket(d)}</section>` : ''}
    </div>`;
  }

  async function load() {
    const r = await api('/api/ucl');
    if (!r.ok) { root.innerHTML = `<p class="uc-empty">${esc(L().err)}</p>`; return; }
    render(r);
  }

  function show(el, l, toast) {
    root = el; lang = l || 'uz'; toastFn = toast || toastFn;
    root.hidden = false;
    root.innerHTML = '<p class="uc-empty">…</p>';
    load();
  }
  function leave() { if (root) root.hidden = true; }
  function back() { return false; }
  return { show, leave, back };
})();
