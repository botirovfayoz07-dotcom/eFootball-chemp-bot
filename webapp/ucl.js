// Chempionlar ligasi (UCL) — o'yinchi ko'rinishi: jadval, pley-off, o'z o'yinlari
window.UclView = (() => {
  const T = {
    uz: { title: 'Chempionlar ligasi', phase: { setup: 'Sozlanmoqda', league: 'Lig bosqichi', knockout: 'Pley-off', finished: 'Tugagan' },
      stage: { league: 'Lig bosqichi', qf: 'Chorak final', sf: 'Yarim final', final: 'Final' },
      champion: 'Chempion', standings: 'Lig jadvali', knockout: 'Pley-off', mine: 'Mening o\'yinlarim', none: 'Hali o\'yin yo\'q',
      notStarted: 'Turnir hali boshlanmagan', vs: 'ga qarshi', pending: 'kutilmoqda', err: 'Yuklab bo\'lmadi', ph: 'Ichki', home: 'Uy', away: 'Mehmon' },
    en: { title: 'Champions League', phase: { setup: 'Being set up', league: 'League phase', knockout: 'Knockout', finished: 'Finished' },
      stage: { league: 'League phase', qf: 'Quarter-finals', sf: 'Semi-finals', final: 'Final' },
      champion: 'Champion', standings: 'League table', knockout: 'Knockout', mine: 'My matches', none: 'No matches yet',
      notStarted: 'The tournament has not started', vs: 'vs', pending: 'pending', err: 'Could not load', ph: 'Home', home: 'Home', away: 'Away' },
  };
  const T2 = { ...T, ru: T.en };
  let root = null, lang = 'uz', toastFn = () => {};
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = (path) => fetch(path, { headers: { 'Content-Type': 'application/json', 'x-init-data': window.Telegram?.WebApp?.initData || '' } })
    .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));

  const score = (hg, ag) => (hg == null || ag == null ? '—' : `${hg} : ${ag}`);

  function render(d) {
    const t = T2[lang] || T.uz;
    if (d.phase === 'setup') { root.innerHTML = `<div class="ucl-wrap"><h2>${t.title}</h2><p class="ucl-note">${t.notStarted}</p></div>`; return; }
    const sIdx = d.standings.length;
    root.innerHTML = `<div class="ucl-wrap">
      <h2>${t.title}</h2>
      <div class="ucl-meta">${t.phase[d.phase] || ''}${d.stage ? ` · ${t.stage[d.stage] || ''}` : ''}${d.champion ? ` · 🥇 ${t.champion}: <b>${esc(d.champion)}</b>` : ''}</div>
      ${d.mine.length ? `<h3>${t.mine}</h3>` + d.mine.map((m) => `<div class="ucl-row">
          <span class="ucl-tag">${t.stage[m.stage] || ''}${m.matchNo ? ` #${m.matchNo}` : ''}</span>
          <span>${esc(m.opponent)}</span>
          <b>${score(m.mine ? m.hg : m.ag, m.mine ? m.ag : m.hg)}</b></div>`).join('') : `<p class="ucl-note">${t.none}</p>`}
      <h3>${t.standings}</h3>
      <div class="ucl-scroll"><table class="ucl-table"><tr><th>#</th><th>${t.standings}</th><th>O</th><th>G</th><th>M</th><th>Ball</th></tr>
        ${d.standings.map((r, i) => `<tr class="${d.phase !== 'league' && i < 8 ? 'q' : ''}"><td>${i + 1}</td><td class="l">${esc(r.name)}</td><td>${r.w + r.d + r.l}</td><td>${r.w}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}
      </table></div>
      ${d.knockout.length ? `<h3>${t.knockout}</h3>` + ['qf', 'sf', 'final'].map((st) => {
        const ms = d.knockout.filter((m) => m.stage === st);
        return ms.length ? `<div class="ucl-tag">${t.stage[st]}</div>` + ms.map((m) => `<div class="ucl-row"><span>${esc(m.home)}</span><b>${score(m.hg, m.ag)}</b><span>${esc(m.away)}</span></div>`).join('') : '';
      }).join('') : ''}
    </div>`;
  }

  async function load() {
    const r = await api('/api/ucl');
    if (!r.ok) { root.innerHTML = `<p class="ucl-note">${(T2[lang] || T.uz).err}</p>`; return; }
    render(r);
  }

  function show(el, l, toast) {
    root = el; lang = l || 'uz'; toastFn = toast || toastFn;
    root.hidden = false; root.innerHTML = '<p class="ucl-note">…</p>';
    load();
  }
  function leave() { if (root) root.hidden = true; }
  // Orqaga: UCL dan rejimlar ro'yxatiga qaytish
  function back() { return false; }
  return { show, leave, back };
})();
