// Admin panel: Liga va Kubok bo'limlari, Statistika, Xabar, Yordamchilar, Kubok narxi, Ligalar holati, Klublar, Turnirlar va Auksion
window.AdminView = (() => {
  const tg = window.Telegram?.WebApp;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '' } }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
  const ERR = { nowinner: "G'olib hali aniqlanmagan", already: 'Bu kubok allaqachon topshirilgan', hasgames: "Yangi egasi allaqachon o'yin o'ynagan, tiklab bo'lmaydi", active: 'Eski egasi hali ligada', nogames: "Bekor qilingan o'yin topilmadi", drawn: "Qura allaqachon o'tkazilgan", few: 'Kamida 2 ishtirokchi kerak', played: "Hisoblar kiritilgan — qayta qura qilib bo'lmaydi", nouser: "Foydalanuvchi topilmadi (botga /start bosgan bo'lishi kerak)", taken: 'Bu klub band', full: "Liga to'lgan", badScore: "Hisobni to'g'ri kiriting (0–99)", gone: "Topilmadi yoki holati o'zgargan", forbidden: "Ruxsat yo'q", stage: "Bosqich topilmadi", nodraw: "Avval qura tashlang", none: "Tasdiqlangan o'yinlar yo'q", time: "Vaqt noto'g'ri", fail: "Xatolik, qayta urinib ko'ring" };
  const ST = { scheduled: 'Kutilmoqda', pending: 'Raqib tasdig\'i kutilmoqda', disputed: '⚠️ Bahsli (yolg\'on)', confirmed: 'Tasdiqlangan' };
  const BCS = { running: '⏳ Yuborilmoqda', done: '✅ Yakunlandi', interrupted: '⚠️ To\'xtatilgan' };

  let el, toast;
  let mainTab = 'liga'; // 'liga' | 'cup' | 'stats' | 'broadcast' | 'helpers' | 'cups' | 'open' | 'clubs' | 'tour' | 'auction'
  let curLeague = '';
  let curCup = 'fa-cup';
  let ligaSubTab = 'draw'; // 'draw' | 'results' | 'players' | 'support'
  let cupSubTab = 'draw'; // 'draw' | 'results'

  let ov = null;
  let mt = { list: [], total: 0, filterClub: 'all', filterRound: 'all', filterStage: 'all' };
  let pl = { data: null, search: '' };
  let sp = { threads: null, open: null, name: '', league: '', leagueName: '', msgs: [], sig: '' };
  let spTimer = null;
  let cupState = null;
  let selApprovalMatch = null;
  let selRoundNum = 1;

  let hl = { list: null };
  let cl = { data: null, country: null, league: null };
  let cups = null;
  let tours = null;
  let st = null;
  let bc = { list: null, count: null, text: '', league: '', lang: '' };
  let bcTimer = null;
  let aucCfg = null;

  const fmtLocal = (d) => { const x = new Date(d), p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; };
  const fmtShow = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const hm2 = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const money = (n) => String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const SK = (kind, n) => window.Skel?.[kind]?.(n) || '<p class="ad-hint">Yuklanmoqda…</p>';
  const leagueOpts = (sel, all) => (all ? `<option value="">Barcha ligalar</option>` : '') + (ov?.leagues || []).map((l) => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.name)} (${l.players})</option>`).join('');

  const confirmBox = (msg) => new Promise((res) => (tg?.showConfirm ? tg.showConfirm(msg, res) : res(window.confirm(msg))));

  async function done(r, okMsg, reload) {
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(okMsg); } else toast(ERR[r.error] || ERR.fail);
    await loadOverview();
    if (reload) await reload();
  }

  // --- Image Cache for proofs ---
  const imgCache = new Map();
  async function loadImgs(root) {
    if (!root) return;
    for (const im of root.querySelectorAll('img[data-fid]:not([data-ok])')) {
      im.dataset.ok = '1';
      const fid = im.dataset.fid;
      if (!imgCache.has(fid)) {
        try {
          const r = await fetch('/api/file/' + encodeURIComponent(fid), { headers: { 'x-init-data': tg?.initData || '' } });
          if (!r.ok) throw 0;
          imgCache.set(fid, URL.createObjectURL(await r.blob()));
        } catch (_) { im.alt = '⚠️ rasm yuklanmadi'; continue; }
      }
      im.src = imgCache.get(fid);
    }
  }

  function lightbox(src) {
    const d = document.createElement('div');
    d.className = 'm-light';
    d.innerHTML = `<img src="${src}" alt="">`;
    d.onclick = () => d.remove();
    document.body.appendChild(d);
  }

  // --- LIGA SUB-TAB: 1. QURA ---
  function ligaDrawHtml() {
    const l = (ov?.leagues || []).find((x) => x.id === curLeague);
    if (!l) return '<p class="ad-hint">Liga topilmadi</p>';

    const drawn = !!l.drawnAt;
    const nRounds = l.roundCount || 19;
    const openSet = new Set((l.openRounds || []).map(Number));
    const dlMap = l.roundDeadlines || {};

    const curRound = Number(selRoundNum) || 1;
    const isOpen = openSet.has(curRound);
    const curDl = dlMap[curRound] ? fmtLocal(dlMap[curRound]) : '';

    return `<div class="g-card ad-lg">
      <div class="ad-meta">
        <b>🎲 Qura holati</b>
        <span class="ad-st ${drawn ? 'confirmed' : 'pending'}">${drawn ? 'Qura o\'tkazilgan' : 'Qura qilinmagan'}</span>
      </div>
      ${drawn
        ? `<p class="ad-ok">✅ Qura vaqti: ${fmtShow(l.drawnAt)} · Jami o'yinlar: ${l.total} (${l.confirmed} tasdiqlangan)</p>
           <div class="ad-row">
             <button class="ad-btn ghost sm" data-act="redo" data-lg="${l.id}">Qayta qura</button>
             <button class="ad-btn bad sm" data-act="draw-cancel" data-lg="${l.id}">✖ Bekor qilish</button>
           </div>`
        : `<label class="ad-lbl">Qura o'tkazish vaqti
             <input type="datetime-local" id="lgDrawTime" value="${l.drawAt ? fmtLocal(l.drawAt) : ''}">
           </label>
           <div class="ad-row">
             <button class="ad-btn sm" data-act="settime" data-lg="${l.id}">Vaqtni saqlash</button>
             <button class="ad-btn ok sm" data-act="draw" data-lg="${l.id}">🎲 Hozir qura qilish</button>
           </div>`}
    </div>

    <div class="g-card ad-lg" style="margin-top:14px;">
      <div class="ad-meta">
        <b>🔢 Turlar va Dedlayn</b>
        <span>${openSet.size}/${nRounds} tur ochiq</span>
      </div>
      
      <label class="ad-lbl">Turni tanlang:
        <select class="lf-select" data-act="pick-round">
          ${Array.from({ length: nRounds }, (_, i) => i + 1).map((r) => `<option value="${r}" ${r === curRound ? 'selected' : ''}>${r}-tur ${openSet.has(r) ? '(Ochiq 🔓)' : '(Yopiq 🔒)'}</option>`).join('')}
        </select>
      </label>

      <label class="ad-lbl">${curRound}-tur dedlayni:
        <input type="datetime-local" id="roundDlInput" value="${curDl}">
      </label>

      <div class="ad-row" style="margin-top:10px;">
        <button class="ad-btn ok sm" data-act="save-round-dl" data-lg="${l.id}" data-round="${curRound}">💾 Dedlayn saqlash</button>
        <button class="ad-btn ${isOpen ? 'bad' : 'ok'} sm" data-act="toggle-round-open" data-lg="${l.id}" data-round="${curRound}" data-open="${isOpen ? '' : '1'}">
          ${isOpen ? '🔒 Turni yopish' : '🔓 Turni ochish'}
        </button>
      </div>

      <div class="ad-row" style="margin-top:14px;border-top:1px solid #1e293b;padding-top:12px;">
        <button class="ad-btn ghost sm" data-act="rall" data-lg="${l.id}" data-open="1">Hammasini ochish</button>
        <button class="ad-btn ghost sm" data-act="rall" data-lg="${l.id}" data-open="">Hammasini yopish</button>
      </div>
    </div>`;
  }

  // --- LIGA SUB-TAB: 2. NATIJALAR ---
  function ligaResultsHtml() {
    const curLg = (ov?.leagues || []).find((x) => x.id === curLeague);
    const clubs = window.EFL?.byId?.[curLeague]?.clubs || [];
    const nRounds = curLg?.roundCount || 19;

    const filterClub = mt.filterClub || 'all';
    const filterRound = mt.filterRound || 'all';

    let list = (mt.list || []).filter((m) => m.league === curLeague);
    if (filterClub !== 'all') {
      list = list.filter((m) => m.home?.clubId === filterClub || m.away?.clubId === filterClub);
    }
    if (filterRound !== 'all') {
      list = list.filter((m) => String(m.round) === String(filterRound));
    }

    const pendingMatches = (mt.list || []).filter((m) => m.league === curLeague && (m.status === 'pending' || m.status === 'disputed'));

    const pendingBlock = pendingMatches.length ? `<div class="g-label"><span>⏳ Tasdiqlash kutayotgan hisoblar (${pendingMatches.length})</span></div>
      ${pendingMatches.map((m) => `<div class="g-card ad-pending-card" data-act="open-approval" data-mid="${m.id}" style="cursor:pointer">
        <div class="ad-pending-left">
          <span>⚽ <b>${esc(m.home.club)}</b> <b class="ad-pending-sc">${m.hg ?? '–'}:${m.ag ?? '–'}</b> <b>${esc(m.away.club)}</b></span>
          <small>${m.round}-tur · ${m.status === 'disputed' ? '⚠️ Yolg\'on hisob' : 'Tasdiqlash kutilmoqda'}</small>
        </div>
        <button class="ad-btn ghost sm" data-act="open-approval" data-mid="${m.id}">Batafsil ›</button>
      </div>`).join('')}` : '';

    return `${pendingBlock}
      <div class="g-label" style="margin-top:16px;"><span>📋 O'yinlar va natijalar</span></div>
      <div class="g-card live-filters" style="margin-bottom:12px;">
        <div class="lf-item">
          <label>🔢 Turni tanlash</label>
          <select class="lf-select" data-act="res-filter-round">
            <option value="all" ${filterRound === 'all' ? 'selected' : ''}>Barcha turlar</option>
            ${Array.from({ length: nRounds }, (_, i) => i + 1).map((r) => `<option value="${r}" ${String(r) === String(filterRound) ? 'selected' : ''}>${r}-tur</option>`).join('')}
          </select>
        </div>
        <div class="lf-item">
          <label>🏟️ Klubni tanlash</label>
          <select class="lf-select" data-act="res-filter-club">
            <option value="all" ${filterClub === 'all' ? 'selected' : ''}>Barcha klublar</option>
            ${clubs.map((c) => `<option value="${c.id}" ${c.id === filterClub ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="ad-match-list">
        ${list.map(matchCardHtml).join('') || '<div class="pf-empty"><span>⚽</span><p>O\'yinlar topilmadi</p></div>'}
      </div>`;
  }

  function matchCardHtml(m) {
    return `<div class="g-card ad-match" data-mid="${m.id}">
      <div class="ad-meta">
        <small>${esc(m.leagueName || '')} · ${m.round ? m.round + '-tur' : (m.stage || '')}${m.deadline ? ` · ⏰ ${fmtShow(m.deadline)}` : ''}</small>
        <span class="ad-st ${m.status}">${ST[m.status] || m.status}</span>
      </div>
      <div class="ad-vs">
        <div><b>${esc(m.home.club)}</b><small>${esc(m.home.user)}</small></div>
        <div class="ad-in">
          <input type="number" inputmode="numeric" min="0" max="99" value="${m.hg ?? ''}" data-hg>
          <b>:</b>
          <input type="number" inputmode="numeric" min="0" max="99" value="${m.ag ?? ''}" data-ag>
        </div>
        <div><b>${esc(m.away.club)}</b><small>${esc(m.away.user)}</small></div>
      </div>
      ${m.chat ? `<button class="ad-btn ghost sm" data-act="viewchat">💬 O'yin chati (${m.chat})</button><div class="ad-chatbox" data-chatbox></div>` : ''}
      <div class="ad-row" style="margin-top:8px;">
        ${m.status !== 'scheduled' ? `<button class="ad-btn bad sm" data-act="reset">🗑 O'chirish</button>` : ''}
        <button class="ad-btn ok sm" data-act="save-score">💾 ${m.status === 'confirmed' ? "O'zgartirish" : "Tasdiqlash"}</button>
      </div>
    </div>`;
  }

  // Tasdiqlash modal oynasi (Skrinshot, foydalanuvchilar, tasdiqlash / rad etish)
  function approvalModalHtml(m) {
    if (!m) return '';
    const proofs = (m.proofs || []).map((p) => `
      <div class="ad-modal-proof">
        <p><b>📎 ${esc(p.by)}</b>: ${esc(p.text || '')}</p>
        ${p.fileId ? `<div class="ad-modal-img-wrap"><img src="" data-fid="${esc(p.fileId)}" data-act="zoom" class="ad-proof-img" alt="Screenshot"></div>` : ''}
      </div>
    `).join('');

    return `<div class="ad-modal-overlay" id="approvalModal">
      <div class="ad-modal-box">
        <div class="ad-modal-header">
          <h3>Natijani tekshirish</h3>
          <button class="ad-modal-close" data-act="close-approval">✕</button>
        </div>
        <div class="ad-modal-body">
          <div class="ad-modal-match-info">
            <div class="ad-modal-team">
              <b>${esc(m.home.club)}</b>
              <span>${esc(m.home.user)} (ID: ${m.home.id})</span>
            </div>
            <div class="ad-modal-score">
              <input type="number" id="appHomeScore" value="${m.hg ?? 0}" min="0" max="99">
              <span>:</span>
              <input type="number" id="appAwayScore" value="${m.ag ?? 0}" min="0" max="99">
            </div>
            <div class="ad-modal-team">
              <b>${esc(m.away.club)}</b>
              <span>${esc(m.away.user)} (ID: ${m.away.id})</span>
            </div>
          </div>
          ${proofs ? `<div class="ad-modal-proofs">${proofs}</div>` : '<p class="ad-hint">Isbot skrinshoti yuklanmagan</p>'}
        </div>
        <div class="ad-modal-actions">
          <button class="ad-btn bad" data-act="reject-approval" data-mid="${m.id}">❌ Rad etish</button>
          <button class="ad-btn ok" data-act="confirm-approval" data-mid="${m.id}">✅ Tasdiqlash</button>
        </div>
      </div>
    </div>`;
  }

  // --- LIGA SUB-TAB: 3. ISHTIROKCHILAR ---
  function ligaPlayersHtml() {
    const d = pl.data;
    if (!d) return '<p class="ad-hint">Yuklanmoqda…</p>';

    const search = (pl.search || '').toLowerCase().trim();
    let players = d.players || [];
    if (search) {
      players = players.filter((p) => p.club?.toLowerCase().includes(search) || p.user?.toLowerCase().includes(search) || String(p.telegramId).includes(search));
    }

    const freeClubs = d.free || [];

    return `<div class="g-card" style="margin-bottom:12px;">
      <div class="ad-search-box">
        <input type="text" id="plSearchInp" placeholder="🔍 Qidirish (klub, user, ID)..." value="${esc(pl.search)}">
      </div>
    </div>

    <div class="g-label"><span>👥 Ishtirokchilar (${players.length}/${d.max})</span></div>
    <div class="ad-players-list">
      ${players.map((p) => `<div class="g-card ad-pl-card">
        <div class="ad-pl-left">
          <b>${esc(p.club)}</b>
          <small>${esc(p.user)} · ID: ${p.telegramId} · ${p.pts} ball</small>
        </div>
        <div class="ad-pl-actions">
          <button class="ad-btn ghost sm" data-act="transfer-player" data-tid="${p.telegramId}" data-club="${esc(p.club)}">🔄 Almashtirish</button>
          <button class="ad-btn bad sm" data-act="remove-player" data-tid="${p.telegramId}" data-name="${esc(p.club)}">🚪 Chiqarish</button>
        </div>
      </div>`).join('') || '<p class="ad-hint">Ishtirokchi topilmadi</p>'}
    </div>

    <div class="g-label" style="margin-top:16px;"><span>➕ Yangi ishtirokchi qo'shish</span></div>
    <div class="g-card ad-add">
      <input type="text" id="addUserInput" placeholder="@username yoki Telegram ID">
      <select id="addClubSelect">
        <option value="">Bo'sh klubni tanlang...</option>
        ${freeClubs.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      </select>
      <button class="ad-btn ok" data-act="add-player">➕ Qo'shish</button>
    </div>

    ${(d.needy || []).length ? `<div class="g-label" style="margin-top:16px;"><span>♻️ O'yinlarni tiklash</span></div>
      ${d.needy.map((n) => `<div class="g-card ad-rec" data-to="${n.telegramId}">
        <span><b>${esc(n.club)}</b><small>${esc(n.user)} · o'yinlari tiklanishi mumkin</small></span>
        <select data-from>${(d.orphans || []).map((o) => `<option value="${o.telegramId}">${esc(o.user)} (${o.games} o'yin)</option>`).join('')}</select>
        <button class="ad-btn ok sm" data-act="restore-orphan">Tiklash</button>
      </div>`).join('')}` : ''}`;
  }

  function transferModalHtml(tid, club) {
    return `<div class="ad-modal-overlay" id="transferModal">
      <div class="ad-modal-box">
        <div class="ad-modal-header">
          <h3>Ishtirokchini almashtirish</h3>
          <button class="ad-modal-close" data-act="close-transfer">✕</button>
        </div>
        <div class="ad-modal-body">
          <p><b>Klub:</b> ${esc(club)}</p>
          <p class="ad-hint">Yangi foydalanuvchi ma'lumotlarini kiriting. Uning o'yinlari va ballari saqlanib yangi userga o'tadi.</p>
          <label class="ad-lbl">Yangi foydalanuvchi (@username yoki ID):
            <input type="text" id="transferUserInput" placeholder="@username yoki 123456789">
          </label>
        </div>
        <div class="ad-modal-actions">
          <button class="ad-btn ghost" data-act="close-transfer">Bekor qilish</button>
          <button class="ad-btn ok" data-act="confirm-transfer" data-tid="${tid}" data-club="${esc(club)}">🔄 Almashtirish</button>
        </div>
      </div>
    </div>`;
  }

  // --- LIGA SUB-TAB: 4. XABARLAR (SUPPORT) ---
  const bubble = (x) => `<div class="m-b ${x.mine ? 'me' : 'op'}">${x.fileId ? `<img class="m-img" data-fid="${esc(x.fileId)}" data-act="zoom" alt="">` : ''}${x.text ? `<span>${esc(x.text)}</span>` : ''}<small>${hm2(x.at)}</small></div>`;
  function ligaSupportHtml() {
    if (sp.open) {
      return `<button class="back" data-act="spback"><span>‹</span> Murojaatlar</button>
        <div class="g-card ad-thread-h"><b>${esc(sp.name)}</b><small>ID ${sp.open}${sp.leagueName ? ' · 🏆 ' + esc(sp.leagueName) : ''}</small></div>
        <div class="m-msgs ad-msgs" id="spMsgs">${sp.msgs.map(bubble).join('') || '<p class="m-empty">Xabar yo\'q</p>'}</div>
        <div class="m-send"><input id="spText" maxlength="800" placeholder="Javob yozing…" autocomplete="off"><button class="m-ic go" data-act="spsend">➤</button></div>`;
    }
    if (!sp.threads) return SK('rows', 3);
    const lgThreads = sp.threads.filter((x) => !x.league || x.league === curLeague);
    return `<p class="ad-hint">Foydalanuvchilarning murojaatlari. Javobingiz foydalanuvchiga bot orqali boradi.</p>
      ${lgThreads.map((x) => `<button class="g-card ad-thread" data-act="spopen" data-uid="${x.uid}" data-name="${esc(x.name)}" data-league="${esc(x.league || '')}" data-lname="${esc(x.leagueName || '')}">
        <span><b>${esc(x.name)}</b>${x.leagueName ? `<em>🏆 ${esc(x.leagueName)}</em>` : ''}<small>${x.fromAdmin ? 'Siz: ' : ''}${esc(x.text.slice(0, 70))}</small></span>
        <span class="ad-thread-r"><small>${hm2(x.at)}</small>${x.unread ? `<i class="gm-badge" style="position:static">${x.unread}</i>` : ''}</span>
      </button>`).join('') || '<div class="pf-empty"><span>📭</span><p>Murojaat yo\'q</p></div>'}`;
  }

  // --- KUBOK SUB-TAB: 1. QURA ---
  function cupDrawHtml() {
    if (!cupState) return SK('rows', 3);
    return `<p class="ad-hint">Bosqichlar bo'yicha qura tashlash, start berish va keyingi bosqichga o'tkazish.</p>` +
      cupState.stages.map((s) => {
        const drawn = !!s.drawnAt;
        return `<div class="g-card ad-lg" data-cupstage="${s.stage}" style="margin-bottom:12px;">
          <h3>${esc(s.label)} <small>${s.teams} klub · ${s.matches} o'yin</small></h3>
          <p class="ad-hint">
            ${drawn ? `🎲 ${fmtShow(s.drawnAt)}` : "🎲 qura yo'q"}
            ${s.startedAt ? ` · ▶️ ${fmtShow(s.startedAt)}` : ''}
            ${s.deadline ? ` · ⏰ ${fmtShow(s.deadline)}` : ''}
            ${s.matches ? ` · ✅ ${s.confirmed}/${s.matches}` : ''}
          </p>
          <div class="ad-row" style="margin-top:10px;">
            ${drawn
              ? `<label class="ad-lbl">Dedlayn (soat)<input type="number" min="0" max="720" value="24" data-hours></label>
                 <button class="ad-btn ok sm" data-act="cup-start">▶️ Start berish</button>`
              : `<button class="ad-btn ok sm" data-act="cup-draw">🎲 Hozir qura</button>`}
          </div>
          <div class="ad-row" style="margin-top:8px;">
            ${s.stage !== 'final' ? `<button class="ad-btn ghost sm" data-act="cup-advance">➡️ Keyingi bosqichga</button>` : ''}
            ${drawn ? `<button class="ad-btn bad sm" data-act="cup-reset">Tozalash / qayta qura</button>` : ''}
          </div>
        </div>`;
      }).join('') +
      `<div class="g-card ad-lg">
        <h3>🛡 ${esc(cupState.shieldName || 'Supercup')} <small>2 finalist</small></h3>
        <p class="ad-hint">1-liga g'olibi va kubok g'olibi o'rtasidagi o'yin.</p>
        <button class="ad-btn ghost sm" data-act="cup-shield">🛡 Yaratish</button>
      </div>
      <div class="g-card ad-lg" style="margin-top:12px;">
        <h3>🏆 Kubok topshirish <small>g'olibga</small></h3>
        <p class="ad-hint">Final yakunlangach g'olibga kubok topshirish.</p>
        <div class="ad-row">
          <button class="ad-btn ok sm" data-act="cup-award" data-kind="cup">🏆 Kubok g'olibiga</button>
          <button class="ad-btn ok sm" data-act="cup-award" data-kind="shield">🛡 Supercup g'olibiga</button>
        </div>
      </div>`;
  }

  // --- KUBOK SUB-TAB: 2. NATIJALAR ---
  function cupResultsHtml() {
    if (!cupState) return SK('rows', 3);
    const stages = cupState.stages || [];
    const filterStage = mt.filterStage || 'all';

    let list = (mt.list || []).filter((m) => m.league === curCup);
    if (filterStage !== 'all') {
      list = list.filter((m) => m.stage === filterStage);
    }

    const pendingMatches = (mt.list || []).filter((m) => m.league === curCup && (m.status === 'pending' || m.status === 'disputed'));

    const pendingBlock = pendingMatches.length ? `<div class="g-label"><span>⏳ Tasdiqlash kutayotgan hisoblar (${pendingMatches.length})</span></div>
      ${pendingMatches.map((m) => `<div class="g-card ad-pending-card" data-act="open-approval" data-mid="${m.id}" style="cursor:pointer">
        <div class="ad-pending-left">
          <span>⚽ <b>${esc(m.home.club)}</b> <b class="ad-pending-sc">${m.hg ?? '–'}:${m.ag ?? '–'}</b> <b>${esc(m.away.club)}</b></span>
          <small>${m.stage} · ${m.status === 'disputed' ? '⚠️ Yolg\'on hisob' : 'Tasdiqlash kutilmoqda'}</small>
        </div>
        <button class="ad-btn ghost sm" data-act="open-approval" data-mid="${m.id}">Batafsil ›</button>
      </div>`).join('')}` : '';

    return `${pendingBlock}
      <div class="g-label" style="margin-top:16px;"><span>📋 Kubok o'yinlari va natijalari</span></div>
      <div class="g-card live-filters" style="margin-bottom:12px;">
        <div class="lf-item">
          <label>Bosqichni tanlang</label>
          <select class="lf-select" data-act="cup-res-filter-stage">
            <option value="all" ${filterStage === 'all' ? 'selected' : ''}>Barcha bosqichlar</option>
            ${stages.map((s) => `<option value="${s.stage}" ${s.stage === filterStage ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="ad-match-list">
        ${list.map(matchCardHtml).join('') || '<div class="pf-empty"><span>🏆</span><p>Kubok o\'yinlari yo\'q</p></div>'}
      </div>`;
  }

  // --- STATISTIKA ---
  const kpi = (v, l, sub = '') => `<div class="g-card st-kpi"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  function bars(vals, days, cls, fmt = (v) => v) {
    const W = 320, H = 100, max = Math.max(1, ...vals), bw = W / vals.length;
    const rects = vals.map((v, i) => { const h = v ? Math.max(3, Math.round((v / max) * H)) : 0; return `<rect x="${(i * bw + 2).toFixed(1)}" y="${H - h}" width="${(bw - 4).toFixed(1)}" height="${h}" rx="3"><title>${days[i].slice(5)} · ${fmt(v)}</title></rect>`; }).join('');
    return `<svg class="st-chart ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="grafik"><line x1="0" y1="${H - .5}" x2="${W}" y2="${H - .5}"/>${rects}</svg><div class="st-axis"><span>${days[0].slice(5)}</span><span>eng ko'pi: ${fmt(max)}</span><span>${days[days.length - 1].slice(5)}</span></div>`;
  }
  function statsHtml() {
    if (!st) return SK('kpis');
    const u = st.users, r = st.revenue, s = st.series, last = s.days.length;
    const sticky = u.mau ? Math.round((u.dau / u.mau) * 100) : 0;
    return `<div class="st-grid">
        ${kpi(money(u.total), 'Jami foydalanuvchi', `+${u.new7} oxirgi 7 kunda`)}
        ${kpi(money(u.dau), 'Kunlik faol (24 soat)', `haftalik ${money(u.wau)} · oylik ${money(u.mau)}`)}
        ${kpi(money(r.todayCoins), 'Bugungi Coins daromadi', money(r.todayUzs) + ' UZS')}
        ${kpi(money(r.weekCoins), '7 kunlik Coins', money(r.weekUzs) + ' UZS')}
      </div>
      <div class="g-card st-box"><h3>Kunlik faol foydalanuvchilar <small>so'nggi ${last} kun</small></h3>${bars(s.active, s.days, 'c-cy')}
        <p class="ad-hint">Grafik shu yangilanishdan boshlab to'planadi. Yopishqoqlik (DAU/MAU): <b>${sticky}%</b></p></div>
      <div class="g-card st-box"><h3>Yangi ro'yxatdan o'tganlar <small>jami ${money(s.signups.reduce((a, b) => a + b, 0))}</small></h3>${bars(s.signups, s.days, 'c-vi')}</div>
      <div class="g-card st-box"><h3>Coins daromadi <small>${money(r.periodCoins)} Coins · ${money(r.periodUzs)} UZS · ${r.payments} ta to'lov</small></h3>${bars(s.coins, s.days, 'c-am', (v) => money(v) + ' Coins')}
        ${r.pending ? `<p class="ad-hint">⏳ Tasdiq kutayotgan to'lovlar: <b>${r.pending}</b></p>` : ''}</div>
      <div class="g-card st-box"><h3>Ligalar to'ldirilishi <small>${money(u.registered)} ro'yxatdan o'tgan</small></h3>
        ${st.leagues.map((l) => `<div class="st-lg"><span>${esc(l.name)}</span><i><u style="width:${Math.min(100, Math.round((l.players / l.max) * 100))}%"></u></i><b>${l.players}/${l.max}</b></div>`).join('')}</div>
      ${u.blocked ? `<p class="ad-hint">🚫 Botni bloklaganlar: ${money(u.blocked)}</p>` : ''}`;
  }

  // --- OMMAVIY XABAR ---
  function broadcastHtml() {
    const hist = !bc.list ? SK('rows', 2) : bc.list.length ? bc.list.map((b) => {
      const pct = b.total ? Math.round(((b.sent + b.failed + b.blocked) / b.total) * 100) : 0;
      return `<div class="g-card bc-item"><div class="ad-meta"><small>${hm2(b.at)} · ${b.league ? esc(b.league) : 'hamma'}${b.lang ? ' · ' + b.lang.toUpperCase() : ''}</small><span class="ad-st ${b.status === 'done' ? 'confirmed' : 'pending'}">${BCS[b.status] || b.status}</span></div>
        <p>${esc(b.text.length > 140 ? b.text.slice(0, 140) + '…' : b.text)}</p>
        <div class="st-lg"><i><u style="width:${pct}%"></u></i><b>${b.sent}/${b.total}</b></div>
        <small class="ad-hint">${b.blocked ? `🚫 bloklagan: ${b.blocked} · ` : ''}${b.failed ? `❌ xato: ${b.failed}` : ''}</small></div>`;
    }).join('') : '<p class="ad-hint">Hali xabar yuborilmagan</p>';
    return `<p class="ad-hint">Xabar botdan shaxsiy chatga ketadi. Avval «Sinov» bilan o'zingizga yuborib ko'ring.</p>
      <div class="g-card bc-form">
        <label class="ad-lbl">Kimga<select data-f="bcleague"><option value="">Hamma foydalanuvchilar</option>${(ov?.leagues || []).map((l) => `<option value="${l.id}" ${bc.league === l.id ? 'selected' : ''}>${esc(l.name)} o'yinchilari (${l.players})</option>`).join('')}</select></label>
        <label class="ad-lbl">Til<select data-f="bclang">${[['', 'Barcha tillar'], ['uz', "O'zbekcha"], ['en', 'English'], ['ru', 'Русский']].map(([k, v]) => `<option value="${k}" ${bc.lang === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="ad-lbl">Matn<textarea id="bcText" maxlength="3500" rows="5" placeholder="E'lon matni…">${esc(bc.text)}</textarea></label>
        <div class="bc-meta"><span id="bcCount">${bc.count == null ? '…' : money(bc.count) + ' kishiga boradi'}</span><span id="bcLen">${bc.text.length}/3500</span></div>
        <div class="ad-row"><button class="ad-btn ghost" data-act="bc-test">🧪 Sinov (o'zimga)</button><button class="ad-btn ok" data-act="bc-send">📢 Yuborish</button></div>
      </div>
      <div class="g-label" style="margin-top:16px;"><span>Oxirgi xabarlar</span></div>${hist}`;
  }

  // --- YORDAMCHILAR ---
  function helpersHtml() {
    const rows = (hl.list || []).map((h) => `<div class="g-card ad-open"><span class="ad-cup-n"><b>${esc(h.name)}</b><small>${esc(h.leagueName)} · ${h.telegramId}</small></span><button class="ad-btn bad sm" data-act="hdel" data-id="${h.telegramId}" data-league="${esc(h.league)}">O'chirish</button></div>`).join('')
      || '<p class="ad-hint">Yordamchi adminlar yo\'q</p>';
    return `<div class="g-label"><span>Yordamchi adminlar</span></div>${rows}
      <div class="g-label" style="margin-top:16px;"><span>Yangi yordamchi</span></div>
      <div class="g-card ad-filters">
        <label class="ad-lbl">Foydalanuvchi Telegram ID si<input id="hId" class="ad-in" inputmode="numeric" placeholder="123456789"></label>
        <label class="ad-lbl">Liga<select id="hLg" class="ad-in">${leagueOpts(null, false)}</select></label>
        <button class="ad-btn ok" data-act="hadd">Tasdiqlash</button>
      </div>
      <p class="ad-hint">Yordamchi botga /start bosgan bo'lishi kerak. Tasdiqlangach unga xabar boradi.</p>`;
  }

  // --- KUBOK NARXLARI ---
  function cupsHtml() {
    if (!cups) return SK('rows', 3);
    const block = (g, title) => `<div class="g-label" style="margin-top:14px;"><span>${title}</span></div>${cups.filter((c) => String(c.group) === String(g)).map((c) => `<div class="g-card ad-cup" data-cup="${c.id}"><span class="ad-cup-n"><b>${esc(c.name)}</b><small>${c.price ? '💰 ' + money(c.price) + ' UZS' : 'Narx belgilanmagan'}</small></span><input type="number" inputmode="numeric" min="0" step="1000" placeholder="UZS" value="${c.price || ''}" data-price><button class="ad-btn ok sm" data-act="cupsave">Saqlash</button></div>`).join('')}`;
    return `<p class="ad-hint">Har bir liga va kubokning narxini so'mda kiriting. Foydalanuvchi kubokni sotganda shu narxda to'lov qilinadi.</p>${block('1', '1-ligalar')}${block('2', '2-ligalar')}${block('cup', 'Kuboklar (FA Cup, Copa del Rey, va h.k.)')}`;
  }

  // --- LIGALAR HOLATI (OCHIQ / YOPIQ) ---
  function openHtml() {
    const row = (l) => `<div class="g-card ad-open"><span class="ad-cup-n"><b>${esc(l.name)}</b><small>${l.players}/${l.max} ishtirokchi · ${l.closed ? '🔒 Yopiq' : '🟢 Ochiq'}</small></span><button class="ad-btn ${l.closed ? 'ok' : 'bad'} sm" data-act="toggleopen" data-lg="${l.id}" data-closed="${l.closed ? '' : '1'}">${l.closed ? '🔓 Ochish' : '🔒 Yopish'}</button></div>`;
    const grp = (g, title) => `<div class="g-label" style="margin-top:14px;"><span>${title}</span></div>${(ov?.leagues || []).filter((l) => String(l.group) === String(g)).map(row).join('')}`;
    return `<p class="ad-hint">Yopiq ligaga yangi ishtirokchi ro'yxatdan o'ta olmaydi. Mavjud ishtirokchilarga ta'sir qilmaydi.</p>${grp('1', '1-ligalar')}${grp('2', '2-ligalar')}`;
  }

  // --- KLUBLAR HOLATI ---
  function clubsHtml() {
    if (!cl.data) return '<p class="ad-hint">Yuklanmoqda…</p>';
    const all = cl.data.leagues, countries = (window.EFL?.COUNTRIES || []).filter((c) => all.some((l) => l.country === c.id));
    if (!countries.length) return '<p class="ad-hint">Ligalar topilmadi</p>';
    const country = countries.some((c) => c.id === cl.country) ? cl.country : countries[0].id;
    const leagues = all.filter((l) => l.country === country);
    const lg = leagues.find((l) => l.id === cl.league) || leagues[0];
    const taken = lg ? lg.clubs.filter((c) => c.taken).length : 0;
    const cBtns = countries.map((c) => `<button class="${c.id === country ? 'on' : ''}" data-act="clc" data-cid="${c.id}">${c.flag || ''} ${esc(c.name?.uz || c.id)}</button>`).join('');
    const lBtns = leagues.map((l) => `<button class="${l.id === lg?.id ? 'on' : ''}" data-act="cll" data-lid="${l.id}">${esc(l.name)}</button>`).join('');
    const grid = (lg?.clubs || []).map((c) => `<div class="ad-cl ${c.taken ? 'taken' : 'free'}"><b>${esc(c.name)}</b><small>${c.taken ? '🔒 ' + esc(c.user) : '✅ Bo\'sh'}</small></div>`).join('');
    return `<div class="ad-tabs" style="margin-bottom:8px;">${cBtns}</div><div class="ad-tabs" style="margin-bottom:12px;">${lBtns}</div>
      <div class="g-label"><span>${esc(lg?.name || '')} · band ${taken}/${lg?.clubs?.length || 0}</span></div>
      <div class="ad-clgrid">${grid}</div>`;
  }

  // --- TURNIRLAR ---
  function toursHtml() {
    const SB = { open: 'Qabul ochiq', league: 'Davom etmoqda', playoff: 'Play-off', finished: 'Yakunlangan' };
    if (!tours) return SK('rows', 3);
    return tours.map((x) => `<button class="g-card ut-card" data-act="tour-open" data-tid="${x.id}"><span><b>${esc(x.name)}</b><small>${esc(x.owner)} · ${x.players}/${x.max} · ${SB[x.status] || x.status}${x.action ? ` · <i style="color:#fb923c;font-style:normal">⚠️ ${x.action}</i>` : ''}</small></span><span class="chev">›</span></button>`).join('') || '<div class="pf-empty"><span>🏆</span><p>Turnir yo\'q</p></div>';
  }

  // --- AUKSION SOZLAMALARI ---
  function auctionHtml() {
    if (!aucCfg) return '<p class="ad-hint">Yuklanmoqda…</p>';
    return `<div class="g-card ad-lg">
      <div class="ad-meta">
        <b>🏷️ Auksion holati</b>
        <span class="ad-st ${aucCfg.enabled ? 'confirmed' : 'pending'}">${aucCfg.enabled ? '🟢 Faol' : '🔴 Yopiq'}</span>
      </div>
      <label class="ad-lbl" style="margin-top:12px;">Auksion tugash vaqti:
        <input type="datetime-local" id="aucEndTime" value="${aucCfg.auctionEnd ? fmtLocal(aucCfg.auctionEnd) : ''}">
      </label>
      <div class="ad-row" style="margin-top:12px;">
        <button class="ad-btn ok sm" data-act="auc-save">💾 Vaqtni saqlash</button>
        <button class="ad-btn ${aucCfg.enabled ? 'bad' : 'ok'} sm" data-act="auc-toggle" data-enabled="${aucCfg.enabled ? '' : '1'}">
          ${aucCfg.enabled ? '🔴 Auksionni to\'xtatish' : '🟢 Auksionni ochish'}
        </button>
      </div>
      <div class="ad-row" style="margin-top:14px;border-top:1px solid #1e293b;padding-top:12px;">
        <button class="ad-btn bad sm" data-act="auc-finalize">🏁 Auksionni yakunlash (klublarni g'oliblarga o'tkazish)</button>
      </div>
      <p class="ad-hint" style="margin-top:12px;">Auksion ochilganda foydalanuvchilar Do'kon → Auksion bo'limida klublar uchun tanga taklif qilishadi. Har bir yangi stavkada eski taklif egasining tangalari avtomatik qaytariladi. Yakunlanganda klub eng yuqori taklif qilganga o'tadi.</p>
    </div>`;
  }

  // --- TOP NAVIGATION TABS ---
  function tabsHtml() {
    const superAdmin = !!ov?.superAdmin;
    const allTabs = [
      ['liga', '🏆 Liga'],
      ['cup', '🎟️ Kubok'],
      ['stats', '📊 Statistika'],
      ['broadcast', '📢 Xabar'],
      ['helpers', '👥 Yordamchilar'],
      ['cups', '💰 Kubok narxi'],
      ['open', '🔓 Ligalar holati'],
      ['clubs', '🏟 Klublar'],
      ['tour', '🎮 Turnirlar'],
      ['auction', '🏷️ Auksion']
    ];
    // Assistant admin can only manage assigned leagues and view clubs
    const tabs = superAdmin ? allTabs : allTabs.filter(([k]) => k === 'liga' || k === 'clubs');

    return `<div class="ad-tabs" style="margin-bottom:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;display:flex;gap:6px;padding-bottom:4px;">
      ${tabs.map(([k, v]) => `<button class="${mainTab === k ? 'on' : ''}" data-act="switch-main" data-tab="${k}" style="white-space:nowrap;flex-shrink:0;">${v}</button>`).join('')}
    </div>`;
  }

  // --- MAIN RENDER ---
  function render() {
    if (!el) return;
    if (!ov) { el.innerHTML = '<div class="page ad-page"><p class="ad-hint">Yuklanmoqda…</p></div>'; return; }

    const superAdmin = !!ov.superAdmin;
    const myLeagues = superAdmin ? (ov.leagues || []) : (ov.leagues || []).filter((l) => (ov.helperLeagues || []).includes(l.id));

    if (!curLeague && myLeagues.length) curLeague = myLeagues[0].id;

    let content = '';

    if (mainTab === 'liga') {
      const leagueChips = `<div class="chips" style="margin-bottom:12px;">${myLeagues.map((l) => `<button class="chip${curLeague === l.id ? ' on' : ''}" data-act="pick-league" data-lid="${l.id}">${esc(l.name)}</button>`).join('')}</div>`;

      const subNav = `<div class="ad-tabs" style="margin-bottom:14px;">
        <button class="${ligaSubTab === 'draw' ? 'on' : ''}" data-act="sub-liga" data-sub="draw">🎲 Qura</button>
        <button class="${ligaSubTab === 'results' ? 'on' : ''}" data-act="sub-liga" data-sub="results">⚽ Natijalar</button>
        <button class="${ligaSubTab === 'players' ? 'on' : ''}" data-act="sub-liga" data-sub="players">👥 Ishtirokchilar</button>
        <button class="${ligaSubTab === 'support' ? 'on' : ''}" data-act="sub-liga" data-sub="support">💬 Xabarlar${ov.support ? ` <i>${ov.support}</i>` : ''}</button>
      </div>`;

      let inner = '';
      if (ligaSubTab === 'draw') inner = ligaDrawHtml();
      else if (ligaSubTab === 'results') inner = ligaResultsHtml();
      else if (ligaSubTab === 'players') inner = ligaPlayersHtml();
      else inner = ligaSupportHtml();

      content = `${leagueChips}${subNav}${inner}`;
    } else if (mainTab === 'cup') {
      const cupsList = [
        { id: 'fa-cup', name: 'FA Cup (Angliya)', flag: '🇬🇧' },
        { id: 'copa-del-rey', name: 'Copa del Rey (Ispaniya)', flag: '🇪🇸' },
      ];
      const cupChips = `<div class="chips" style="margin-bottom:12px;">${cupsList.map((c) => `<button class="chip${curCup === c.id ? ' on' : ''}" data-act="pick-cup" data-cid="${c.id}">${c.flag} ${esc(c.name)}</button>`).join('')}</div>`;

      const subNav = `<div class="ad-tabs" style="margin-bottom:14px;">
        <button class="${cupSubTab === 'draw' ? 'on' : ''}" data-act="sub-cup" data-sub="draw">🎲 Qura</button>
        <button class="${cupSubTab === 'results' ? 'on' : ''}" data-act="sub-cup" data-sub="results">⚽ Natijalar</button>
      </div>`;

      let inner = cupSubTab === 'draw' ? cupDrawHtml() : cupResultsHtml();
      content = `${cupChips}${subNav}${inner}`;
    } else if (mainTab === 'stats') {
      content = statsHtml();
    } else if (mainTab === 'broadcast') {
      content = broadcastHtml();
    } else if (mainTab === 'helpers') {
      content = helpersHtml();
    } else if (mainTab === 'cups') {
      content = cupsHtml();
    } else if (mainTab === 'open') {
      content = openHtml();
    } else if (mainTab === 'clubs') {
      content = clubsHtml();
    } else if (mainTab === 'tour') {
      content = toursHtml();
    } else if (mainTab === 'auction') {
      content = auctionHtml();
    }

    el.innerHTML = `<div class="page ad-page">
      <button class="back" data-act="adm-back"><span>‹</span> Ortga</button>
      <h1 class="section-title">🛠 Admin panel</h1>
      ${tabsHtml()}
      ${content}
      ${selApprovalMatch ? approvalModalHtml(selApprovalMatch) : ''}
    </div>`;

    loadImgs(el);
    const sb = el.querySelector('#spMsgs'); if (sb) sb.scrollTop = sb.scrollHeight;
  }

  // --- DATA LOADERS ---
  async function loadOverview() {
    const r = await api('/api/admin/overview');
    if (r.ok) {
      ov = r;
      if (!curLeague && r.leagues?.length) curLeague = r.leagues[0].id;
      render();
    }
  }

  async function loadMatches() {
    const r = await api('/api/admin/matches?status=all&league=' + (curLeague || ''));
    if (r.ok) {
      mt.list = r.matches || [];
      mt.total = r.total || 0;
      render();
    }
  }

  async function loadPlayers() {
    if (!curLeague) return;
    const r = await api(`/api/admin/league/${curLeague}/players`);
    if (r.ok) {
      pl.data = r;
      render();
    }
  }

  async function loadSupport() {
    const r = await api('/api/admin/support');
    if (r.ok) {
      sp.threads = r.threads || [];
      render();
    }
  }

  async function loadThread(scroll) {
    if (!sp.open) return;
    const r = await api('/api/admin/support/' + sp.open + '?league=' + encodeURIComponent(sp.league || ''));
    if (!r.ok || !sp.open) return;
    sp.msgs = r.messages || [];
    render();
    const box = el.querySelector('#spMsgs');
    if (box && scroll) box.scrollTop = box.scrollHeight;
  }

  async function loadCup() {
    const r = await api('/api/admin/cup?cup=' + curCup);
    if (r.ok) {
      cupState = r;
      render();
    }
  }

  async function loadStats() {
    const r = await api('/api/admin/stats?days=14');
    if (r.ok) {
      st = r;
      if (mainTab === 'stats') render();
    }
  }

  async function loadBroadcasts() {
    const r = await api('/api/admin/broadcast');
    if (!r.ok) return;
    bc.list = r.list;
    if (mainTab === 'broadcast') render();
    const running = (r.list || []).some((b) => b.status === 'running');
    if (running && !bcTimer) bcTimer = setInterval(() => (mainTab === 'broadcast' ? loadBroadcasts() : (clearInterval(bcTimer), (bcTimer = null))), 3000);
    if (!running && bcTimer) { clearInterval(bcTimer); bcTimer = null; }
  }

  async function loadBcCount() {
    const r = await post('/api/admin/broadcast/count', { league: bc.league || undefined, lang: bc.lang || undefined });
    bc.count = r.ok ? r.count : null;
    const c = el.querySelector('#bcCount'); if (c) c.textContent = bc.count == null ? '—' : money(bc.count) + ' kishiga boradi';
  }

  async function loadHelpers() {
    const r = await api('/api/admin/helpers');
    if (r.ok) {
      hl.list = r.helpers;
      if (mainTab === 'helpers') render();
    }
  }

  async function loadCups() {
    const r = await api('/api/admin/cup-prices');
    if (r.ok) {
      cups = r.cups;
      if (mainTab === 'cups') render();
    }
  }

  async function loadClubs() {
    const r = await api('/api/admin/clubs');
    if (r.ok) {
      cl.data = r;
      if (mainTab === 'clubs') render();
    }
  }

  async function loadTours() {
    const r = await api('/api/admin/tournaments');
    if (r.ok) {
      tours = r.list;
      if (mainTab === 'tour') render();
    }
  }

  async function loadAuction() {
    const r = await api('/api/admin/auction/config');
    if (r.ok) {
      aucCfg = r;
      if (mainTab === 'auction') render();
    }
  }

  // --- CLICK EVENT HANDLERS ---
  async function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === 'adm-back') {
      if (location.hash === '#admin') location.hash = '';
      else if (window.LeagueView?.back) window.LeagueView.back();
      return;
    }
    if (act === 'switch-main') {
      mainTab = btn.dataset.tab;
      render();
      if (mainTab === 'cup' && !cupState) loadCup();
      if (mainTab === 'liga' && !mt.list.length) loadMatches();
      if (mainTab === 'stats') loadStats();
      if (mainTab === 'broadcast') { loadBroadcasts(); loadBcCount(); }
      if (mainTab === 'helpers') loadHelpers();
      if (mainTab === 'clubs') loadClubs();
      if (mainTab === 'tour') loadTours();
      if (mainTab === 'cups') loadCups();
      if (mainTab === 'auction') loadAuction();
      return;
    }
    if (act === 'pick-league') {
      curLeague = btn.dataset.lid;
      pl.data = null;
      render();
      if (ligaSubTab === 'results') loadMatches();
      if (ligaSubTab === 'players') loadPlayers();
      return;
    }
    if (act === 'sub-liga') {
      ligaSubTab = btn.dataset.sub;
      render();
      if (ligaSubTab === 'results') loadMatches();
      if (ligaSubTab === 'players') loadPlayers();
      if (ligaSubTab === 'support') loadSupport();
      return;
    }
    if (act === 'pick-cup') {
      curCup = btn.dataset.cid;
      cupState = null;
      render();
      loadCup();
      return;
    }
    if (act === 'sub-cup') {
      cupSubTab = btn.dataset.sub;
      render();
      if (cupSubTab === 'results') loadMatches();
      return;
    }

    // --- Qura harakatlari ---
    if (act === 'settime') {
      const v = el.querySelector('#lgDrawTime')?.value;
      if (!v) return toast('Vaqtni tanlang');
      return done(await post(`/api/admin/league/${curLeague}/draw-time`, { drawAt: new Date(v).toISOString() }), 'Qura vaqti saqlandi ✅');
    }
    if (act === 'draw') {
      if (!(await confirmBox("Qurani hozir o'tkazamizmi?"))) return;
      return done(await post(`/api/admin/league/${curLeague}/draw`, {}), 'Qura o\'tkazildi 🎲', loadMatches);
    }
    if (act === 'redo') {
      if (!(await confirmBox("Qurani qayta o'tkazamizmi? Eski jadval o'chiriladi."))) return;
      return done(await post(`/api/admin/league/${curLeague}/draw`, { redo: true }), 'Qayta qura o\'tkazildi 🎲', loadMatches);
    }
    if (act === 'draw-cancel') {
      if (!(await confirmBox("Qura bekor qilinadimi? Barcha o'yinlar o'chadi."))) return;
      return done(await post(`/api/admin/league/${curLeague}/draw-cancel`, {}), 'Qura bekor qilindi ✖', loadMatches);
    }
    if (act === 'save-round-dl') {
      const r = Number(btn.dataset.round);
      const v = el.querySelector('#roundDlInput')?.value;
      if (!v) return toast('Vaqtni tanlang');
      return done(await post(`/api/admin/league/${curLeague}/round-deadline`, { round: r, deadline: new Date(v).toISOString() }), `${r}-tur dedlayni saqlandi ✅`);
    }
    if (act === 'toggle-round-open') {
      const r = Number(btn.dataset.round), open = btn.dataset.open === '1';
      return done(await post(`/api/admin/league/${curLeague}/rounds`, { round: r, open }), open ? `${r}-tur ochildi 🔓` : `${r}-tur yopildi 🔒`);
    }
    if (act === 'rall') {
      const open = btn.dataset.open === '1';
      if (!open && !(await confirmBox("Barcha turlar yopilsinmi?"))) return;
      return done(await post(`/api/admin/league/${curLeague}/rounds`, { all: true, open }), open ? "Barcha turlar ochildi 🔓" : "Barcha turlar yopildi 🔒");
    }

    // --- Natijalar & Modal ---
    if (act === 'save-score') {
      const card = btn.closest('[data-mid]'), mid = card.dataset.mid;
      const hg = parseInt(card.querySelector('[data-hg]').value, 10);
      const ag = parseInt(card.querySelector('[data-ag]').value, 10);
      if (!(hg >= 0 && hg <= 99 && ag >= 0 && ag <= 99)) return toast(ERR.badScore);
      return done(await post(`/api/admin/matches/${mid}/result`, { hg, ag }), 'Natija saqlandi ✅', loadMatches);
    }
    if (act === 'reset') {
      const card = btn.closest('[data-mid]'), mid = card.dataset.mid;
      if (!(await confirmBox("Natija o'chirilsinmi?"))) return;
      return done(await post(`/api/admin/matches/${mid}/reset`, {}), "Natija o'chirildi 🗑", loadMatches);
    }
    if (act === 'open-approval') {
      const mid = btn.dataset.mid;
      selApprovalMatch = (mt.list || []).find((m) => m.id === mid);
      render();
      return;
    }
    if (act === 'close-approval') {
      selApprovalMatch = null;
      render();
      return;
    }
    if (act === 'confirm-approval') {
      const mid = btn.dataset.mid;
      const hg = parseInt(el.querySelector('#appHomeScore')?.value, 10);
      const ag = parseInt(el.querySelector('#appAwayScore')?.value, 10);
      if (!(hg >= 0 && hg <= 99 && ag >= 0 && ag <= 99)) return toast(ERR.badScore);
      selApprovalMatch = null;
      return done(await post(`/api/admin/matches/${mid}/result`, { hg, ag }), 'Natija tasdiqlandi ✅', () => { loadMatches(); if (mainTab === 'cup') loadCup(); });
    }
    if (act === 'reject-approval') {
      const mid = btn.dataset.mid;
      if (!(await confirmBox("Natija rad etilib bekor qilinsinmi?"))) return;
      selApprovalMatch = null;
      return done(await post(`/api/admin/matches/${mid}/reset`, {}), 'Natija rad etildi ❌', () => { loadMatches(); if (mainTab === 'cup') loadCup(); });
    }

    // --- Ishtirokchilar ---
    if (act === 'add-player') {
      const user = el.querySelector('#addUserInput')?.value.trim();
      const club = el.querySelector('#addClubSelect')?.value;
      if (!user || !club) return toast('Foydalanuvchi va klubni kiriting');
      return done(await post(`/api/admin/league/${curLeague}/add`, { user, club }), "Ishtirokchi qo'shildi ✅", loadPlayers);
    }
    if (act === 'remove-player') {
      if (!(await confirmBox(`${btn.dataset.name} ligadan chiqarilsinmi?`))) return;
      return done(await post(`/api/admin/league/${curLeague}/remove`, { telegramId: Number(btn.dataset.tid) }), 'Ishtirokchi chiqarildi', loadPlayers);
    }
    if (act === 'transfer-player') {
      el.insertAdjacentHTML('beforeend', transferModalHtml(btn.dataset.tid, btn.dataset.club));
      return;
    }
    if (act === 'close-transfer') {
      el.querySelector('#transferModal')?.remove();
      return;
    }
    if (act === 'confirm-transfer') {
      const user = el.querySelector('#transferUserInput')?.value.trim();
      const club = btn.dataset.club;
      if (!user) return toast('Foydalanuvchini kiriting');
      el.querySelector('#transferModal')?.remove();
      return done(await post(`/api/admin/league/${curLeague}/add`, { user, club }), "Ishtirokchi almashtirildi ✅", loadPlayers);
    }
    if (act === 'restore-orphan') {
      const box = btn.closest('.ad-rec'), from = Number(box.querySelector('[data-from]').value), to = Number(box.dataset.to);
      if (!from || !to) return toast('Eski egasini tanlang');
      if (!(await confirmBox("O'yinlar va natijalar yangi egasiga qaytarilsinmi?"))) return;
      return done(await post(`/api/admin/league/${curLeague}/restore`, { from, to }), "O'yinlar tiklandi ✅", loadPlayers);
    }

    // --- Xabarlar ---
    if (act === 'spopen') {
      sp.open = btn.dataset.uid;
      sp.name = btn.dataset.name;
      sp.league = btn.dataset.league;
      sp.leagueName = btn.dataset.lname;
      render();
      loadThread(true);
      return;
    }
    if (act === 'spback') {
      sp.open = null;
      render();
      loadSupport();
      return;
    }
    if (act === 'spsend') {
      const inp = el.querySelector('#spText'), text = inp?.value.trim();
      if (!text) return;
      inp.value = '';
      const r = await post('/api/admin/support/' + sp.open, { text, league: sp.league || '' });
      if (!r.ok) { inp.value = text; return toast('Yuborilmadi'); }
      return loadThread(true);
    }
    if (act === 'zoom') {
      return lightbox(btn.src);
    }
    if (act === 'viewchat') {
      const box = btn.parentElement.querySelector('[data-chatbox]'), mid = btn.closest('[data-mid]').dataset.mid;
      if (box.innerHTML) { box.innerHTML = ''; return; }
      const r = await api(`/api/admin/matches/${mid}/chat`);
      box.innerHTML = r.ok ? (r.messages.map((x) => `<div class="m-b ${x.side === 'home' ? 'op' : 'me'}"><b class="ad-by">${esc(x.by)}</b>${x.type === 'room' ? `🎮 Xona ID: <b>${esc(x.text)}</b>` : `<span>${esc(x.text)}</span>`}<small>${hm2(x.at)}</small></div>`).join('') || '<p class="ad-hint">Chat bo\'sh</p>') : '<p class="ad-hint">Yuklanmadi</p>';
      return;
    }

    // --- Kubok harakatlari ---
    if (act === 'cup-draw') {
      const box = btn.closest('[data-cupstage]'), stage = box?.dataset.cupstage;
      if (!(await confirmBox("Qurani hozir o'tkazamizmi?"))) return;
      return done(await post('/api/admin/cup/draw', { cup: curCup, stage }), 'Qura o\'tkazildi 🎲', loadCup);
    }
    if (act === 'cup-start') {
      const box = btn.closest('[data-cupstage]'), stage = box?.dataset.cupstage;
      const hours = Number(box?.querySelector('[data-hours]')?.value || 24);
      return done(await post('/api/admin/cup/start', { cup: curCup, stage, hours }), 'Bosqich ochildi ▶️', loadCup);
    }
    if (act === 'cup-reset') {
      const box = btn.closest('[data-cupstage]'), stage = box?.dataset.cupstage;
      if (!(await confirmBox("Bosqich tozalanadi va qulflanadi. Davom etilsinmi?"))) return;
      return done(await post('/api/admin/cup/reset', { cup: curCup, stage }), 'Bosqich tozalandi 🧹', loadCup);
    }
    if (act === 'cup-advance') {
      const box = btn.closest('[data-cupstage]'), stage = box?.dataset.cupstage;
      return done(await post('/api/admin/cup/advance', { cup: curCup, stage }), "Keyingi bosqichga o'tildi ➡️", loadCup);
    }
    if (act === 'cup-shield') {
      const r = await post('/api/admin/cup/shield', { cup: curCup });
      if (!r.ok) return toast(r.error === 'pl_not_finished' ? '1-liga hali tugamagan' : 'Finalchilar hali aniqlanmagan');
      toast((cupState?.shieldName || 'Supercup') + ' yaratildi 🛡');
      return loadCup();
    }
    if (act === 'cup-award') {
      if (!(await confirmBox("G'olibga kubok topshirilsinmi?"))) return;
      const r = await post('/api/admin/cup/award', { cup: curCup, kind: btn.dataset.kind });
      return done(r, 'Kubok topshirildi 🏆', loadCup);
    }

    // --- Yordamchilar harakatlari ---
    if (act === 'hadd') {
      const tid = Number(el.querySelector('#hId')?.value), lgId = el.querySelector('#hLg')?.value || '';
      if (!Number.isInteger(tid) || tid <= 0 || !lgId) return toast(ERR.fail);
      const r = await post('/api/admin/helpers', { telegramId: tid, league: lgId });
      return done(r, "Yordamchi admin qo'shildi ✅", loadHelpers);
    }
    if (act === 'hdel') {
      if (!(await confirmBox("Yordamchi admin huquqini olib tashlaysizmi?"))) return;
      const r = await post('/api/admin/helpers/remove', { telegramId: Number(btn.dataset.id), league: btn.dataset.league });
      return done(r, "Olib tashlandi", loadHelpers);
    }

    // --- Kubok narxlari ---
    if (act === 'cupsave') {
      const box = btn.closest('[data-cup]'), price = Math.round(Number(box.querySelector('[data-price]').value || 0));
      if (!(price >= 0 && price <= 1e9)) return toast("Narxni to'g'ri kiriting");
      const r = await post('/api/admin/cup-prices', { league: box.dataset.cup, price });
      if (!r.ok) return toast(ERR.fail);
      const c = (cups || []).find((x) => x.id === box.dataset.cup); if (c) c.price = price;
      tg?.HapticFeedback?.notificationOccurred('success');
      toast(price ? 'Narx saqlandi ✅' : "Narx o'chirildi");
      return render();
    }

    // --- Ligalar holati ---
    if (act === 'toggleopen') {
      const closed = btn.dataset.closed === '1', lg = btn.dataset.lg;
      if (closed && !(await confirmBox("Ligani yopamizmi? Yangi ishtirokchilar ro'yxatdan o'ta olmaydi."))) return;
      return done(await post(`/api/admin/league/${lg}/closed`, { closed }), closed ? 'Liga yopildi 🔒' : 'Liga ochildi 🔓');
    }

    // --- Klublar filtrlari ---
    if (act === 'clc') {
      cl.country = btn.dataset.cid;
      cl.league = null;
      return render();
    }
    if (act === 'cll') {
      cl.league = btn.dataset.lid;
      return render();
    }

    // --- Turnirlar ---
    if (act === 'tour-open') {
      location.hash = '#unofficial/' + btn.dataset.tid;
      return;
    }

    // --- Ommaviy xabar ---
    if (act === 'bc-test' || act === 'bc-send') {
      const text = bc.text.trim();
      if (!text) return toast('Matnni yozing');
      if (act === 'bc-test') {
        const r = await post('/api/admin/broadcast', { text, test: true });
        return toast(r.ok ? "Sinov xabari o'zingizga yuborildi 🧪" : "Yuborilmadi — avval botga /start bosing");
      }
      if (!(await confirmBox(`Xabar ${bc.count ?? ''} kishiga yuboriladi. Davom etilsinmi?`))) return;
      const r = await post('/api/admin/broadcast', { text, league: bc.league || undefined, lang: bc.lang || undefined });
      if (!r.ok) return toast(r.error === 'busy' ? "Boshqa xabar hali yuborilmoqda" : r.error === 'empty' ? "Qabul qiluvchi yo'q" : ERR.fail);
      tg?.HapticFeedback?.notificationOccurred('success');
      toast(`Yuborish boshlandi: ${r.total} kishi 📢`);
      bc.text = '';
      return loadBroadcasts();
    }

    // --- Auksion sozlamalari ---
    if (act === 'auc-save') {
      const v = el.querySelector('#aucEndTime')?.value;
      if (!v) return toast('Vaqtni tanlang');
      const r = await post('/api/admin/auction/config', { auctionEnd: new Date(v).toISOString() });
      return done(r, 'Auksion tugash vaqti saqlandi ✅', loadAuction);
    }
    if (act === 'auc-toggle') {
      const enabled = btn.dataset.enabled === '1';
      if (!enabled && !(await confirmBox("Auksionni to'xtatmoqchimisiz?"))) return;
      const r = await post('/api/admin/auction/config', { enabled });
      return done(r, enabled ? 'Auksion ochildi 🟢' : 'Auksion to\'xtatildi 🔴', loadAuction);
    }
    if (act === 'auc-finalize') {
      if (!(await confirmBox("Auksionni yakunlab, barcha auksiondagi klublarni eng yuqori taklif egalariga o'tkazasizmi?"))) return;
      const r = await post('/api/admin/auction/finalize', {});
      return done(r, `Auksion yakunlandi: ${r.finalized || 0} ta klub o'tkazildi 🏁`, loadAuction);
    }
  }

  function onChange(e) {
    const act = e.target.dataset.act || e.target.dataset.f;
    if (act === 'pick-round') {
      selRoundNum = Number(e.target.value);
      render();
    } else if (act === 'res-filter-round') {
      mt.filterRound = e.target.value;
      render();
    } else if (act === 'res-filter-club') {
      mt.filterClub = e.target.value;
      render();
    } else if (act === 'cup-res-filter-stage') {
      mt.filterStage = e.target.value;
      render();
    } else if (act === 'bcleague' || act === 'bclang') {
      bc[act === 'bcleague' ? 'league' : 'lang'] = e.target.value;
      bc.count = null;
      loadBcCount();
    }
  }

  function onInput(e) {
    if (e.target.id === 'plSearchInp') {
      pl.search = e.target.value;
      render();
    }
    if (e.target.id === 'bcText') {
      bc.text = e.target.value;
      const l = el.querySelector('#bcLen'); if (l) l.textContent = bc.text.length + '/3500';
    }
  }

  function show(root, toastFn) {
    el = root;
    toast = toastFn;
    if (window.ADMIN_START_TAB) {
      mainTab = window.ADMIN_START_TAB;
      window.ADMIN_START_TAB = null;
    }
    if (!el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener('click', onClick);
      el.addEventListener('change', onChange);
      el.addEventListener('input', onInput);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.id === 'spText') {
          e.preventDefault();
          el.querySelector('[data-act="spsend"]')?.click();
        }
      });
    }
    render();
    loadOverview().then(() => {
      loadMatches();
      loadCup();
    });
  }

  const leave = () => {
    if (el) el.dataset.loaded = '';
    clearInterval(spTimer);
    if (bcTimer) { clearInterval(bcTimer); bcTimer = null; }
  };

  return { show, leave };
})();
