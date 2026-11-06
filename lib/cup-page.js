// FA Cup sahifasi: Saralash · Bracket · Current round · Scorers
window.CupPage = (() => {
  const tg = window.Telegram?.WebApp;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const api = (p) => fetch(p, { headers: { 'x-init-data': tg?.initData || '' } }).then((r) => r.json()).catch(() => null);
  const EFL = () => window.EFL;

  let S = null, tab = 'qual', box = null, toast = null;
  const cupName = () => S?.cupName || 'FA Cup';
  const TABS = [['qual', 'Saralash'], ['bracket', 'Bracket'], ['round', 'Current round'], ['scorers', 'Scorers']];

  const T = {
    uz: { back: 'Ortga', report: 'Natija kiritish', chat: 'Chat', msg: 'Xabar yuborish', goals: 'Gol',
      empty: "Hali o'yin yo'q", drawSoon: 'Qura hali tashlanmagan', notStarted: 'Tur hali ochilmagan',
      final: 'Final', semi: 'Yarim final', quarter: '1/4 final', r16: '1/8 final', trophy: 'FA Cup' },
    en: { back: 'Back', report: 'Enter result', chat: 'Chat', msg: 'Send message', goals: 'Goals',
      empty: 'No matches yet', drawSoon: 'The draw is not made yet', notStarted: 'Round is not open yet',
      final: 'Final', semi: 'Semi-final', quarter: 'Quarter-final', r16: 'Round of 16', trophy: 'FA Cup' },
    ru: { back: 'Назад', report: 'Ввести счёт', chat: 'Чат', msg: 'Написать', goals: 'Голы',
      empty: 'Игр пока нет', drawSoon: 'Жеребьёвка ещё не проведена', notStarted: 'Тур ещё не открыт',
      final: 'Финал', semi: 'Полуфинал', quarter: '1/4 финала', r16: '1/8 финала', trophy: 'Кубок Англии' },
  };
  let lang = 'uz';
  const t = () => T[lang] || T.uz;

  const crest = (s) => (s && s.league ? EFL().crest(s.league, s.clubId, s.club, 'crest') : '');
  const stageByRound = (r) => (S?.stages || []).find((x) => x.round === r) || {};
  const roundLabel = (r) => { const s = stageByRound(r); if (s.label) return s.label; return r === 4 ? t().r16 : r === 5 ? t().quarter : r === 6 ? t().semi : r === 7 ? t().final : `Tur ${r}`; };
  const scoreOf = (m) => (m.hg != null && m.ag != null ? `${m.hg} : ${m.ag}` : '– : –');

  // ——— Katta o'yin kartasi (Saralash) ———
  function myCard(m) {
    const me = m.home.tg === tg?.initDataUnsafe?.user?.id ? m.home : m.away;
    const opp = me === m.home ? m.away : m.home;
    const st = stageByRound(m.round);
    const locked = !st.startedAt || (st.deadline && new Date(st.deadline) < new Date());
    const confirmed = m.status === 'confirmed';
    return `<div class="cp-match ${m.status}">
      <div class="cp-mtop"><small>${esc(roundLabel(m.round))}</small>${confirmed ? '<i class="cp-ok">✓</i>' : locked ? '<i class="cp-lock">🔒</i>' : ''}</div>
      <div class="cp-line">
        <div class="cp-side">${crest(me)}<b>${esc(me.club)}</b></div>
        <div class="cp-score ${m.status === 'pending' ? 'wait' : ''}">${scoreOf(m)}</div>
        <div class="cp-side r">${crest(opp)}<b>${esc(opp.club)}</b></div>
      </div>
      ${locked && !confirmed ? `<p class="cp-note">🔒 ${t().notStarted}</p>` : ''}
      ${!locked && !confirmed ? `<div class="cp-acts">
        <button class="cp-btn ok" data-cp="report" data-id="${esc(m.id)}">${t().report}</button>
        <button class="cp-btn" data-cp="chat" data-id="${esc(m.id)}">💬 ${t().chat}</button>
      </div>` : ''}
    </div>`;
  }

  function qualHtml() {
    const my = (S.my || []).slice().sort((a, b) => a.round - b.round);
    const q = (S.stages || []).filter((s) => ['pl-q', 'ch-q1', 'ch-q2'].includes(s.stage));
    const lines = q.map((s) => `<div class="cp-st-row"><span>${esc(s.label)}</span><em>${s.drawnAt ? `${s.teams} klub` : s.drawAt ? `🎲 ${new Date(s.drawAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : t().drawSoon}</em></div>`).join('');
    return `${lines ? `<div class="cp-panel">${lines}</div>` : ''}
      ${my.length ? my.map(myCard).join('') : `<div class="cp-empty">${t().empty}</div>`}`;
  }

  // ——— Bracket ———
  function bracketHtml() {
    const b = S.bracket || [];
    if (!b.length) return `<div class="cp-empty">${t().drawSoon}</div>`;
    const rounds = [4, 5, 6, 7].filter((r) => b.some((m) => m.round === r));
    return `<div class="cp-br">${rounds.map((r) => `<div class="cp-col"><h4>${esc(roundLabel(r))}</h4>
      ${b.filter((m) => m.round === r).map((m) => `<div class="cp-bm">
        <div class="${m.hg != null && m.hg > m.ag ? 'w' : ''}">${crest(m.home)}<span>${esc(m.home.club)}</span><b>${m.hg ?? '–'}</b></div>
        <div class="${m.ag != null && m.ag > m.hg ? 'w' : ''}">${crest(m.away)}<span>${esc(m.away.club)}</span><b>${m.ag ?? '–'}</b></div>
      </div>`).join('')}</div>`).join('')}
      <div class="cp-trophy">${window.ShopView ? window.ShopView.cupImg(S?.cup || 'fa-cup') : '🏆'}<small>${esc(cupName())}</small></div>
    </div>`;
  }

  function roundHtml() {
    const c = S.current || [];
    if (!c.length) return `<div class="cp-empty">${S.currentLabel ? t().notStarted : t().drawSoon}</div>`;
    return `<div class="cp-round-h">${esc(S.currentLabel || '')}</div>${c.map(myCard).join('')}`;
  }

  function scorersHtml() {
    const rows = S.scorers || [];
    if (!rows.length) return `<div class="cp-empty">${t().empty}</div>`;
    return `<div class="r-wrap"><table class="r-table"><thead><tr><th>#</th><th class="pl">Player</th><th>P</th><th>${t().goals}</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${i < 3 ? ['gold', 'silver', 'bronze'][i] : ''}"><td class="ps"><span class="pos">${i + 1}</span></td><td class="pl">${crest(r)}<b>${esc(r.club)}</b></td><td>${r.played}</td><td class="hl">${r.goals}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function render() {
    if (!box) return;
    const body = tab === 'qual' ? qualHtml() : tab === 'bracket' ? bracketHtml() : tab === 'round' ? roundHtml() : scorersHtml();
    box.innerHTML = `<div class="cp-page">
      <div class="cp-head"><button class="back" data-cp="close"><span>‹</span> ${t().back}</button><h2>🏆 ${esc(cupName())}</h2></div>
      <div class="cp-hero"><b>${esc(cupName())}</b><span>${S.stages?.[0]?.teams ? `${S.stages[0].teams} klub` : ''}</span></div>
      <div class="ut-seg cp-seg">${TABS.map(([k, v]) => `<button class="${tab === k ? 'on' : ''}" data-cp="tab" data-t="${k}">${v}</button>`).join('')}</div>
      ${body}
    </div>`;
  }

  async function open(l, toastFn) {
    lang = l || 'uz'; toast = toastFn;
    if (box) return;
    box = document.createElement('div');
    box.className = 'cp-modal';
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-cp]'); if (!b) return;
      const a = b.dataset.cp;
      if (a === 'close') return close();
      if (a === 'tab') { tab = b.dataset.t; return render(); }
      if (a === 'report' || a === 'chat') {
        close();
        window.MatchView?.act(a === 'report' ? 'm-result' : 'm-actions', b.dataset.id);
      }
    });
    document.body.appendChild(box);
    box.innerHTML = '<div class="cp-page"><p class="cp-empty">Yuklanmoqda…</p></div>';
    S = await api('/api/cup/page');
    if (!S) { box.innerHTML = '<div class="cp-page"><p class="cp-empty">Yuklanmadi</p></div>'; return; }
    render();
  }
  function close() { box?.remove(); box = null; }

  return { open, close };
})();