// Admin panel: Liga va Kubok bo'limlari, Statistika, Xabar, Yordamchilar, Kubok narxi, Ligalar holati, Klublar, Turnirlar va Auksion
window.AdminView = (() => {
  const tg = window.Telegram?.WebApp;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '' } }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
  const ERR = { notDone: "Bosqichda hali tugallanmagan o'yinlar bor — avval ularni yakunlang", later: "Keyingi bosqich allaqachon qurilgan — avval uni tozalang", nowinner: "G'olib hali aniqlanmagan", already: 'Bu kubok allaqachon topshirilgan', hasgames: "Yangi egasi allaqachon o'yin o'ynagan, tiklab bo'lmaydi", active: 'Eski egasi hali ligada', nogames: "Bekor qilingan o'yin topilmadi", drawn: "Qura allaqachon o'tkazilgan", few: 'Kamida 2 ishtirokchi kerak', played: "Hisoblar kiritilgan — qayta qura qilib bo'lmaydi", nouser: "Foydalanuvchi topilmadi (botga /start bosgan bo'lishi kerak)", taken: 'Bu klub band', full: "Liga to'lgan", badScore: "Hisobni to'g'ri kiriting (0–99)", gone: "Topilmadi yoki holati o'zgargan", forbidden: "Ruxsat yo'q", stage: "Bosqich topilmadi", nodraw: "Avval qura tashlang", none: "Tasdiqlangan o'yinlar yo'q", time: "Vaqt noto'g'ri", fail: "Xatolik, qayta urinib ko'ring" };
  const ST = { scheduled: 'Kutilmoqda', pending: 'Raqib tasdig\'i kutilmoqda', disputed: '⚠️ Bahsli (yolg\'on)', confirmed: 'Tasdiqlangan' };
  const BCS = { running: '⏳ Yuborilmoqda', done: '✅ Yakunlandi', interrupted: '⚠️ To\'xtatilgan' };

  let el, toast;
  let viewMode = 'global'; // 'global' (Bo'limni tanlang dan) | 'league' (Ligalar pastki tabbidan)
  let mainTab = 'stats'; // 'liga' | 'cup' | 'stats' | 'broadcast' | 'helpers' | 'cups' | 'open' | 'clubs' | 'tour' | 'auction'
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
  let aucAdm = { league: '', clubs: null };
  let cmgr = { league: '', clubs: null };   // klub boshqaruvi: odam qo'shish, bo'shatish, auksionga qo'yish   // admin: klubni auksionga qo'yish
  let uclData = null, uclSel = null;   // Chempionlar ligasi: holat va tanlangan ishtirokchilar

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

  function matchCardHtml(m) {
    const noLabel = m.matchNo ? ('<b style="color:#22c55e;margin-right:6px;">#' + m.matchNo + '</b>') : '';
    return '<div class="g-card ad-match" data-mid="' + m.id + '" style="margin-bottom:8px;">' +
      '<div class="ad-meta">' +
        '<small>' + noLabel + esc(m.leagueName || '') + ' · ' + (m.round ? m.round + '-tur' : (m.stage || '')) + (m.deadline ? ' · ⏰ ' + fmtShow(m.deadline) : '') + '</small>' +
        '<span class="ad-st ' + m.status + '">' + (ST[m.status] || m.status) + '</span>' +
      '</div>' +
      '<div class="ad-vs">' +
        '<div><b>' + esc(m.home?.club || '—') + '</b><small>' + esc(m.home?.user || '') + '</small></div>' +
        '<div class="ad-in">' +
          '<input type="number" inputmode="numeric" min="0" max="99" value="' + (m.hg ?? '') + '" data-hg>' +
          '<b>:</b>' +
          '<input type="number" inputmode="numeric" min="0" max="99" value="' + (m.ag ?? '') + '" data-ag>' +
        '</div>' +
        '<div><b>' + esc(m.away?.club || '—') + '</b><small>' + esc(m.away?.user || '') + '</small></div>' +
      '</div>' +
      (m.chat ? '<button class="ad-btn ghost sm" data-act="viewchat">💬 O\'yin chati (' + m.chat + ')</button><div class="ad-chatbox" data-chatbox></div>' : '') +
      '<div class="ad-row" style="margin-top:8px;">' +
        (m.status !== 'scheduled' ? '<button class="ad-btn bad sm" data-act="reset">🗑 O\'chirish</button>' : '') +
        '<button class="ad-btn ok sm" data-act="save-score">💾 ' + (m.status === 'confirmed' ? "O'zgartirish" : "Tasdiqlash") + '</button>' +
      '</div>' +
    '</div>';
  }

  function approvalModalHtml(m) {
    if (!m) return '';
    const noLabel = m.matchNo ? (' (#' + m.matchNo + ')') : '';
    const proofs = (m.proofs || []).map(function(p) {
      return '<div class="ad-modal-proof">' +
        '<p><b>📎 ' + esc(p.by) + '</b>: ' + esc(p.text || '') + '</p>' +
        (p.fileId ? '<div class="ad-modal-img-wrap"><img src="" data-fid="' + esc(p.fileId) + '" data-act="zoom" class="ad-proof-img" alt="Screenshot"></div>' : '') +
      '</div>';
    }).join('');

    return '<div class="ad-modal-overlay" id="approvalModal">' +
      '<div class="ad-modal-box">' +
        '<div class="ad-modal-header">' +
          '<h3>Natijani tekshirish' + noLabel + '</h3>' +
          '<button class="ad-modal-close" data-act="close-approval">✕</button>' +
        '</div>' +
        '<div class="ad-modal-body">' +
          '<div class="ad-modal-match-info">' +
            '<div class="ad-modal-team">' +
              '<b>' + esc(m.home?.club || '—') + '</b>' +
              '<span>' + esc(m.home?.user || '') + '</span>' +
            '</div>' +
            '<div class="ad-modal-score">' +
              '<input type="number" id="appHomeScore" value="' + (m.hg ?? 0) + '" min="0" max="99">' +
              '<span>:</span>' +
              '<input type="number" id="appAwayScore" value="' + (m.ag ?? 0) + '" min="0" max="99">' +
            '</div>' +
            '<div class="ad-modal-team">' +
              '<b>' + esc(m.away?.club || '—') + '</b>' +
              '<span>' + esc(m.away?.user || '') + '</span>' +
            '</div>' +
          '</div>' +
          (proofs ? '<div class="ad-modal-proofs">' + proofs + '</div>' : '<p class="ad-hint">Isbot skrinshoti yuklanmagan</p>') +
        '</div>' +
        '<div class="ad-modal-actions">' +
          '<button class="ad-btn bad" data-act="reject-approval" data-mid="' + m.id + '">❌ Rad etish</button>' +
          '<button class="ad-btn ok" data-act="confirm-approval" data-mid="' + m.id + '">✅ Tasdiqlash</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // --- LIGA ADMIN SAHIFASI (screenshots tartibida, v2) ---
  let matchSearch = { q: '', result: null, loading: false };
  let swapSel = '';
  let cupRoundSel = '';

  function leagueAdminHtml() {
    const l = (ov && ov.leagues ? ov.leagues : []).find(function(x){ return x.id === curLeague; });
    if (!l) return '<p class="ad-hint">Liga topilmadi</p>';

    const nRounds = l.roundCount || 19;
    const openSet = new Set((l.openRounds || []).map(Number));
    const dlMap = l.roundDeadlines || {};
    const curRound = Number(selRoundNum) || 1;
    const isOpen = openSet.has(curRound);
    const curDl = dlMap[curRound] ? fmtLocal(dlMap[curRound]) : '';
    const dlDisplay = dlMap[curRound] ? fmtShow(dlMap[curRound]) : '—';
    const roundName = l.isPlayoff ? 'Pley-off' : (curRound + '-tur');
    const pendingMatches = (mt.list || []).filter(function(m){ return m.league === curLeague && (m.status === 'pending' || m.status === 'disputed'); });

    // --- Support threads ---
    let supportBlock = '';
    if (sp.open) {
      const bubbles = sp.msgs.map(function(x){
        return '<div class="m-b ' + (x.mine ? 'me' : 'op') + '">' +
          (x.fileId ? '<img class="m-img" data-fid="' + esc(x.fileId) + '" data-act="zoom" alt="">' : '') +
          (x.text ? '<span>' + esc(x.text) + '</span>' : '') +
          '<small>' + hm2(x.at) + '</small></div>';
      }).join('');
      supportBlock = '<button class="back" data-act="spback"><span>‹</span> Murojaatlar</button>' +
        '<div class="g-card ad-thread-h"><b>' + esc(sp.name) + '</b><small>ID ' + sp.open + (sp.leagueName ? ' · 🏆 ' + esc(sp.leagueName) : '') + '</small></div>' +
        '<div class="m-msgs ad-msgs" id="spMsgs">' + (bubbles || '<p class="m-empty">Xabar yo\'q</p>') + '</div>' +
        '<div class="m-send"><input id="spText" maxlength="800" placeholder="Javob yozing…" autocomplete="off"><button class="m-ic go" data-act="spsend">➤</button></div>';
    } else {
      const lgThreads = sp.threads ? sp.threads.filter(function(x){ return !x.league || x.league === curLeague; }) : null;
      if (!lgThreads) {
        supportBlock = '<p class="ad-hint">Yuklanmoqda…</p>';
      } else if (!lgThreads.length) {
        supportBlock = '<div class="pf-empty"><span>📭</span><p>Murojaat yo\'q</p></div>';
      } else {
        supportBlock = lgThreads.map(function(x){
          return '<button class="g-card ad-msg-item" data-act="spopen"' +
            ' data-uid="' + x.uid + '" data-name="' + esc(x.name) + '"' +
            ' data-league="' + esc(x.league || '') + '" data-lname="' + esc(x.leagueName || '') + '">' +
            '<div class="ad-msg-left">' +
              '<div class="ad-msg-avatar">' + (x.name||'?')[0].toUpperCase() + '</div>' +
              '<div class="ad-msg-info">' +
                '<span class="ad-msg-name">' + esc(x.name) + (x.leagueName ? ' · <em>' + esc(x.leagueName) + '</em>' : '') + '</span>' +
                '<small>' + (x.fromAdmin ? 'Siz: ' : '') + esc(x.text.slice(0, 55)) + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="ad-msg-right">' +
              '<small>' + hm2(x.at) + '</small>' +
              (x.unread ? '<i class="gm-badge" style="position:static">' + x.unread + '</i>' : '') +
            '</div>' +
          '</button>';
        }).join('');
      }
    }

    // --- Match search result ---
    let matchSearchBlock = '';
    if (matchSearch.loading) {
      matchSearchBlock = '<p class="ad-hint">Yuklanmoqda…</p>';
    } else if (matchSearch.result) {
      const found = matchSearch.result.found || [];
      matchSearchBlock = found.length ? found.map(matchCardHtml).join('') : '<p class="ad-hint">Topilmadi</p>';
    }

    // --- Swap players ---
    const players = (pl.data && pl.data.players) ? pl.data.players : [];
    const playerOpts = players.map(function(p){
      return '<option value="' + p.telegramId + '"' + (String(swapSel) === String(p.telegramId) ? ' selected' : '') + '>' + esc(p.user) + ' · ' + esc(p.club) + '</option>';
    }).join('');

    // --- FA Cup block ---
    const cupsList = [
      { id: 'fa-cup', name: 'FA Cup', flag: '🇬🇧' },
      { id: 'copa-del-rey', name: 'Copa del Rey', flag: '🇪🇸' },
    ];
    let faCupBlock = '';
    if (!cupState) {
      faCupBlock = '<p class="ad-hint">Yuklanmoqda…</p>';
    } else {
      const stages = cupState.stages || [];
      const curStage = cupRoundSel || (stages[0] ? stages[0].stage : '');
      const stageInfo = stages.find(function(s){ return s.stage === curStage; }) || stages[0];
      const isStageOpen = !!(stageInfo && stageInfo.startedAt && (!stageInfo.deadline || new Date(stageInfo.deadline) > new Date()));
      const stageChips = stages.map(function(s){
        return '<option value="' + s.stage + '"' + (s.stage === curStage ? ' selected' : '') + '>' +
          esc(s.label) + (s.drawn ? ' (Qura ✅)' : '') + (s.open ? ' 🔓' : ' 🔒') + '</option>';
      }).join('');
      let stageActions = '';
      if (stageInfo) {
        if (!stageInfo.drawnAt) {
          stageActions += '<button class="ad-btn ok sm" data-act="lg-cup-draw" data-stage="' + curStage + '" data-cup="' + curCup + '">🎲 Qura tashlash</button> ';
        }
        if (stageInfo.drawnAt && !isStageOpen) {
          stageActions += '<button class="ad-btn ok sm" data-act="lg-cup-open" data-stage="' + curStage + '" data-cup="' + curCup + '">🔓 Ochish</button> ';
        }
        if (isStageOpen) {
          stageActions += '<button class="ad-btn bad sm" data-act="lg-cup-close" data-stage="' + curStage + '" data-cup="' + curCup + '">🔒 Yopish</button> ';
        }
        if (stageInfo.drawnAt && stageInfo.stage !== 'final') {
          stageActions += '<button class="ad-btn ghost sm" data-act="lg-cup-advance" data-stage="' + curStage + '" data-cup="' + curCup + '">➡️ Keyingi bosqich</button>';
        }
      }
      faCupBlock = '<label class="ad-lbl">Bosqichni tanlang:' +
        '<select data-act="fa-cup-pick-stage" class="lf-select" style="margin-top:4px;">' + stageChips + '</select></label>' +
        (stageInfo ? '<div class="ad-fa-status"><span class="ad-st ' + (isStageOpen ? 'confirmed' : 'pending') + '">' + (isStageOpen ? '🔓 Ochiq' : '🔒 Yopiq') + '</span>' +
          (stageInfo.deadline ? '<small>⏰ ' + fmtShow(stageInfo.deadline) + '</small>' : '') +
          (stageInfo.drawnAt ? '<small>🎲 Qura: ' + fmtShow(stageInfo.drawnAt) + '</small>' : '<small>🎲 Qura yo\'q</small>') + '</div>' +
          '<div class="ad-fa-actions" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">' + stageActions + '</div>' : '');
    }

    // --- Helper admins for this league ---
    const lgHelpers = (hl.list || []).filter(function(h){ return h.league === curLeague; });

    // --- Pending match cards ---
    const pendingCards = pendingMatches.map(function(m){
      return '<div class="g-card ad-pending-card" data-act="open-approval" data-mid="' + m.id + '" style="cursor:pointer;margin-bottom:8px;">' +
        '<div class="ad-pending-left">' +
          '<span>⚽ <b>' + esc(m.home.club) + '</b> <b class="ad-pending-sc">' + (m.hg != null ? m.hg : '–') + ':' + (m.ag != null ? m.ag : '–') + '</b> <b>' + esc(m.away.club) + '</b></span>' +
          '<small>' + (m.matchNo ? ('#' + m.matchNo + ' · ') : '') + m.round + '-tur · ' + (m.status === 'disputed' ? '⚠️ Yolg\'on hisob' : 'Tasdiqlash kutilmoqda') + '</small>' +
        '</div>' +
        '<button class="ad-btn ghost sm" data-act="open-approval" data-mid="' + m.id + '">Batafsil ›</button>' +
      '</div>';
    }).join('');

    // --- Ma'lumotlarni tozalash (0 dan boshlash) ---
    const resetBox = function (target, name) {
      return '<div class="g-card ad-lg" style="margin-top:12px;border:1px solid rgba(239,68,68,.45);">' +
        '<b style="color:#f87171;">⚠️ ' + esc(name) + ': ma\'lumotlarni tozalash</b>' +
        '<p class="ad-hint">O\'yinlar, natijalar, reyting, klub egalari va qura holati o\'chadi. Liga ro\'yxatdan o\'tishga qaytadi (0 dan). Qaytarib bo\'lmaydi.</p>' +
        '<div class="ad-row" style="gap:6px;flex-wrap:wrap;">' +
        '<button class="ad-btn bad sm" data-act="reset-data" data-target="' + esc(target) + '">Hammasini tozalash (0 dan boshlash)</button>' +
        '</div></div>';
    };
    const cupObj = (typeof cupsList !== 'undefined' && Array.isArray(cupsList)) ? cupsList.find(function (c) { return c.id === curCup; }) : null;
    const resetBlock = (curLeague ? resetBox(curLeague, (l && l.name) || curLeague) : '') + (curCup && cupObj ? resetBox(curCup, cupObj.name) : '');

    const lsetItems = [['draw', '🔁 Tur va dedlayn'], ['results', '✏️ Natijalarni tuzatish'], ['players', '🔄 Ishtirokchini almashtirish'], ['support', '💬 Ishtirokchi xabarlari'], ['helpers', '👮 Turnir adminlari'], ['cup', '🏆 Kubok boshqaruvi'], ['open', '🔓 Ligalar holati'], ['auction', '⏱ Auksion vaqti'], ['cmgr', "🏷 Auksionga klub qo\'yish"]];
    const lsetMenu = '<div class="g-card ad-lg" style="margin-bottom:12px;"><b>⚙️ Liga sozlamalari</b><p class="ad-hint">Registratsiyadan keyingi boshqaruv. Har bir bo\'lim tegishli joyga olib boradi.</p><div class="ad-row" style="gap:6px;flex-wrap:wrap;">' + lsetItems.map(function (x) { return '<button class="ad-btn ghost sm" data-act="lset" data-go="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
    return (
      lsetMenu +
      '<!-- 1. HERO CARD -->' +
      '<div class="ad-hero-card">' +
        '<div class="ad-hero-left">' +
          '<h2 class="ad-hero-name">' + esc(l.name) + '</h2>' +
          '<span class="ad-hero-badge ' + (l.closed ? 'closed' : 'open') + '">' + (l.closed ? '🔒 Yopiq' : '⚽ Davom etmoqda') + '</span>' +
        '</div>' +
        '<div class="ad-hero-right">' + l.players + '/' + l.max + '<br><small>ishtirokchi</small></div>' +
      '</div>' +

      '<!-- 2. ADMIN PANELI -->' +
      '<div class="ad-panel-header">' +
        '<div class="ad-panel-top"><span class="ad-panel-title">🛡 ADMIN PANELI</span><span class="ad-role-badge">Tashkilotchi</span></div>' +
        '<div class="ad-kpi-grid">' +
          '<div class="ad-kpi-col"><b>' + (pendingMatches.length || 0) + '</b><small>So\'rovlar</small></div>' +
          '<div class="ad-kpi-col ad-kpi-mid"><b>' + roundName + '</b><small>Tur</small></div>' +
          '<div class="ad-kpi-col"><b>' + dlDisplay + '</b><small>Muddat</small></div>' +
        '</div>' +
      '</div>' +

      '<!-- 3. ISHTIROKCHILAR XABARLARI -->' +
      '<div class="ad-sec-header"><span>💬 ISHTIROKCHILAR XABARLARI</span><div class="ad-sec-line"></div></div>' +
      '<div class="ad-msg-list">' + supportBlock + '</div>' +

      '<!-- 4. TUR VA DEDLAYN BOSHQARUVI -->' +
      '<div class="ad-sec-header"><span>⏱ TUR VA DEDLAYN BOSHQARUVI</span><div class="ad-sec-line"></div></div>' +
      '<div class="g-card ad-dl-card">' +
        '<div class="ad-dl-row"><select class="lf-select" data-act="pick-round" style="flex:1;">' +
          Array.from({ length: nRounds }, function(_, i){ return i + 1; }).map(function(r){
            return '<option value="' + r + '"' + (r === curRound ? ' selected' : '') + '>' + r + '-tur ' + (openSet.has(r) ? '🔓' : '🔒') + '</option>';
          }).join('') +
        '</select></div>' +
        '<div class="ad-dl-muddat">Muddat: <b>' + dlDisplay + '</b></div>' +
        '<div class="ad-dl-label">Tezkor tanlash</div>' +
        '<div class="ad-quick-row">' +
          '<button class="ad-quick-btn" data-act="quick-dl" data-days="1">+1 kun</button>' +
          '<button class="ad-quick-btn" data-act="quick-dl" data-days="2">+2 kun</button>' +
          '<button class="ad-quick-btn" data-act="quick-dl" data-days="3">+3 kun</button>' +
          '<button class="ad-quick-btn" data-act="quick-dl" data-days="7">+1 hafta</button>' +
        '</div>' +
        '<input type="datetime-local" id="roundDlInput" value="' + curDl + '" class="ad-dt-input">' +
        '<p class="ad-hint">Muddat o\'tgach tasdiqlanmagan natijalar tasdiqlanadi; o\'ynalmagan o\'yinni siz hal qilasiz.</p>' +
        '<button class="ad-btn-green" data-act="save-round-dl" data-lg="' + l.id + '" data-round="' + curRound + '">Muddatni belgilash</button>' +
        '<div style="margin-top:12px;display:flex;gap:8px;">' +
          '<button class="ad-btn ' + (isOpen ? 'bad' : 'ok') + ' sm" data-act="toggle-round-open" data-lg="' + l.id + '" data-round="' + curRound + '" data-open="' + (isOpen ? '' : '1') + '" style="flex:1;">' +
            (isOpen ? '🔒 Turni yopish' : '🔓 Turni ochish') +
          '</button>' +
        '</div>' +
      '</div>' +

      '<!-- 5. NATIJANI TUZATISH -->' +
      '<div class="ad-sec-header"><span>✏️ NATIJANI TUZATISH</span><div class="ad-sec-line"></div></div>' +
      '<div class="g-card ad-dl-card">' +
        '<p class="ad-hint">O\'yin raqamini (#) yoki klub nomini kiriting. Yopilgan turdagi natijani ham tuzatish mumkin; bekor qilish faqat joriy turda.</p>' +
        (pendingCards ? '<div style="margin-bottom:12px;"><div class="ad-dl-label" style="margin-bottom:6px;">⏳ Tasdiqlash kutayotgan (' + pendingMatches.length + ')</div>' + pendingCards + '</div>' : '') +
        '<div class="ad-search-row">' +
          '<input id="matchSearchInp" type="text" placeholder="Match ID yoki Klub nomi" value="' + esc(matchSearch.q) + '" style="flex:1;">' +
          '<button class="ad-btn ghost sm" data-act="match-search" style="flex-shrink:0;">Ko\'rish</button>' +
        '</div>' +
        (matchSearchBlock ? '<div class="ad-match-list" style="margin-top:12px;">' + matchSearchBlock + '</div>' : '') +
      '</div>' +

      '<!-- 6. ISHTIROKCHINI ALMASHTIRISH -->' +
      '<div class="ad-sec-header"><span>🔄 ISHTIROKCHINI ALMASHTIRISH</span><div class="ad-sec-line"></div></div>' +
      '<div class="g-card ad-dl-card">' +
        '<label class="ad-lbl">Kimni almashtirish<select id="swapFromSel" data-act="swap-pick" style="margin-top:4px;"><option value="">— tanlang —</option>' + playerOpts + '</select></label>' +
        '<label class="ad-lbl" style="margin-top:10px;"><input id="swapToInp" type="text" placeholder="Telegram ID yoki @username"></label>' +
        '<p class="ad-hint">Yangi odamga eski ishtirokchining o\'rni, klubi, o\'yinlari va natijalari o\'tadi. U botga /start bosgan bo\'lishi kerak.</p>' +
        '<button class="ad-btn-green" data-act="lg-swap" style="margin-top:4px;">🔄 Almashtirish</button>' +
      '</div>' +

      '<!-- 7. TURNIR ADMINLARI -->' +
      '<div class="ad-sec-header"><span>🛡 TURNIR ADMINLARI (' + lgHelpers.length + ')</span><div class="ad-sec-line"></div></div>' +
      '<div class="g-card ad-dl-card">' +
        '<p class="ad-hint">Adminlar a\'zolarni, muddatlarni va natijalarni boshqaradi, turnir va pley-offni boshlaydi. Admin qo\'shish, sig\'im va to\'lov faqat sizda qoladi.</p>' +
        (lgHelpers.map(function(h){
          return '<div class="g-card ad-open" style="margin-bottom:8px;">' +
            '<span class="ad-cup-n"><b>' + esc(h.name) + '</b><small>' + h.telegramId + '</small></span>' +
            '<button class="ad-btn bad sm" data-act="hdel" data-id="' + h.telegramId + '" data-league="' + esc(h.league) + '">O\'chirish</button>' +
          '</div>';
        }).join('') || '<p class="ad-hint">Yordamchi adminlar yo\'q</p>') +
        '<div class="ad-search-row" style="margin-top:10px;">' +
          '<input id="hLgId" type="text" inputmode="numeric" placeholder="Telegram ID yoki @username" style="flex:1;">' +
          '<button class="ad-btn ok sm" data-act="lg-hadd" data-lg="' + l.id + '" style="flex-shrink:0;">Qo\'shish</button>' +
        '</div>' +
      '</div>' +

      '<!-- 8. FA CUP VA KUBOK BOSHQARUVI -->' +
      '<div class="ad-sec-header"><span>🎟️ FA CUP VA KUBOK BOSHQARUVI</span><div class="ad-sec-line"></div></div>' +
      '<div class="g-card ad-dl-card">' +
        '<div class="chips" style="margin-bottom:12px;">' +
          cupsList.map(function(cp){ return '<button class="chip' + (curCup === cp.id ? ' on' : '') + '" data-act="pick-cup" data-cid="' + cp.id + '">' + cp.flag + ' ' + esc(cp.name) + '</button>'; }).join('') +
        '</div>' +
        '<div id="cupAnchor"></div>' + faCupBlock + resetBlock +
      '</div>'
    );
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
  function aucAdmClubsHtml() {
    if (!aucAdm.clubs) return '<p class="ad-hint">Liga tanlang va "Klublarni ko\'rsatish" ni bosing</p>';
    if (!aucAdm.clubs.length) return '<p class="ad-hint">Bu ligada klub yo\'q</p>';
    return aucAdm.clubs.map(function (c) {
      const st = c.auction ? ('Joriy narx: ' + c.auction.price + (c.auction.currentBid ? ' · taklif: ' + c.auction.currentBid : '')) : 'Auksionda emas';
      return '<div class="ad-row" style="gap:6px;align-items:center;flex-wrap:wrap;padding:4px 0;">' +
        '<span style="flex:1;min-width:140px;">' + esc(c.name) + ' <small class="ad-hint">' + esc(c.user || (c.vacant ? 'bo\'sh' : '')) + '</small><br><small class="ad-hint">' + esc(st) + '</small></span>' +
        '<input id="aucp-' + esc(c.club) + '" type="number" min="1" placeholder="Narx" style="width:110px;">' +
        '<button class="ad-btn ok sm" data-act="auc-adm-list" data-club="' + esc(c.club) + '">Qo\'yish</button></div>';
    }).join('');
  }

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
      <div class="g-card ad-lg" style="margin-top:12px;">
        <b>🏷️ Klubni auksionga qo'yish (admin)</b>
        <div class="ad-row" style="gap:6px;flex-wrap:wrap;margin-top:8px;">
          <select id="aucAdmLeague">${(ov && ov.leagues ? ov.leagues : []).map(function (l) { return '<option value="' + esc(l.id) + '"' + (l.id === aucAdm.league ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('')}</select>
          <button class="ad-btn ghost sm" data-act="auc-adm-load">Klublarni ko'rsatish</button>
        </div>
        <div style="margin-top:10px;">${aucAdmClubsHtml()}</div>
      </div>
      <p class="ad-hint" style="margin-top:12px;">Auksion ochilganda foydalanuvchilar Do'kon → Auksion bo'limida klublar uchun tanga taklif qilishadi. Har bir yangi stavkada eski taklif egasining tangalari avtomatik qaytariladi. Yakunlanganda klub eng yuqori taklif qilganga o'tadi.</p>
    </div>`;
  }

  // --- TOP NAVIGATION TABS ---
  function tabsHtml() {
    const superAdmin = !!ov?.superAdmin;
    let tabs = [];
    if (viewMode === 'league') {
      // Ligalar tabbidagi admin panel: asosan o'yinlar, qura, natijalar boshqaruvi
      tabs = [
        ['liga', '🏆 Liga'],
        ['cup', '🎟️ Kubok'],
        ['clubs', '🏟 Klublar']
      ];
    } else {
      // Bo'limni tanlang dagi asosiy admin panel: statistika, turnirlar, tizim boshqaruvi
      const globalTabs = [
        ['stats', '📊 Statistika'],
        ['tour', '🏁 Turnirlar'],
        ['broadcast', '📣 Xabar'],
        ['ucl', '🏆 Chempionlar ligasi'],
        ['jch', '🌍 JCH'],
        ['adminadd', '➕ Admin qo\'shish'],
        ['open', '🔓 Ligalar holati'],
        ['auction', '🏷️ Auksion'],
        ['cmgr', '🛠 Klub boshqaruvi'],
        ['cups', '🏆 Kubok narxi'],
        ['clubs', '👥 Klublar']
      ];
      // glava: hammasi. umumiy: statistika, yordamchilar va kubok narxi yashirin. yordamchi: faqat tur va klublar
      const isGlava = ov?.role === 'glava';
      const hiddenForGeneral = ['stats', 'cups', 'adminadd', 'jch'];
      tabs = superAdmin ? (isGlava ? globalTabs : globalTabs.filter(([k]) => !hiddenForGeneral.includes(k))) : globalTabs.filter(([k]) => k === 'tour' || k === 'clubs');
    }

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
      const leagueChips = '<div class="chips" style="margin-bottom:12px;">' + myLeagues.map(function(l){ return '<button class="chip' + (curLeague === l.id ? ' on' : '') + '" data-act="pick-league" data-lid="' + l.id + '">' + esc(l.name) + '</button>'; }).join('') + '</div>';
      if (viewMode === 'league') {
        content = leagueChips + leagueAdminHtml();
      } else {
        // global mode: show draw sub-tabs as before
        const subNav = '<div class="ad-tabs" style="margin-bottom:14px;">' +
          '<button class="' + (ligaSubTab === 'draw' ? 'on' : '') + '" data-act="sub-liga" data-sub="draw">🎲 Qura</button>' +
          '<button class="' + (ligaSubTab === 'results' ? 'on' : '') + '" data-act="sub-liga" data-sub="results">⚽ Natijalar</button>' +
          '<button class="' + (ligaSubTab === 'players' ? 'on' : '') + '" data-act="sub-liga" data-sub="players">👥 Ishtirokchilar</button>' +
          '<button class="' + (ligaSubTab === 'support' ? 'on' : '') + '" data-act="sub-liga" data-sub="support">💬 Xabarlar' + (ov.support ? ' <i>' + ov.support + '</i>' : '') + '</button></div>';
        let inner = '';
        if (ligaSubTab === 'draw') inner = ligaDrawHtml();
        else if (ligaSubTab === 'results') inner = ligaResultsHtml();
        else if (ligaSubTab === 'players') inner = ligaPlayersHtml();
        else inner = ligaSupportHtml();
        content = leagueChips + subNav + inner;
      }
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
    } else if (mainTab === 'adminadd') {
      content = adminAddHtml();
    } else if (mainTab === 'jch') {
      content = jchHtml();
    } else if (mainTab === 'generals') {
      content = generalsHtml();
    } else if (mainTab === 'cmgr') {
      content = cmgrHtml();
    } else if (mainTab === 'ucl') {
      content = uclHtml();
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
    const target = (mainTab === 'cup') ? curCup : (curLeague || '');
    const r = await api('/api/admin/matches?status=all&league=' + target);
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

  // ——— Klub boshqaruvi: odam qo'shish, bo'shatish, auksionga qo'yish ———
  function cmgrHtml() {
    const lgOpts = (ov && ov.leagues ? ov.leagues : []).map(function (l) { return '<option value="' + esc(l.id) + '"' + (l.id === cmgr.league ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('');
    let body = '<p class="ad-hint">Liga tanlang va "Klublarni ko\'rsatish" ni bosing</p>';
    if (cmgr.clubs) {
      body = cmgr.clubs.length ? cmgr.clubs.map(function (c) {
        const egasi = c.owned ? ('Egasi: ' + esc(c.user || c.tid)) : 'Bo\'sh klub';
        const au = c.auction ? (' · 🏷 auksionda: ' + c.auction.price + (c.auction.currentBid ? ' (taklif ' + c.auction.currentBid + ')' : '')) : '';
        return '<div class="g-card" style="margin-top:8px;padding:10px;">' +
          '<b>' + esc(c.name) + '</b> <small class="ad-hint">' + egasi + esc(au) + '</small>' +
          '<div class="ad-row" style="gap:6px;flex-wrap:wrap;margin-top:8px;">' +
            '<input id="cm-u-' + esc(c.club) + '" placeholder="Telegram ID yoki @username" style="flex:1;min-width:160px;">' +
            '<button class="ad-btn ok sm" data-act="cm-assign" data-club="' + esc(c.club) + '">Odam qo\'shish</button>' +
          '</div>' +
          '<div class="ad-row" style="gap:6px;flex-wrap:wrap;margin-top:6px;">' +
            '<input id="cm-p-' + esc(c.club) + '" type="number" min="1" placeholder="Narx" style="width:110px;">' +
            '<button class="ad-btn ghost sm" data-act="cm-auction" data-club="' + esc(c.club) + '">Auksionga qo\'yish</button>' +
            (c.owned ? '<button class="ad-btn bad sm" data-act="cm-vacate" data-club="' + esc(c.club) + '">Bo\'shatish</button>' : '') +
          '</div></div>';
      }).join('') : '<p class="ad-hint">Bu ligada klub yo\'q</p>';
    }
    return '<div class="g-card ad-lg"><b>🛠 Klub boshqaruvi</b>' +
      '<div class="ad-row" style="gap:6px;flex-wrap:wrap;margin-top:8px;">' +
        '<select id="cmLeague">' + lgOpts + '</select>' +
        '<button class="ad-btn ghost sm" data-act="cm-load">Klublarni ko\'rsatish</button>' +
      '</div>' + body + '</div>';
  }

  async function loadCmgr() {
    if (!cmgr.league) return render();
    const r = await api('/api/admin/auction/clubs?league=' + encodeURIComponent(cmgr.league));
    cmgr.clubs = r.ok ? r.clubs : [];
    render();
  }

  // ——— Admin qo'shish: umumiy yoki yordamchi (faqat glava) ———
  let aaType = 'gen';
  function adminAddHtml() {
    if (ov?.role !== 'glava') return '<p class="ad-hint">Bu bo\'lim faqat glava admin uchun</p>';
    const seg = '<div class="ad-row" style="gap:6px;margin-bottom:10px;">' +
      '<button class="ad-btn ' + (aaType === 'gen' ? 'ok' : 'ghost') + ' sm" data-act="aa-type" data-t="gen">🧭 Umumiy admin</button>' +
      '<button class="ad-btn ' + (aaType === 'help' ? 'ok' : 'ghost') + ' sm" data-act="aa-type" data-t="help">👥 Yordamchi admin</button></div>';
    return seg + (aaType === 'gen' ? generalsHtml() : helpersHtml());
  }
  // ——— JCH: rasmiy JCH turnirlari (admin yaratadi) ———
  function jchHtml() {
    return '<div class="g-card ad-lg"><b>🌍 JCH — rasmiy Jahon chempionati</b>' +
      '<p class="ad-hint">Rasmiy JCH turnirini yaratish va boshqarish uchun JCH rejimini oching. U yerda yaratilgan turnir rasmiy bo\'ladi: bepul, admin boshqaradi, o\'yinchilar davlat tanlab qo\'shiladi.</p>' +
      '<div class="ad-row" style="gap:6px;"><button class="ad-btn ok sm" data-act="open-jch">🌍 JCH rejimini ochish</button></div></div>';
  }

  // ——— Umumiy adminlar (faqat glava boshqaradi) ———
  let generalsList = null;
  function generalsHtml() {
    if (ov?.role !== 'glava') return '<p class="ad-hint">Bu bo\'lim faqat glava admin uchun</p>';
    const rows = generalsList ? (generalsList.length ? generalsList.map(function (g) {
      return '<div class="ad-row" style="gap:6px;align-items:center;padding:4px 0;"><span style="flex:1;">' + esc(g.name || String(g.telegramId)) + ' <small class="ad-hint">' + g.telegramId + '</small></span><button class="ad-btn bad sm" data-act="gen-remove" data-tid="' + g.telegramId + '">Olib tashlash</button></div>';
    }).join('') : '<p class="ad-hint">Umumiy admin yo\'q</p>') : '<p class="ad-hint">Yuklanmoqda…</p>';
    return '<div class="g-card ad-lg" style="margin-top:12px;"><b>🧭 Umumiy adminlar</b><p class="ad-hint">Umumiy admin hamma ligani va klubni boshqaradi, lekin statistika, yordamchilar va kubok narxini ko\'ra olmaydi.</p>' +
      rows + '<div class="ad-row" style="gap:6px;margin-top:8px;"><input id="genUser" placeholder="Telegram ID yoki @username" style="flex:1;"><button class="ad-btn ok sm" data-act="gen-add">Qo\'shish</button></div></div>';
  }
  async function loadGenerals() {
    if (ov?.role !== 'glava') return;
    const r = await api('/api/admin/generals');
    generalsList = r.ok ? r.list : [];
    render();
  }

  // ——— Chempionlar ligasi (UCL) admin paneli ———
  function uclHtml() {
    if (!uclData) return '<p class="ad-hint">Yuklanmoqda…</p>';
    const d = uclData, sel = uclSel || new Set();
    const phaseName = { setup: 'Sozlash', league: 'Lig bosqichi', knockout: 'Pley-off', finished: 'Tugagan' }[d.phase] || d.phase;
    const stageName = { league: 'Lig bosqichi', qf: 'Chorak final', sf: 'Yarim final', final: 'Final' };
    let h = `<div class="g-card ad-lg">
      <div class="ad-meta"><b>🏆 Chempionlar ligasi</b> · Bosqich: <b>${phaseName}</b>${d.stage ? ` · Hozir: <b>${stageName[d.stage] || d.stage}</b>` : ''}${d.champion ? ` · 🥇 Chempion: <b>${esc(d.champion.name)}</b>` : ''}</div>`;

    if (d.phase === 'setup') {
      const ok = sel.size >= 4 && sel.size % 2 === 0;
      h += `<p class="ad-hint">Ishtirokchilarni tanlang (juft son, 4–32). Tanlangan: <b>${sel.size}</b>${ok ? '' : ' — soni noto\'g\'ri'}</p>
        <div class="ad-row" style="gap:6px;flex-wrap:wrap;">
          <button class="ad-btn ok sm" data-act="ucl-save-participants">💾 Ishtirokchilarni saqlash</button>
          <button class="ad-btn sm" data-act="ucl-start" ${d.participants.length >= 4 ? '' : 'disabled'}>🎲 Lig bosqichini boshlash (qura)</button>
        </div>
        <div style="margin-top:10px;max-height:340px;overflow:auto;">
          ${d.candidates.map((c) => `<div class="ad-row" style="gap:8px;padding:4px 0;">
            <button class="ad-btn sm ${sel.has(c.id) ? 'ok' : ''}" data-act="ucl-toggle" data-id="${c.id}">${sel.has(c.id) ? '✅' : '➕'}</button>
            <span>${esc(c.club)} <span class="ad-hint">— ${esc(c.league)} · ${esc(c.user)}</span></span></div>`).join('') || '<p class="ad-hint">Bu mavsumda ro\'yxatdan o\'tgan klub yo\'q</p>'}
        </div>`;
    } else {
      h += `<div class="ad-row" style="gap:6px;flex-wrap:wrap;margin-top:8px;">
        ${d.phase === 'league' && d.leagueDone ? '<button class="ad-btn ok sm" data-act="ucl-advance">➡️ Pley-offni boshlash (top ' + d.knockoutSize + ')</button>' : ''}
        ${d.phase === 'knockout' ? '<button class="ad-btn ok sm" data-act="ucl-advance">➡️ Keyingi bosqichni ochish</button>' : ''}
        <button class="ad-btn bad sm" data-act="ucl-reset">♻️ Hammasini qaytadan boshlash</button>
      </div>`;
    }
    h += '</div>';

    if (d.standings.length) {
      h += `<div class="g-card ad-lg" style="margin-top:12px;"><b>Lig jadvali</b>
        <div style="overflow-x:auto;margin-top:8px;"><table class="ad-table" style="width:100%;font-size:13px;">
          <tr><th>#</th><th style="text-align:left;">Klub</th><th>O</th><th>G</th><th>D</th><th>M</th><th>Ball</th></tr>
          ${d.standings.map((r, i) => `<tr style="${d.phase !== 'setup' && i < d.knockoutSize ? 'background:rgba(80,200,120,.12);' : ''}">
            <td>${i + 1}</td><td style="text-align:left;">${esc(r.name)}</td><td>${r.w + r.d + r.l}</td><td>${r.w}</td><td>${r.gf - r.ga}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}
        </table></div></div>`;
    }

    if (d.matches.length) {
      const league = d.matches.filter((m) => m.stage === 'league');
      const byRound = {};
      league.forEach((m) => (byRound[m.round] = byRound[m.round] || []).push(m));
      const row = (m) => `<div class="ad-row" style="gap:6px;align-items:center;flex-wrap:wrap;padding:4px 0;">
        <span class="ad-hint">#${m.matchNo || '—'}</span>
        <span style="flex:1;min-width:120px;text-align:right;">${esc(m.homeName)}</span>
        <input id="uh-${m.id}" type="number" min="0" max="99" value="${m.hg ?? ''}" style="width:52px;text-align:center;">
        <span>:</span>
        <input id="ua-${m.id}" type="number" min="0" max="99" value="${m.ag ?? ''}" style="width:52px;text-align:center;">
        <span style="flex:1;min-width:120px;">${esc(m.awayName)}</span>
        <button class="ad-btn ok sm" data-act="ucl-save" data-id="${m.id}">💾</button></div>`;
      h += `<div class="g-card ad-lg" style="margin-top:12px;"><b>O'yinlar va natijalar</b>`;
      Object.keys(byRound).sort((a, b) => a - b).forEach((r) => { h += `<div class="ad-hint" style="margin-top:8px;">Tur ${r}</div>` + byRound[r].map(row).join(''); });
      ['qf', 'sf', 'final'].forEach((st) => {
        const ms = d.matches.filter((m) => m.stage === st);
        if (ms.length) h += `<div class="ad-hint" style="margin-top:8px;">${stageName[st]}</div>` + ms.map(row).join('');
      });
      h += '</div>';
    }
    return `<div>${h}</div>`;
  }

  async function loadUcl() {
    const r = await api('/api/admin/ucl');
    if (r.ok) {
      uclData = r;
      if (!uclSel || r.phase !== 'setup') uclSel = new Set(r.participants.map((p) => p.id));
      if (mainTab === 'ucl') render();
    }
  }

  async function loadAuction() {
    const r = await api('/api/admin/auction/config');
    if (r.ok) {
      aucCfg = r;
      if (mainTab === 'auction') render();
    }
  }

  // Quick-dl uchun joriy deadline qiymatini qaytaradi
  function dlMap_get() {
    const inp = el && el.querySelector('#roundDlInput');
    if (inp && inp.value) return new Date(inp.value);
    const curL = ov && ov.leagues ? ov.leagues.find(function(x){ return x.id === curLeague; }) : null;
    const dl = curL && curL.roundDeadlines ? curL.roundDeadlines[selRoundNum] : null;
    return dl ? new Date(dl) : new Date();
  }

  // --- CLICK EVENT HANDLERS ---
  async function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === 'adm-back') {
      if (viewMode === 'league') {
        if (window.LeagueView?.back) window.LeagueView.back();
        else location.hash = '#league';
      } else {
        location.hash = '';
      }
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
      if (mainTab === 'ucl') loadUcl();
      if (mainTab === 'cmgr') loadCmgr();
      if (mainTab === 'adminadd') { aaType === 'gen' ? loadGenerals() : loadHelpers(); }
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
      selApprovalMatch = (mt.list || []).find((m) => m.id === mid) || (matchSearch.result || []).find((m) => m.id === mid);
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

    // --- Liga admin v2 harakatlari ---
    if (act === 'match-search') {
      const q = (el.querySelector('#matchSearchInp') || {}).value || '';
      matchSearch = { q, result: null, loading: true };
      render();
      const r = await api('/api/admin/matches?status=all&league=' + curLeague + '&q=' + encodeURIComponent(q));
      matchSearch.loading = false;
      if (r.ok) {
        matchSearch.result = { found: r.matches || [] };
      } else {
        matchSearch.result = { found: [] };
      }
      render();
      return;
    }
    if (act === 'quick-dl') {
      const days = Number(btn.dataset.days || 1);
      const base = dlMap_get();
      const nd = new Date(base.getTime() + days * 86400000);
      const inp = el.querySelector('#roundDlInput');
      if (inp) {
        const p = function(n){ return String(n).padStart(2,'0'); };
        inp.value = nd.getFullYear() + '-' + p(nd.getMonth()+1) + '-' + p(nd.getDate()) + 'T' + p(nd.getHours()) + ':' + p(nd.getMinutes());
      }
      return;
    }
    if (act === 'swap-pick') { swapSel = btn.value; return; }
    if (act === 'fa-cup-pick-stage') { cupRoundSel = btn.value; render(); return; }
    if (act === 'lg-swap') {
      const fromSel = el.querySelector('#swapFromSel'), toInp = el.querySelector('#swapToInp');
      const fromTid = fromSel ? Number(fromSel.value) : 0;
      const toQ = toInp ? toInp.value.trim() : '';
      if (!fromTid) return toast("Kim almashtirilishini tanlang");
      if (!toQ) return toast("Yangi foydalanuvchini kiriting");
      if (!(await confirmBox("Ishtirokchi almashtirilsinmi?"))) return;
      // fromTid - bu eski user; to - bu yangi user; eski user'ning klubi bo'yicha remove + add
      const p = (pl.data && pl.data.players) ? pl.data.players.find(function(x){ return x.telegramId === fromTid; }) : null;
      if (!p) return toast("Ishtirokchi topilmadi");
      const r = await post('/api/admin/league/' + curLeague + '/add', { user: toQ, club: p.clubId || p.club });
      if (!r.ok) return toast(ERR[r.error] || ERR.fail);
      const r2 = await post('/api/admin/league/' + curLeague + '/remove', { telegramId: fromTid });
      toast(r2.ok ? "Almashtirish yakunlandi ✅" : "Qo'shildi, lekin eski o'chirilmadi");
      swapSel = '';
      return Promise.all([loadOverview(), loadPlayers()]);
    }
    if (act === 'lg-hadd') {
      const inp = el.querySelector('#hLgId'), q = inp ? inp.value.trim() : '';
      if (!q) return toast("Telegram ID yoki @username kiriting");
      const lgId = btn.dataset.lg || curLeague;
      let tid;
      if (/^\d+$/.test(q)) { tid = Number(q); }
      else {
        const ru = await api('/api/admin/helpers/lookup?q=' + encodeURIComponent(q));
        tid = ru.ok ? ru.telegramId : 0;
      }
      if (!tid) return toast(ERR.nouser);
      return done(await post('/api/admin/helpers', { telegramId: tid, league: lgId }), "Yordamchi admin qo'shildi ✅", loadHelpers);
    }
    if (act === 'lg-cup-draw') {
      const stage = btn.dataset.stage, cup = btn.dataset.cup || curCup;
      if (!(await confirmBox("Qurani hozir o'tkazamizmi?"))) return;
      return done(await post('/api/admin/cup/draw', { cup, stage }), "Qura o'tkazildi 🎲", loadCup);
    }
    if (act === 'lg-cup-open') {
      const stage = btn.dataset.stage, cup = btn.dataset.cup || curCup;
      return done(await post('/api/admin/cup/start', { cup, stage, hours: 72 }), "Bosqich ochildi 🔓", loadCup);
    }
    if (act === 'lg-cup-close') {
      const stage = btn.dataset.stage, cup = btn.dataset.cup || curCup;
      if (!(await confirmBox("Bosqich yopilsinmi? O'yinchilar hisob kirita olmaydi."))) return;
      return done(await post('/api/admin/cup/close', { cup, stage }), "Bosqich yopildi 🔒", loadCup);
    }
    if (act === 'lg-cup-advance') {
      const stage = btn.dataset.stage, cup = btn.dataset.cup || curCup;
      return done(await post('/api/admin/cup/advance', { cup, stage }), "Keyingi bosqichga o'tildi ➡️", loadCup);
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

    if (act === 'reset-data') {
      const target = btn.dataset.target;
      if (!(await confirmBox("Hammasi o'chadi: o'yinlar, natijalar, reyting, klub egalari. Liga ro'yxatdan o'tishga qaytadi. Davom etasizmi?"))) return;
      const r = await post('/api/admin/reset-data', { target, confirm: 'RESET' });
      return done(r, `Tozalandi: ${r.matches || 0} ta o'yin${r.refunded ? ', ' + r.refunded + ' ta taklif qaytarildi' : ''} ♻️`, loadMatches);
    }
    if (act === 'lset') {
      const go = btn.dataset.go;
      if (['draw', 'results', 'players', 'support'].includes(go)) {
        mainTab = 'liga'; ligaSubTab = go; render();
        if (go === 'results') loadMatches();
        if (go === 'players') loadPlayers();
        if (go === 'support') loadSupport();
        return;
      }
      if (go === 'cup') { mainTab = 'liga'; render(); el.querySelector('#cupAnchor')?.scrollIntoView({ behavior: 'smooth' }); return; }
      if (go === 'helpers') { mainTab = 'adminadd'; aaType = 'help'; await loadHelpers(); return; }
      mainTab = go; render();
      if (go === 'auction') loadAuction();
      if (go === 'cmgr') loadCmgr();
      return;
    }
    if (act === 'aa-type') {
      aaType = btn.dataset.t === 'help' ? 'help' : 'gen';
      if (aaType === 'gen') await loadGenerals(); else await loadHelpers();
      return render();
    }
    if (act === 'open-jch') {
      window.UT_MODE = 'wc';
      location.hash = '#unofficial';
      return;
    }
    if (act === 'gen-add') {
      const user = (el.querySelector('#genUser') || {}).value || '';
      if (!user.trim()) return toast('Telegram ID yoki @username kiriting');
      const r = await post('/api/admin/generals', { user: user.trim() });
      return done(r, "Umumiy admin qo'shildi ✅", loadGenerals);
    }
    if (act === 'gen-remove') {
      if (!(await confirmBox("Bu umumiy adminni olib tashlaysizmi?"))) return;
      const r = await post('/api/admin/generals/remove', { telegramId: Number(btn.dataset.tid) });
      return done(r, 'Olib tashlandi', loadGenerals);
    }
    if (act === 'cm-load') {
      cmgr.league = el.querySelector('#cmLeague').value;
      return loadCmgr();
    }
    if (act === 'cm-assign') {
      const club = btn.dataset.club, user = (el.querySelector('#cm-u-' + club) || {}).value || '';
      if (!user.trim()) return toast('Telegram ID yoki @username kiriting');
      const r = await post('/api/admin/club/assign', { league: cmgr.league, club, user: user.trim() });
      return done(r, "Odam klubga qo'shildi ✅", loadCmgr);
    }
    if (act === 'cm-vacate') {
      if (!(await confirmBox("Klub egasi ketadi va klub bo'sh bo'ladi. Davom etasizmi?"))) return;
      const r = await post('/api/admin/club/vacate', { league: cmgr.league, club: btn.dataset.club });
      return done(r, 'Klub bo\'shatildi', loadCmgr);
    }
    if (act === 'cm-auction') {
      const club = btn.dataset.club, price = Number((el.querySelector('#cm-p-' + club) || {}).value);
      if (!Number.isInteger(price) || price < 1) return toast('Narxni to\'g\'ri kiriting');
      const r = await post('/api/admin/auction/list', { league: cmgr.league, club, price });
      return done(r, "Klub auksionga qo'yildi ✅", loadCmgr);
    }
    if (act === 'auc-adm-load') {
      aucAdm.league = el.querySelector('#aucAdmLeague').value;
      const r = await api('/api/admin/auction/clubs?league=' + encodeURIComponent(aucAdm.league));
      aucAdm.clubs = r.ok ? r.clubs : [];
      return render();
    }
    if (act === 'auc-adm-list') {
      const club = btn.dataset.club;
      const price = Number((el.querySelector('#aucp-' + club) || {}).value);
      if (!Number.isInteger(price) || price < 1) return toast('Narxni to\'g\'ri kiriting');
      const r = await post('/api/admin/auction/list', { league: aucAdm.league, club, price });
      return done(r, "Klub auksionga qo'yildi ✅", async () => {
        const x = await api('/api/admin/auction/clubs?league=' + encodeURIComponent(aucAdm.league));
        aucAdm.clubs = x.ok ? x.clubs : [];
        render();
      });
    }
    // --- Chempionlar ligasi ---
    if (act === 'ucl-toggle') {
      const id = Number(btn.dataset.id);
      uclSel = uclSel || new Set();
      uclSel.has(id) ? uclSel.delete(id) : uclSel.add(id);
      return render();
    }
    if (act === 'ucl-save-participants') {
      const r = await post('/api/admin/ucl/participants', { ids: [...(uclSel || [])] });
      return done(r, 'Ishtirokchilar saqlandi ✅', loadUcl);
    }
    if (act === 'ucl-start') {
      if (!(await confirmBox("Lig bosqichini boshlaysizmi? Ishtirokchilar qura orqali juftlanadi."))) return;
      const r = await post('/api/admin/ucl/start', {});
      return done(r, `Lig bosqichi boshlandi: ${r.matches || 0} ta o'yin 🎲`, loadUcl);
    }
    if (act === 'ucl-save') {
      const id = btn.dataset.id;
      const hg = Number(el.querySelector('#uh-' + id)?.value), ag = Number(el.querySelector('#ua-' + id)?.value);
      if (!Number.isInteger(hg) || !Number.isInteger(ag) || hg < 0 || ag < 0) return toast('Hisobni to\'g\'ri kiriting');
      const r = await post('/api/admin/ucl/result', { id, hg, ag });
      return done(r, 'Natija saqlandi ✅', loadUcl);
    }
    if (act === 'ucl-advance') {
      if (!(await confirmBox("Keyingi bosqichni ochasizmi? Juftliklar hozirgi natijalar bo'yicha tuziladi."))) return;
      const r = await post('/api/admin/ucl/advance', {});
      return done(r, 'Keyingi bosqich ochildi ✅', loadUcl);
    }
    if (act === 'ucl-reset') {
      if (!(await confirmBox("Chempionlar ligasi to'liq o'chiriladi va qaytadan sozlanadi. Davom etasizmi?"))) return;
      const r = await post('/api/admin/ucl/reset', { confirm: 'RESET' });
      return done(r, 'Chempionlar ligasi qaytadan sozlandi ♻️', loadUcl);
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
    } else if (act === 'swap-pick') {
      swapSel = e.target.value;
    } else if (act === 'fa-cup-pick-stage') {
      cupRoundSel = e.target.value;
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

  function show(root, toastFn, mode = 'global') {
    el = root;
    toast = toastFn;
    viewMode = mode;
    if (window.ADMIN_START_TAB) {
      mainTab = window.ADMIN_START_TAB;
      window.ADMIN_START_TAB = null;
    } else {
      mainTab = mode === 'league' ? 'liga' : 'stats';
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
      if (mainTab === 'stats') loadStats();
      else if (mainTab === 'tour') loadTours();
      else if (mainTab === 'liga') { loadMatches(); if (viewMode === 'league') { loadSupport(); loadPlayers(); loadHelpers(); loadCup(); } }
      else if (mainTab === 'cup') loadCup();
    });
  }

  const leave = () => {
    if (el) el.dataset.loaded = '';
    clearInterval(spTimer);
    if (bcTimer) { clearInterval(bcTimer); bcTimer = null; }
  };

  return { show, leave };
})();
