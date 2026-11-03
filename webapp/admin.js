// Admin panel (faqat adminlar uchun, o'zbekcha): natijalarni tasdiqlash, qura, ishtirokchilar
window.AdminView = (() => {
  const tg = window.Telegram?.WebApp;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '' } }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
  const ERR = { drawn: "Qura allaqachon o'tkazilgan", few: 'Kamida 2 ishtirokchi kerak', played: "Hisoblar kiritilgan — qayta qura qilib bo'lmaydi", nouser: "Foydalanuvchi topilmadi (botga /start bosgan bo'lishi kerak)", already: "U shu mavsumda allaqachon ro'yxatda", taken: 'Bu klub band', full: "Liga to'lgan", badScore: "Hisobni to'g'ri kiriting (0–99)", gone: "Topilmadi yoki holati o'zgargan", forbidden: "Ruxsat yo'q", fail: "Xatolik, qayta urinib ko'ring" };
  const ST = { scheduled: 'Kutilmoqda', pending: 'Raqib tasdig\'i kutilmoqda', disputed: '⚠️ Bahsli (yolg\'on)', confirmed: 'Tasdiqlangan' };

  let el, toast, tab = 'results', tours = null, ov = null, mt = { league: '', status: 'action', list: [], total: 0 }, pl = { league: '', data: null };

  const fmtLocal = (d) => { const x = new Date(d), p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; };
  const fmtShow = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const leagueOpts = (sel, all) => (all ? `<option value="">Barcha ligalar</option>` : '') + (ov?.leagues || []).map((l) => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.name)} (${l.players})</option>`).join('');

  function tabsHtml() {
    const n = ov?.action || 0;
    return `<div class="ad-tabs">${[['results', `Natijalar${n ? ` <i>${n}</i>` : ''}`], ['draw', 'Qura'], ['players', 'Ishtirokchilar'], ['tour', 'Turnirlar']].map(([k, v]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('')}</div>`;
  }

  // ——— Natijalar ———
  function matchHtml(m) {
    const claim = m.claim ? `<p class="ad-claim">Bekor qilingan hisob: ${m.claim.hg}:${m.claim.ag} (${esc(m.claim.by === m.home.id ? m.home.user : m.claim.by === m.away.id ? m.away.user : m.claim.by)} kiritgan)</p>` : '';
    return `<div class="g-card ad-match" data-mid="${m.id}">
      <div class="ad-meta"><small>${esc(m.leagueName)} · ${m.round}-tur</small><span class="ad-st ${m.status}">${ST[m.status]}</span></div>
      <div class="ad-vs"><div><b>${esc(m.home.club)}</b><small>${esc(m.home.user)}</small></div><div class="ad-in"><input type="number" inputmode="numeric" min="0" max="99" value="${m.hg ?? ''}" data-hg><b>:</b><input type="number" inputmode="numeric" min="0" max="99" value="${m.ag ?? ''}" data-ag></div><div><b>${esc(m.away.club)}</b><small>${esc(m.away.user)}</small></div></div>
      ${claim}<button class="ad-btn ok" data-act="result">${m.status === 'confirmed' ? "O'zgartirish va saqlash" : '✅ Tasdiqlash / kiritish'}</button></div>`;
  }
  function resultsHtml() {
    const st = [['action', 'Kutayotganlar'], ['scheduled', 'Kiritilmagan'], ['confirmed', 'Tasdiqlangan'], ['all', 'Hammasi']];
    return `<div class="ad-filters"><select data-f="league">${leagueOpts(mt.league, true)}</select><select data-f="status">${st.map(([k, v]) => `<option value="${k}" ${mt.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <p class="ad-hint">Hisob tartibi: chapda uy egasi, o'ngda mehmon.${mt.total > mt.list.length ? ` Ko'rsatilgan: ${mt.list.length} / ${mt.total} — ligani tanlab toraytiring.` : ''}</p>
      ${mt.list.map(matchHtml).join('') || '<div class="pf-empty"><span>✅</span><p>Hech narsa yo\'q</p></div>'}`;
  }
  async function loadMatches() {
    const q = new URLSearchParams({ status: mt.status, ...(mt.league ? { league: mt.league } : {}) });
    const r = await api('/api/admin/matches?' + q);
    if (r.ok) { mt.list = r.matches; mt.total = r.total; if (tab === 'results') render(); }
  }

  // ——— Qura ———
  function drawHtml() {
    return (ov?.leagues || []).map((l) => {
      const drawn = !!l.drawnAt;
      const body = drawn
        ? `<p class="ad-ok">🎲 Qura o'tkazilgan: ${fmtShow(l.drawnAt)} · ${l.total} ta o'yin (${l.confirmed} tasdiqlangan)</p><button class="ad-btn ghost" data-act="redo" data-lg="${l.id}">Qayta qura (hisob kiritilmagan bo'lsa)</button>`
        : `<label class="ad-lbl">Qura vaqti<input type="datetime-local" data-dt value="${l.drawAt ? fmtLocal(l.drawAt) : ''}"></label>
           <label class="ad-lbl">Davralar<select data-rounds><option value="2" ${l.rounds === 2 ? 'selected' : ''}>2 davra (uyda va mehmonda)</option><option value="1" ${l.rounds === 1 ? 'selected' : ''}>1 davra</option></select></label>
           ${l.drawAt ? `<p class="ad-hint">⏰ Avtomatik qura: ${fmtShow(l.drawAt)}</p>` : ''}
           <div class="ad-row"><button class="ad-btn" data-act="settime" data-lg="${l.id}">Vaqtni saqlash</button><button class="ad-btn ok" data-act="draw" data-lg="${l.id}">🎲 Hozir qura qilish</button></div>${l.drawAt ? `<button class="ad-btn ghost" data-act="cleartime" data-lg="${l.id}">Vaqtni o'chirish</button>` : ''}`;
      return `<div class="g-card ad-lg" data-lgbox="${l.id}"><h3>${esc(l.name)} <small>${l.players}/${l.max}</small></h3>${body}</div>`;
    }).join('');
  }

  // ——— Ishtirokchilar ———
  function playersHtml() {
    const d = pl.data;
    const list = !d ? '<p class="ad-hint">Yuklanmoqda…</p>' : `${d.players.map((p) => `<div class="g-card ad-pl"><span><b>${esc(p.club)}</b><small>${esc(p.user)} · ${p.pts} ball · ${p.games} o'yin</small></span><button class="ad-btn bad" data-act="remove" data-tid="${p.telegramId}" data-name="${esc(p.club)}">Chiqarish</button></div>`).join('') || '<p class="ad-hint">Ishtirokchi yo\'q</p>'}
      <div class="g-label"><span>Qo'shish (${d.players.length}/${d.max})</span></div>
      <div class="g-card ad-add"><input type="text" data-user placeholder="@username yoki Telegram ID"><select data-club>${d.free.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button class="ad-btn ok" data-act="add">➕ Qo'shish</button><p class="ad-hint">Foydalanuvchi botga kamida bir marta /start bosgan bo'lishi kerak. Qura o'tgan bo'lsa, unga qolganlar bilan o'yinlar qo'shiladi.</p></div>`;
    return `<div class="ad-filters"><select data-f="plleague">${leagueOpts(pl.league, false)}</select></div>${list}`;
  }
  async function loadPlayers() {
    const id = pl.league, r = await api(`/api/admin/league/${id}/players`);
    if (r.ok && id === pl.league) { pl.data = r; if (tab === 'players') render(); }
  }
  async function loadOverview() { const r = await api('/api/admin/overview'); if (r.ok) { ov = r; if (!pl.league) pl.league = r.leagues[0].id; render(); } else if (r.error === 'forbidden') el.innerHTML = '<div class="page"><p>Ruxsat yo\'q</p></div>'; }

  // ——— Norasmiy turnirlar ———
  function toursHtml() {
    const SB = { open: 'Qabul ochiq', league: 'Davom etmoqda', playoff: 'Play-off', finished: 'Yakunlangan' };
    if (!tours) return '<p class="ad-hint">Yuklanmoqda…</p>';
    return tours.map((x) => `<button class="g-card ut-card" data-act="tour-open" data-tid="${x.id}"><span><b>${esc(x.name)}</b><small>${esc(x.owner)} · ${x.players}/${x.max} · ${SB[x.status]}${x.action ? ` · <i style="color:#fb923c;font-style:normal">⚠️ ${x.action}</i>` : ''}</small></span><span class="chev">›</span></button>`).join('') || '<div class="pf-empty"><span>🏆</span><p>Turnir yo\'q</p></div>';
  }
  async function loadTours() { const r = await api('/api/admin/tournaments'); if (r.ok) { tours = r.list; if (tab === 'tour') render(); } }

  function render() {
    if (!ov) { el.innerHTML = '<div class="page"><p class="ad-hint">Yuklanmoqda…</p></div>'; return; }
    const body = tab === 'results' ? resultsHtml() : tab === 'draw' ? drawHtml() : tab === 'tour' ? toursHtml() : playersHtml();
    el.innerHTML = `<div class="page ad-page"><button class="back" data-back><span>‹</span> Bo'limlar</button><h1 class="section-title">🛠 Admin panel</h1>${tabsHtml()}${body}</div>`;
  }

  const confirmBox = (msg) => new Promise((res) => (tg?.showConfirm ? tg.showConfirm(msg, res) : res(window.confirm(msg))));
  async function done(r, okMsg, reload) {
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(okMsg); } else toast(ERR[r.error] || ERR.fail);
    await loadOverview();
    if (reload) await reload();
  }

  async function onClick(e) {
    const t = e.target.closest('[data-tab]'), a = e.target.closest('[data-act]');
    if (t) { tab = t.dataset.tab; render(); if (tab === 'results') loadMatches(); if (tab === 'players') loadPlayers(); if (tab === 'tour') loadTours(); loadOverview(); return; }
    if (!a) return;
    const act = a.dataset.act, lg = a.dataset.lg;
    if (act === 'tour-open') { location.hash = '#unofficial/' + a.dataset.tid; return; }
    if (act === 'result') {
      const box = a.closest('[data-mid]'), hg = parseInt(box.querySelector('[data-hg]').value, 10), ag = parseInt(box.querySelector('[data-ag]').value, 10);
      if (!(hg >= 0 && hg <= 99 && ag >= 0 && ag <= 99)) return toast(ERR.badScore);
      return done(await post(`/api/admin/matches/${box.dataset.mid}/result`, { hg, ag }), 'Natija saqlandi ✅', loadMatches);
    }
    if (act === 'settime' || act === 'cleartime' || act === 'draw') {
      const box = a.closest('[data-lgbox]'), v = box.querySelector('[data-dt]')?.value, rounds = Number(box.querySelector('[data-rounds]')?.value || 2);
      if (act === 'settime') { if (!v) return toast('Vaqtni tanlang'); return done(await post(`/api/admin/league/${lg}/draw-time`, { drawAt: new Date(v).toISOString(), rounds }), 'Qura vaqti saqlandi ✅'); }
      if (act === 'cleartime') return done(await post(`/api/admin/league/${lg}/draw-time`, { drawAt: null, rounds }), "Qura vaqti o'chirildi");
      if (!(await confirmBox('Qurani hozir o\'tkazamizmi? Ishtirokchilar aralashtirilib, o\'yinlar jadvali tuziladi.'))) return;
      return done(await post(`/api/admin/league/${lg}/draw`, { rounds }), 'Qura o\'tkazildi 🎲');
    }
    if (act === 'redo') {
      if (!(await confirmBox('Qurani qayta o\'tkazamizmi? Eski o\'yinlar jadvali o\'chiriladi.'))) return;
      return done(await post(`/api/admin/league/${lg}/draw`, { redo: true, rounds: ov.leagues.find((l) => l.id === lg)?.rounds }), 'Qayta qura o\'tkazildi 🎲');
    }
    if (act === 'remove') {
      if (!(await confirmBox(`${a.dataset.name} ligadan chiqarilsinmi? Uning barcha o'yinlari bekor qilinadi, natijalari jadvaldan olib tashlanadi.`))) return;
      return done(await post(`/api/admin/league/${pl.league}/remove`, { telegramId: Number(a.dataset.tid) }), 'Ishtirokchi chiqarildi', loadPlayers);
    }
    if (act === 'add') {
      const box = a.closest('.ad-add'), user = box.querySelector('[data-user]').value.trim(), club = box.querySelector('[data-club]').value;
      if (!user || !club) return toast('Foydalanuvchi va klubni kiriting');
      return done(await post(`/api/admin/league/${pl.league}/add`, { user, club }), "Ishtirokchi qo'shildi ✅", loadPlayers);
    }
  }
  function onChange(e) {
    const f = e.target.dataset.f;
    if (f === 'league' || f === 'status') { mt[f] = e.target.value; loadMatches(); }
    if (f === 'plleague') { pl = { league: e.target.value, data: null }; render(); loadPlayers(); }
  }

  function show(root, toastFn) {
    el = root; toast = toastFn;
    if (!el.dataset.bound) { el.dataset.bound = '1'; el.addEventListener('click', onClick); el.addEventListener('change', onChange); }
    render();
    if (el.dataset.loaded !== '1') { el.dataset.loaded = '1'; loadOverview(); loadMatches(); }
  }
  const leave = () => { if (el) el.dataset.loaded = ''; };
  return { show, leave };
})();
