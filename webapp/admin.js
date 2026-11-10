// Admin panel: Liga va Kubok bo'limlari, qura, natijalar, ishtirokchilar va xabarlar
window.AdminView = (() => {
  const tg = window.Telegram?.WebApp;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '' } }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
  const ERR = { nowinner: "G'olib hali aniqlanmagan", already: 'Bu kubok allaqachon topshirilgan', hasgames: "Yangi egasi allaqachon o'yin o'ynagan, tiklab bo'lmaydi", active: 'Eski egasi hali ligada', nogames: "Bekor qilingan o'yin topilmadi", drawn: "Qura allaqachon o'tkazilgan", few: 'Kamida 2 ishtirokchi kerak', played: "Hisoblar kiritilgan — qayta qura qilib bo'lmaydi", nouser: "Foydalanuvchi topilmadi (botga /start bosgan bo'lishi kerak)", taken: 'Bu klub band', full: "Liga to'lgan", badScore: "Hisobni to'g'ri kiriting (0–99)", gone: "Topilmadi yoki holati o'zgargan", forbidden: "Ruxsat yo'q", stage: "Bosqich topilmadi", nodraw: "Avval qura tashlang", none: "Tasdiqlangan o'yinlar yo'q", time: "Vaqt noto'g'ri", fail: "Xatolik, qayta urinib ko'ring" };

  let el, toast;
  let mainTab = 'liga'; // 'liga' | 'cup'
  let curLeague = '';
  let curCup = 'fa-cup';
  let ligaSubTab = 'draw'; // 'draw' | 'results' | 'players' | 'support'
  let cupSubTab = 'draw'; // 'draw' | 'results'

  let ov = null;
  let mt = { list: [], total: 0, filterClub: 'all', filterRound: 'all' };
  let pl = { data: null, search: '' };
  let sp = { threads: null, open: null, name: '', league: '', leagueName: '', msgs: [], sig: '' };
  let spTimer = null;
  let cupState = null;
  let selApprovalMatch = null;
  let selRoundNum = 1;

  const fmtLocal = (d) => { const x = new Date(d), p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; };
  const fmtShow = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const confirmBox = (msg) => new Promise((res) => (tg?.showConfirm ? tg.showConfirm(msg, res) : res(window.confirm(msg))));

  async function done(r, okMsg, reload) {
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(okMsg); } else toast(ERR[r.error] || ERR.fail);
    await loadOverview();
    if (reload) await reload();
  }

  // --- Image Cache for proofs ---
  const imgCache = new Map();
  async function loadImgs(root) {
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
    const clubs = window.EFL?.byId[curLeague]?.clubs || [];
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
            ${Array.from({ length: nRounds }, (_, i) => i + 1).map((r) => `<option value="${r}" ${String(filterRound) === String(r) ? 'selected' : ''}>${r}-tur</option>`).join('')}
          </select>
        </div>
        <div class="lf-item">
          <label>🛡️ Klubni tanlash</label>
          <select class="lf-select" data-act="res-filter-club">
            <option value="all" ${filterClub === 'all' ? 'selected' : ''}>Barcha klublar</option>
            ${clubs.map((c) => `<option value="${c.id}" ${filterClub === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      ${list.map(matchRowHtml).join('') || '<div class="pf-empty"><span>⚽</span><p>O\'yinlar topilmadi</p></div>'}`;
  }

  function matchRowHtml(m) {
    const ST_MAP = { scheduled: 'Kiritilmagan', pending: 'Kutilmoqda', disputed: '⚠️ Bahsli', confirmed: 'Tasdiqlangan' };
    return `<div class="g-card ad-match" data-mid="${m.id}">
      <div class="ad-meta">
        <small>${m.round}-tur · <b>${ST_MAP[m.status] || m.status}</b></small>
        ${m.status === 'confirmed' ? '<span class="gm-chip ok">✓</span>' : ''}
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
      <div class="ad-row" style="margin-top:10px;">
        <button class="ad-btn ok sm" data-act="save-match-res">💾 Saqlash</button>
        ${m.status !== 'scheduled' ? `<button class="ad-btn bad sm" data-act="reset-match-res">🗑 O'chirish</button>` : ''}
        ${m.chat ? `<button class="ad-btn ghost sm" data-act="viewchat">💬 Chat (${m.chat})</button>` : ''}
      </div>
      <div class="ad-chatbox" data-chatbox></div>
    </div>`;
  }

  // --- LIGA SUB-TAB: 3. ISHTIROKCHILAR ---
  function ligaPlayersHtml() {
    const d = pl.data;
    if (!d) return '<p class="ad-hint">Yuklanmoqda…</p>';

    let players = d.players || [];
    if (pl.search) {
      const q = pl.search.toLowerCase();
      players = players.filter((p) => p.club?.toLowerCase().includes(q) || p.user?.toLowerCase().includes(q) || String(p.telegramId).includes(q));
    }

    return `<div class="g-card live-filters" style="margin-bottom:12px;">
      <div class="lf-item" style="flex:1;">
        <label>🔍 Qidiruv (username yoki klub)</label>
        <input type="text" class="lf-select" id="plSearchInp" value="${esc(pl.search)}" placeholder="@username, klub yoki ID...">
      </div>
    </div>
    
    <div class="g-label"><span>Mavjud ishtirokchilar (${players.length}/${d.max})</span></div>
    ${players.map((p) => `<div class="g-card ad-pl" data-tid="${p.telegramId}" data-club="${esc(p.club)}">
      <span><b>${esc(p.club)}</b><small>${esc(p.user)} · ${p.pts || 0} ball · ID: ${p.telegramId}</small></span>
      <div class="ad-row">
        <button class="ad-btn ghost sm" data-act="transfer-player" data-tid="${p.telegramId}" data-club="${esc(p.club)}">🔄 Almashtirish</button>
        <button class="ad-btn bad sm" data-act="remove-player" data-tid="${p.telegramId}" data-name="${esc(p.club)}">🚪 Chiqarish</button>
      </div>
    </div>`).join('') || '<p class="ad-hint">Ishtirokchi topilmadi</p>'}

    <div class="g-label" style="margin-top:16px;"><span>➕ Yangi ishtirokchi qo'shish</span></div>
    <div class="g-card ad-add">
      <label class="ad-lbl">Foydalanuvchi username yoki Telegram ID:
        <input type="text" id="addUserInput" placeholder="@username yoki 123456789">
      </label>
      <label class="ad-lbl">Bo'sh klub:
        <select id="addClubSelect">
          ${(d.free || []).map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        </select>
      </label>
      <button class="ad-btn ok sm" data-act="add-player" style="margin-top:10px;">➕ Ishtirokchini qo'shish</button>
    </div>`;
  }

  // --- LIGA SUB-TAB: 4. XABARLAR ---
  const hm2 = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const bubble = (x) => `<div class="m-b ${x.mine ? 'me' : 'op'}">${x.fileId ? `<img class="m-img" data-fid="${esc(x.fileId)}" alt="">` : ''}${x.text ? `<span>${esc(x.text)}</span>` : ''}<small>${hm2(x.at)}</small></div>`;

  function ligaSupportHtml() {
    if (sp.open) {
      return `<button class="back" data-act="spback"><span>‹</span> Murojaatlar ro'yxati</button>
        <div class="g-card ad-thread-h"><b>${esc(sp.name)}</b><small>ID ${sp.open} · 🏆 ${esc(sp.leagueName)}</small></div>
        <div class="m-msgs ad-msgs" id="spMsgs">${sp.msgs.map(bubble).join('') || '<p class="m-empty">Xabar yo\'q</p>'}</div>
        <div class="m-send">
          <input id="spText" maxlength="800" placeholder="Javob yozing…" autocomplete="off">
          <button class="m-ic go" data-act="spsend">➤</button>
        </div>`;
    }
    const threads = (sp.threads || []).filter((x) => !curLeague || x.league === curLeague);
    return `<div class="g-label"><span>Foydalanuvchilar murojaatlari</span></div>
      ${threads.map((x) => `<button class="g-card ad-thread" data-act="spopen" data-uid="${x.uid}" data-name="${esc(x.name)}" data-league="${esc(x.league || '')}" data-lname="${esc(x.leagueName || '')}">
        <span>
          <b>${esc(x.name)}</b>${x.leagueName ? `<em>🏆 ${esc(x.leagueName)}</em>` : ''}
          <small>${x.fromAdmin ? 'Siz: ' : ''}${esc((x.text || '').slice(0, 70))}</small>
        </span>
        <span class="ad-thread-r">
          <small>${hm2(x.at)}</small>
          ${x.unread ? `<i class="gm-badge" style="position:static">${x.unread}</i>` : ''}
        </span>
      </button>`).join('') || '<div class="pf-empty"><span>📭</span><p>Murojaatlar yo\'q</p></div>'}`;
  }

  // --- KUBOK BO'LIMI ---
  function cupDrawHtml() {
    if (!cupState) return '<p class="ad-hint">Yuklanmoqda…</p>';
    return `<p class="ad-hint">Saralash va asosiy to'r bosqichlarini ochish, dedlayn belgilash va qura o'tkazish.</p>` +
      (cupState.stages || []).map((s) => {
        const drawn = !!s.drawnAt;
        return `<div class="g-card ad-lg" data-cupstage="${s.stage}" style="margin-bottom:12px;">
          <div class="ad-meta">
            <b>${esc(s.label)}</b>
            <span class="ad-st ${drawn ? 'confirmed' : 'pending'}">${drawn ? 'Qura o\'tgan' : 'Qura qilinmagan'}</span>
          </div>
          <p class="ad-hint">
            ${drawn ? `🎲 ${fmtShow(s.drawnAt)}` : '🎲 Qura hali o\'tkazilmagan'}
            ${s.startedAt ? ` · 🟢 Boshlangan: ${fmtShow(s.startedAt)}` : ''}
            ${s.deadline ? ` · ⏰ Dedlayn: ${fmtShow(s.deadline)}` : ''}
            ${s.matches ? ` · ✅ ${s.confirmed}/${s.matches}` : ''}
          </p>
          <div class="ad-row" style="margin-top:10px;">
            ${drawn
              ? `<label class="ad-lbl" style="flex:1;">Dedlayn (soat):<input type="number" min="0" max="720" value="24" data-hours></label>
                 <button class="ad-btn ok sm" data-act="cup-start">▶️ Ochish / Start</button>
                 <button class="ad-btn bad sm" data-act="cup-reset">🔒 Qulflash / Tozalash</button>`
              : `<button class="ad-btn ok sm" data-act="cup-draw">🎲 Hozir qura qilish</button>`}
          </div>
          ${s.stage !== 'final' ? `<div style="margin-top:8px;"><button class="ad-btn ghost sm" data-act="cup-advance">➡️ Keyingi bosqichga o'tish</button></div>` : ''}
        </div>`;
      }).join('');
  }

  function cupResultsHtml() {
    if (!cupState) return '<p class="ad-hint">Yuklanmoqda…</p>';
    const stages = cupState.stages || [];
    const filterStage = mt.filterStage || 'all';

    let qMatches = (cupState.qualifiers || []).concat(cupState.bracket || []);
    if (filterStage !== 'all') {
      const stg = stages.find((s) => s.stage === filterStage);
      if (stg) qMatches = qMatches.filter((m) => m.round === stg.round);
    }

    const pendingMatches = qMatches.filter((m) => m.status === 'pending' || m.status === 'disputed');
    const pendingBlock = pendingMatches.length ? `<div class="g-label"><span>⏳ Tasdiqlash kutayotgan kubok natijalari (${pendingMatches.length})</span></div>
      ${pendingMatches.map((m) => `<div class="g-card ad-pending-card" data-act="open-approval" data-mid="${m.id}" style="cursor:pointer">
        <div class="ad-pending-left">
          <span>⚽ <b>${esc(m.home?.club)}</b> <b class="ad-pending-sc">${m.hg ?? '–'}:${m.ag ?? '–'}</b> <b>${esc(m.away?.club)}</b></span>
          <small>Tur ${m.round} · Tasdiqlash kutilmoqda</small>
        </div>
        <button class="ad-btn ghost sm" data-act="open-approval" data-mid="${m.id}">Batafsil ›</button>
      </div>`).join('')}` : '';

    return `${pendingBlock}
      <div class="g-label" style="margin-top:16px;"><span>📋 Kubok o'yinlari va natijalari</span></div>
      <div class="g-card live-filters" style="margin-bottom:12px;">
        <div class="lf-item">
          <label>🔢 Bosqich / Saralashni tanlash</label>
          <select class="lf-select" data-act="cup-res-filter-stage">
            <option value="all" ${filterStage === 'all' ? 'selected' : ''}>Barcha bosqichlar</option>
            ${stages.map((s) => `<option value="${s.stage}" ${filterStage === s.stage ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>
        </div>
      </div>
      ${qMatches.map((m) => `<div class="g-card ad-match" data-mid="${m.id}">
        <div class="ad-meta"><small>Tur ${m.round} · <b>${m.status || 'kutilmoqda'}</b></small></div>
        <div class="ad-vs">
          <div><b>${esc(m.home?.club)}</b><small>${esc(m.home?.user || '')}</small></div>
          <div class="ad-in">
            <input type="number" min="0" max="99" value="${m.hg ?? ''}" data-hg>
            <b>:</b>
            <input type="number" min="0" max="99" value="${m.ag ?? ''}" data-ag>
          </div>
          <div><b>${esc(m.away?.club)}</b><small>${esc(m.away?.user || '')}</small></div>
        </div>
        <div class="ad-row" style="margin-top:10px;">
          <button class="ad-btn ok sm" data-act="save-match-res">💾 Saqlash</button>
          <button class="ad-btn bad sm" data-act="reset-match-res">🗑 O'chirish</button>
        </div>
      </div>`).join('') || '<div class="pf-empty"><span>⚽</span><p>O\'yinlar topilmadi</p></div>'}`;
  }

  // --- MODAL: TASDIQLASH (APPROVAL) MODAL ---
  function approvalModalHtml(m) {
    if (!m) return '';
    const hClub = m.home?.club || 'Home';
    const aClub = m.away?.club || 'Away';
    const hUser = m.home?.user || '—';
    const aUser = m.away?.user || '—';
    const proofs = m.proofs || [];

    const shots = proofs.map((p) => p.fileId ? `<div class="ad-shot-box"><p>📎 ${esc(p.by || 'Foydalanuvchi')}</p><img class="ad-shot" data-fid="${esc(p.fileId)}" alt="Skrinshot"></div>` : '').join('');

    return `<div class="modal" id="approvalModal"><div class="modal-box">
      <h3>⚽ Natijani tasdiqlash</h3>
      <div class="ad-vs" style="margin:16px 0;">
        <div><b>${esc(hClub)}</b><small>${esc(hUser)}</small></div>
        <div style="font-size:24px;font-weight:700;color:#22d3ee;">${m.hg ?? 0} : ${m.ag ?? 0}</div>
        <div><b>${esc(aClub)}</b><small>${esc(aUser)}</small></div>
      </div>
      ${shots || '<p class="ad-hint">Skrinshot yuborilmagan</p>'}
      <div class="modal-btns" style="margin-top:16px;">
        <button class="mb-no" data-act="reject-approval" data-mid="${m.id}">❌ Rad etish</button>
        <button class="mb-ok" data-act="confirm-approval" data-mid="${m.id}" data-hg="${m.hg ?? 0}" data-ag="${m.ag ?? 0}">✅ Tasdiqlash</button>
      </div>
      <button class="tu-close" data-act="close-approval" style="margin-top:12px;">Yopish</button>
    </div></div>`;
  }

  // --- MODAL: ISHTIROKCHINI ALMASHTIRISH ---
  function transferModalHtml(tid, club) {
    return `<div class="modal" id="transferModal"><div class="modal-box">
      <h3>🔄 ${esc(club)} klubini almashtirish</h3>
      <p class="ad-hint">Yangi foydalanuvchi @username yoki Telegram ID sini kiriting. Klub va uning barcha o'yinlari unga o'tkaziladi.</p>
      <input type="text" id="transferUserInput" placeholder="@username yoki 123456789" style="width:100%;margin:12px 0;">
      <div class="modal-btns">
        <button class="mb-no" data-act="close-transfer">Bekor qilish</button>
        <button class="mb-ok" data-act="confirm-transfer" data-club="${esc(club)}">Tasdiqlash</button>
      </div>
    </div></div>`;
  }

  // --- ASOSIY RENDER FUNKSIYASI ---
  function render() {
    if (!el) return;
    if (!ov) { el.innerHTML = '<div class="page ad-page"><p class="ad-hint">Yuklanmoqda…</p></div>'; return; }

    const superAdmin = !!ov.superAdmin;
    const myLeagues = superAdmin ? (ov.leagues || []) : (ov.leagues || []).filter((l) => (ov.helperLeagues || []).includes(l.id));

    if (!curLeague && myLeagues.length) curLeague = myLeagues[0].id;

    // Switcher: Liga | Kubok
    const topSwitch = `<div class="seg seg-top" style="margin-bottom:14px;">
      <button class="${mainTab === 'liga' ? 'on' : ''}" data-act="switch-main" data-tab="liga">🏆 Liga</button>
      <button class="${mainTab === 'cup' ? 'on' : ''}" data-act="switch-main" data-tab="cup">🎟️ Kubok</button>
    </div>`;

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
    } else {
      const cups = [
        { id: 'fa-cup', name: 'FA Cup (Angliya)', flag: '🇬🇧' },
        { id: 'copa-del-rey', name: 'Copa del Rey (Ispaniya)', flag: '🇪🇸' },
      ];
      const cupChips = `<div class="chips" style="margin-bottom:12px;">${cups.map((c) => `<button class="chip${curCup === c.id ? ' on' : ''}" data-act="pick-cup" data-cid="${c.id}">${c.flag} ${esc(c.name)}</button>`).join('')}</div>`;

      const subNav = `<div class="ad-tabs" style="margin-bottom:14px;">
        <button class="${cupSubTab === 'draw' ? 'on' : ''}" data-act="sub-cup" data-sub="draw">🎲 Qura</button>
        <button class="${cupSubTab === 'results' ? 'on' : ''}" data-act="sub-cup" data-sub="results">⚽ Natijalar</button>
      </div>`;

      let inner = cupSubTab === 'draw' ? cupDrawHtml() : cupResultsHtml();
      content = `${cupChips}${subNav}${inner}`;
    }

    el.innerHTML = `<div class="page ad-page">
      <h1 class="section-title">🛠 Admin panel</h1>
      ${topSwitch}
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

  // --- CLICK EVENT HANDLERS ---
  async function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === 'switch-main') {
      mainTab = btn.dataset.tab;
      if (mainTab === 'cup' && !cupState) loadCup();
      if (mainTab === 'liga' && !mt.list.length) loadMatches();
      return render();
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
      return loadCup();
    }
    if (act === 'sub-cup') {
      cupSubTab = btn.dataset.sub;
      return render();
    }

    // --- Qura harakatlari ---
    if (act === 'settime') {
      const v = el.querySelector('#lgDrawTime')?.value;
      if (!v) return toast('Vaqtni tanlang');
      return done(await post(`/api/admin/league/${btn.dataset.lg}/draw-time`, { drawAt: new Date(v).toISOString(), rounds: 2, roundDays: 7 }), 'Qura vaqti saqlandi ✅');
    }
    if (act === 'draw') {
      if (!(await confirmBox('Qurani hozir o\'tkazamizmi? Ishtirokchilar aralashtirilib, o\'yinlar jadvali tuziladi.'))) return;
      return done(await post(`/api/admin/league/${btn.dataset.lg}/draw`, { rounds: 2, roundDays: 7 }), 'Qura o\'tkazildi 🎲', loadMatches);
    }
    if (act === 'draw-cancel') {
      if (!(await confirmBox("Qura bekor qilinadimi? Barcha o'yinlar o'chadi, liga 0 dan holatga qaytadi."))) return;
      return done(await post(`/api/admin/league/${btn.dataset.lg}/draw-cancel`, {}), 'Qura bekor qilindi ✖', loadMatches);
    }
    if (act === 'redo') {
      if (!(await confirmBox('Qurani qayta o\'tkazamizmi? Eski o\'yinlar jadvali o\'chiriladi.'))) return;
      return done(await post(`/api/admin/league/${btn.dataset.lg}/draw`, { redo: true, rounds: 2, roundDays: 7 }), 'Qayta qura o\'tkazildi 🎲', loadMatches);
    }

    // --- Tur Dedlayn va Qulf ---
    if (act === 'save-round-dl') {
      const v = el.querySelector('#roundDlInput')?.value;
      if (!v) return toast('Vaqtni tanlang');
      return done(await post(`/api/admin/league/${btn.dataset.lg}/round-deadline`, { round: Number(btn.dataset.round), deadline: new Date(v).toISOString() }), 'Tur dedlayni saqlandi ✅');
    }
    if (act === 'toggle-round-open') {
      const open = btn.dataset.open === '1';
      return done(await post(`/api/admin/league/${btn.dataset.lg}/rounds`, { round: Number(btn.dataset.round), open }), open ? `${btn.dataset.round}-tur ochildi 🔓` : `${btn.dataset.round}-tur yopildi 🔒`);
    }
    if (act === 'rall') {
      const open = btn.dataset.open === '1';
      if (!open && !(await confirmBox('Barcha turlar yopiladi. Davom etilsinmi?'))) return;
      return done(await post(`/api/admin/league/${btn.dataset.lg}/rounds`, { all: true, open }), open ? 'Barcha turlar ochildi 🔓' : 'Barcha turlar yopildi 🔒');
    }

    // --- Natijalar tahrirlash ---
    if (act === 'save-match-res') {
      const box = btn.closest('[data-mid]'), hg = parseInt(box.querySelector('[data-hg]').value, 10), ag = parseInt(box.querySelector('[data-ag]').value, 10);
      if (!(hg >= 0 && hg <= 99 && ag >= 0 && ag <= 99)) return toast(ERR.badScore);
      return done(await post(`/api/admin/matches/${box.dataset.mid}/result`, { hg, ag }), 'Natija saqlandi ✅', () => { loadMatches(); if (mainTab === 'cup') loadCup(); });
    }
    if (act === 'reset-match-res') {
      const box = btn.closest('[data-mid]');
      if (!(await confirmBox("Natija o'chirilsinmi? O'yin qayta kiritilmagan holatga qaytadi."))) return;
      return done(await post(`/api/admin/matches/${box.dataset.mid}/reset`, {}), "Natija o'chirildi 🗑", () => { loadMatches(); if (mainTab === 'cup') loadCup(); });
    }

    // --- Approval Modal ---
    if (act === 'open-approval') {
      const mid = btn.dataset.mid;
      const all = (mt.list || []).concat(cupState?.qualifiers || []).concat(cupState?.bracket || []);
      selApprovalMatch = all.find((m) => m.id === mid) || null;
      return render();
    }
    if (act === 'close-approval') {
      selApprovalMatch = null;
      return render();
    }
    if (act === 'confirm-approval') {
      const mid = btn.dataset.mid, hg = Number(btn.dataset.hg), ag = Number(btn.dataset.ag);
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
  }

  function onChange(e) {
    const act = e.target.dataset.act;
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
    }
  }

  function onInput(e) {
    if (e.target.id === 'plSearchInp') {
      pl.search = e.target.value;
      render();
    }
  }

  function show(root, toastFn) {
    el = root;
    toast = toastFn;
    if (!el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener('click', onClick);
      el.addEventListener('change', onChange);
      el.addEventListener('input', onInput);
    }
    render();
    loadOverview().then(() => {
      loadMatches();
      loadCup();
    });
  }

  const leave = () => { if (el) el.dataset.loaded = ''; clearInterval(spTimer); };
  return { show, leave };
})();
