// Admin panel (faqat adminlar uchun, o'zbekcha): natijalarni tasdiqlash, qura, ishtirokchilar
window.AdminView = (() => {
  const tg = window.Telegram?.WebApp;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '' } }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
  const ERR = { drawn: "Qura allaqachon o'tkazilgan", few: 'Kamida 2 ishtirokchi kerak', played: "Hisoblar kiritilgan — qayta qura qilib bo'lmaydi", nouser: "Foydalanuvchi topilmadi (botga /start bosgan bo'lishi kerak)", already: "U shu mavsumda allaqachon ro'yxatda", taken: 'Bu klub band', full: "Liga to'lgan", badScore: "Hisobni to'g'ri kiriting (0–99)", gone: "Topilmadi yoki holati o'zgargan", forbidden: "Ruxsat yo'q", stage: "Bosqich topilmadi", nodraw: "Avval qura tashlang", none: "Tasdiqlangan o'yinlar yo'q", last: "Bu oxirgi bosqich", time: "Vaqt noto'g'ri", fail: "Xatolik, qayta urinib ko'ring" };
  const ST = { scheduled: 'Kutilmoqda', pending: 'Raqib tasdig\'i kutilmoqda', disputed: '⚠️ Bahsli (yolg\'on)', confirmed: 'Tasdiqlangan' };

  let el, toast, tab = 'results', tours = null, ov = null, mt = { league: '', status: 'action', list: [], total: 0 }, pl = { league: '', data: null }, cups = null, sp = { threads: null, open: null, name: '', msgs: [] }, spTimer = null, cupState = null;

  const fmtLocal = (d) => { const x = new Date(d), p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; };
  const fmtShow = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const leagueOpts = (sel, all) => (all ? `<option value="">Barcha ligalar</option>` : '') + (ov?.leagues || []).map((l) => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.name)} (${l.players})</option>`).join('');

  // Yordamchi adminlar ro'yxati (katta admin uchun)
  let hl = { list: null };
  const HELPER_TABS = ['results', 'draw', 'players', 'clubs'];
  async function loadHelpers() { const r = await api('/api/admin/helpers'); if (r.ok) { hl.list = r.helpers; if (tab === 'helpers') render(); } }
  function helpersHtml() {
    const rows = (hl.list || []).map((h) => `<div class="g-card ad-open"><span class="ad-cup-n"><b>${esc(h.name)}</b><small>${esc(h.leagueName)} · ${h.telegramId}</small></span><button class="ad-btn" data-act="hdel" data-id="${h.telegramId}" data-league="${esc(h.league)}">O'chirish</button></div>`).join('')
      || '<p class="ad-hint">Yordamchi adminlar yo\'q</p>';
    return `<div class="g-label"><span>Yordamchi adminlar</span></div>${rows}
      <div class="g-label"><span>Yangi yordamchi</span></div>
      <div class="ad-filters">
        <label class="ad-lbl">Foydalanuvchi Telegram ID si<input id="hId" class="ad-in" inputmode="numeric" placeholder="123456789"></label>
        <label class="ad-lbl">Liga<select id="hLg" class="ad-in">${leagueOpts(null, false)}</select></label>
        <button class="ad-btn" data-act="hadd">Tasdiqlash</button>
      </div>
      <p class="ad-hint">Yordamchi botga /start bosgan bo'lishi kerak. Tasdiqlangach unga xabar boradi.</p>`;
  }

  // ——— Klublar holati: davlat → liga → klublar ———
  let cl = { data: null, country: null, league: null };
  async function loadClubs() { const r = await api('/api/admin/clubs'); if (r.ok) { cl.data = r; if (tab === 'clubs') render(); } }
  function clubsHtml() {
    if (!cl.data) return '<p class="ad-hint">Yuklanmoqda…</p>';
    const all = cl.data.leagues, countries = (window.EFL?.COUNTRIES || []).filter((c) => all.some((l) => l.country === c.id));
    if (!countries.length) return '<p class="ad-hint">Ligalar topilmadi</p>';
    const country = countries.some((c) => c.id === cl.country) ? cl.country : countries[0].id;
    const leagues = all.filter((l) => l.country === country);
    const lg = leagues.find((l) => l.id === cl.league) || leagues[0];
    const taken = lg.clubs.filter((c) => c.taken).length;
    const cBtns = countries.map((c) => `<button class="${c.id === country ? 'on' : ''}" data-act="clc" data-cid="${c.id}">${c.flag || ''} ${esc(c.name?.uz || c.id)}</button>`).join('');
    const lBtns = leagues.map((l) => `<button class="${l.id === lg.id ? 'on' : ''}" data-act="cll" data-lid="${l.id}">${esc(l.name)}</button>`).join('');
    const grid = lg.clubs.map((c) => `<div class="ad-cl ${c.taken ? 'taken' : 'free'}"><b>${esc(c.name)}</b><small>${c.taken ? '🔒 ' + esc(c.user) : '✅ Bo\'sh'}</small></div>`).join('');
    return `<div class="ad-tabs">${cBtns}</div><div class="ad-tabs">${lBtns}</div>
      <div class="g-label"><span>${esc(lg.name)} · band ${taken}/${lg.clubs.length}</span></div>
      <div class="ad-clgrid">${grid}</div>`;
  }

  function tabsHtml() {
    const n = ov?.action || 0;
    return `<div class="ad-tabs">${[['stats', '📊 Statistika'], ['broadcast', '📢 Xabar'], ['results', `Natijalar${n ? ` <i>${n}</i>` : ''}`], ['draw', 'Qura'], ['cup', '🎲 FA Cup'], ['players', 'Ishtirokchilar'], ['tour', 'Turnirlar'], ['cups', 'Kubok narxi'], ['open', 'Ligalar holati'], ['clubs', '🏟 Klublar'], ['support', `Xabarlar${ov?.support ? ` <i>${ov.support}</i>` : ''}`], ['helpers', '👥 Yordamchilar']].filter(([k]) => (ov?.superAdmin ? true : HELPER_TABS.includes(k))).map(([k, v]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('')}</div>`;
  }

  // ——— Natijalar ———
  // Isbotlar: «Yolg'on» deganda yuborilgan skrinshot/izohlar
  const proofsHtml = (m) => (m.proofs || []).map((p) => `<div class="ad-proof"><b>📎 ${esc(p.by)}</b>${p.hg != null ? ` · aytgan hisobi: <b>${p.hg}:${p.ag}</b>` : ''}${p.text ? `<p>${esc(p.text)}</p>` : ''}${p.fileId ? `<img class="ad-shot" data-fid="${esc(p.fileId)}" data-act="zoom" alt="">` : ''}</div>`).join('');
  function matchHtml(m) {
    const proofs = proofsHtml(m);
    const claim = m.claim ? `<p class="ad-claim">Bekor qilingan hisob: ${m.claim.hg}:${m.claim.ag} (${esc(m.claim.by === m.home.id ? m.home.user : m.claim.by === m.away.id ? m.away.user : m.claim.by)} kiritgan)</p>` : '';
    const auto = m.auto ? `<p class="ad-claim">🤖 Avtomatik natija (dedlayn): ${m.auto === 'void' ? 'ikkala tomon kelmadi — bekor' : '3:0 texnik'}. Noto'g'ri bo'lsa — natijani o'zgartiring.</p>` : '';
    return `<div class="g-card ad-match" data-mid="${m.id}">
      <div class="ad-meta"><small>${esc(m.leagueName)} · ${m.round}-tur${m.deadline ? ` · ⏰ ${fmtShow(m.deadline)}` : ''}</small><span class="ad-st ${m.status}">${ST[m.status]}</span></div>
      <div class="ad-vs"><div><b>${esc(m.home.club)}</b><small>${esc(m.home.user)}</small></div><div class="ad-in"><input type="number" inputmode="numeric" min="0" max="99" value="${m.hg ?? ''}" data-hg><b>:</b><input type="number" inputmode="numeric" min="0" max="99" value="${m.ag ?? ''}" data-ag></div><div><b>${esc(m.away.club)}</b><small>${esc(m.away.user)}</small></div></div>
      ${claim}${auto}${proofs}${m.chat ? `<button class="ad-btn ghost sm" data-act="viewchat">💬 O'yin chati (${m.chat})</button><div class="ad-chatbox" data-chatbox></div>` : ''}
      <button class="ad-btn ok" data-act="result">${m.status === 'confirmed' ? "O'zgartirish va saqlash" : m.status === 'pending' ? '✅ Admin sifatida tasdiqlash' : '✅ Tasdiqlash / kiritish'}</button></div>`;
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
  const daysSel = (v) => `<label class="ad-lbl">Tur davomiyligi (kun) — dedlayn har tur oxirgi kuni 23:59<select data-rdays>${[1, 2, 3, 5, 7, 10, 14].map((d) => `<option value="${d}" ${d === (v || 7) ? 'selected' : ''}>${d} kun</option>`).join('')}</select></label>`;
  function drawHtml() {
    return (ov?.leagues || []).map((l) => {
      const drawn = !!l.drawnAt;
      const body = drawn
        ? `<p class="ad-ok">🎲 Qura o'tkazilgan: ${fmtShow(l.drawnAt)} · ${l.total} ta o'yin (${l.confirmed} tasdiqlangan)</p><button class="ad-btn ghost" data-act="redo" data-lg="${l.id}">Qayta qura (hisob kiritilmagan bo'lsa)</button>
           <div class="ad-dl">${daysSel(l.roundDays)}<button class="ad-btn ghost sm" data-act="deadlines" data-lg="${l.id}">⏰ Dedlaynsiz o'yinlarga dedlayn berish</button><p class="ad-hint">Dedlayn o'tgach, hisob kiritilmagan o'yinda avtomatik: faol tomonga 3:0, hech kim kelmagan bo'lsa bekor. Dedlaydan keyin qisqa muhlat beriladi (standart 12 soat).</p></div>`
        : `<label class="ad-lbl">Qura vaqti<input type="datetime-local" data-dt value="${l.drawAt ? fmtLocal(l.drawAt) : ''}"></label>
           <label class="ad-lbl">Davralar<select data-rounds><option value="2" ${l.rounds === 2 ? 'selected' : ''}>2 davra (uyda va mehmonda)</option><option value="1" ${l.rounds === 1 ? 'selected' : ''}>1 davra</option></select></label>
           ${daysSel(l.roundDays)}
           ${l.drawAt ? `<p class="ad-hint">⏰ Avtomatik qura: ${fmtShow(l.drawAt)}</p>` : ''}
           <div class="ad-row"><button class="ad-btn" data-act="settime" data-lg="${l.id}">Vaqtni saqlash</button><button class="ad-btn ok" data-act="draw" data-lg="${l.id}">🎲 Hozir qura qilish</button></div>${l.drawAt ? `<button class="ad-btn ghost" data-act="cleartime" data-lg="${l.id}">Vaqtni o'chirish</button>` : ''}`;
      return `<div class="g-card ad-lg" data-lgbox="${l.id}"><h3>${esc(l.name)} <small>${l.players}/${l.max}</small></h3>${body}</div>`;
    }).join('');
  }

  // ——— FA Cup: saralash + pley-off ———
  function cupHtml() {
    if (!cupState) return SK('rows', 3);
    return `<p class="ad-hint">Saralash: Premier Liga 20→10, Championship 24→12→6, keyin 16 klub. Qura vaqti kelganda avtomatik o'tadi. <b>Start</b> bosilmaguncha o'yinchilar faqat raqibni ko'radi.</p>` +
      cupState.stages.map((s) => {
        const drawn = !!s.drawnAt;
        return `<div class="g-card ad-lg" data-cupstage="${s.stage}">
          <h3>${esc(s.label)} <small>${s.teams} klub · ${s.matches} o'yin</small></h3>
          <p class="ad-hint">
            ${drawn ? `🎲 ${fmtShow(s.drawnAt)}` : "🎲 qura yo'q"}
            ${s.startedAt ? ` · ▶️ ${fmtShow(s.startedAt)}` : ''}
            ${s.deadline ? ` · ⏰ ${fmtShow(s.deadline)}` : ''}
            ${s.matches ? ` · ✅ ${s.confirmed}/${s.matches}` : ''}
          </p>
          ${drawn ? '' : `<label class="ad-lbl">Qura vaqti<input type="datetime-local" data-dt value="${s.drawAt ? fmtLocal(s.drawAt) : ''}"></label>`}
          <div class="ad-row">
            ${drawn
              ? `<label class="ad-lbl">Dedlayn (soat)<input type="number" min="0" max="720" value="24" data-hours></label>
                 <button class="ad-btn ok" data-act="cup-start">▶️ Start berish</button>`
              : `<button class="ad-btn" data-act="cup-time">Vaqtni saqlash</button>
                 <button class="ad-btn ok" data-act="cup-draw">🎲 Hozir qura</button>`}
          </div>
          ${s.stage !== 'final' ? `<button class="ad-btn ghost sm" data-act="cup-advance">➡️ Keyingi bosqichga</button>` : ''}
          ${drawn ? `<button class="ad-btn bad sm" data-act="cup-reset">Tozalash / qayta qura</button>` : ''}
        </div>`;
            }).join('') +
      `<div class="g-card ad-lg">
        <h3>🛡 Community Shield <small>2 finalist</small></h3>
        <p class="ad-hint">Premier Liga g'olibi va FA Cup g'olibi o'rtasidagi o'yin. Ikkalasi ham aniqlanganda yaratiladi. Bitta klub ikkalasini yutgan bo'lsa — o'yinsiz g'olib.</p>
        <button class="ad-btn ghost" data-act="cup-shield">🛡 Community Shield yaratish</button>
      </div>`;
  
  }
  async function loadCup() { const r = await api('/api/admin/cup'); if (r.ok) { cupState = r; if (tab === 'cup') render(); } }

    // ——— Qura marosimi: juftliklar birma-bir chiqadi ———
  function reveal(pairs, stage, after) {
    const meta = cupState?.stages?.find((s) => s.stage === stage);
    const box = document.createElement('div');
    box.className = 'rv-modal';
    box.innerHTML = `<div class="rv-box">
      <h3>🎲 ${esc(meta?.label || 'Qura')}</h3>
      <p class="rv-sub">${pairs.length} ta juftlik</p>
      <div class="rv-list">
        ${pairs.map((p, i) => `<div class="rv-item" style="animation-delay:${i * 180}ms">
          <span>${esc(p.home)}</span><b>vs</b><span>${esc(p.away)}</span>
        </div>`).join('')}
      </div>
      <button class="ad-btn ok" data-rv-close>Yopish</button>
    </div>`;
    const close = () => { box.remove(); if (after) after(); };
    box.addEventListener('click', (e) => {
      if (e.target === box || e.target.hasAttribute('data-rv-close')) close();
    });
    document.body.appendChild(box);
  }
  // ——— Ishtirokchilar ———
  function playersHtml() {
    const d = pl.data;
    const list = !d ? SK('rows', 3) : `${d.players.map((p) => `<div class="g-card ad-pl"><span><b>${esc(p.club)}</b><small>${esc(p.user)} · ${p.pts} ball · ${p.games} o'yin</small></span><button class="ad-btn ok" data-act="award" data-tid="${p.telegramId}" data-name="${esc(p.club)}">🏆 Kubok</button><button class="ad-btn bad" data-act="remove" data-tid="${p.telegramId}" data-name="${esc(p.club)}">Chiqarish</button></div>`).join('') || '<p class="ad-hint">Ishtirokchi yo\'q</p>'}
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
    if (!tours) return SK('rows', 3);
    return tours.map((x) => `<button class="g-card ut-card" data-act="tour-open" data-tid="${x.id}"><span><b>${esc(x.name)}</b><small>${esc(x.owner)} · ${x.players}/${x.max} · ${SB[x.status]}${x.action ? ` · <i style="color:#fb923c;font-style:normal">⚠️ ${x.action}</i>` : ''}</small></span><span class="chev">›</span></button>`).join('') || '<div class="pf-empty"><span>🏆</span><p>Turnir yo\'q</p></div>';
  }
  async function loadTours() { const r = await api('/api/admin/tournaments'); if (r.ok) { tours = r.list; if (tab === 'tour') render(); } }

  // ——— Ligalar holati: ochiq (ro'yxatdan o'tish mumkin) / yopiq ———
  function openHtml() {
    const row = (l) => `<div class="g-card ad-open"><span class="ad-cup-n"><b>${esc(l.name)}</b><small>${l.players}/${l.max} ishtirokchi · ${l.closed ? '🔒 Yopiq' : '🟢 Ochiq'}</small></span><button class="ad-btn ${l.closed ? 'ok' : 'bad'}" data-act="toggleopen" data-lg="${l.id}" data-closed="${l.closed ? '' : '1'}">${l.closed ? '🔓 Ochish' : '🔒 Yopish'}</button></div>`;
    const grp = (g, title) => `<div class="g-label"><span>${title}</span></div>${(ov?.leagues || []).filter((l) => String(l.group) === String(g)).map(row).join('')}`;
    return `<p class="ad-hint">Yopiq ligaga yangi ishtirokchi ro'yxatdan o'ta olmaydi (foydalanuvchida «Yopiq» belgisi chiqadi). Ligadagi mavjud ishtirokchilar va o'yinlarga ta'sir qilmaydi. Admin o'zi «Ishtirokchilar» bo'limidan baribir qo'sha oladi.</p>${grp('1', '1-ligalar')}${grp('2', '2-ligalar')}`;
  }

  // ——— Kubok narxlari: foydalanuvchilar kubokni shu narxda (UZS) adminga sotadi ———
  const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function cupsHtml() {
    if (!cups) return SK('rows', 3);
    const block = (g, title) => `<div class="g-label"><span>${title}</span></div>${cups.filter((c) => String(c.group) === String(g)).map((c) => `<div class="g-card ad-cup" data-cup="${c.id}"><span class="ad-cup-n"><b>${esc(c.name)}</b><small>${c.price ? '💰 ' + money(c.price) + ' UZS' : 'Narx belgilanmagan — sotib bo\'lmaydi'}</small></span><input type="number" inputmode="numeric" min="0" step="1000" placeholder="UZS" value="${c.price || ''}" data-price><button class="ad-btn ok" data-act="cupsave">Saqlash</button></div>`).join('')}`;
    return `<p class="ad-hint">Har bir liga kubogining narxini so'mda kiriting. Foydalanuvchi kubokni sotganda shu narx adminga xabarda ko'rinadi va pul shu summada o'tkaziladi. Bo'sh yoki 0 — narx yo'q, kubokni sotib bo'lmaydi.</p>${block('1', '1-ligalar')}${block('2', '2-ligalar')}`;
  }
  async function loadCups() { const r = await api('/api/admin/cup-prices'); if (r.ok) { cups = r.cups; if (tab === 'cups') render(); } }

  // ——— Xabarlar: «Muammoli holatlar» murojaatlari ———
  const hm2 = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const imgCache = new Map();
  async function loadImgs(root) {
    for (const im of root.querySelectorAll('img[data-fid]:not([data-ok])')) {
      im.dataset.ok = '1';
      const fid = im.dataset.fid;
      if (!imgCache.has(fid)) {
        try { const r = await fetch('/api/file/' + encodeURIComponent(fid), { headers: { 'x-init-data': tg?.initData || '' } }); if (!r.ok) throw 0; imgCache.set(fid, URL.createObjectURL(await r.blob())); } catch (_) { im.alt = '⚠️ rasm yuklanmadi'; continue; }
      }
      im.src = imgCache.get(fid);
    }4 
  }
  const bubble = (x) => `<div class="m-b ${x.mine ? 'me' : 'op'}">${x.fileId ? `<img class="m-img" data-fid="${esc(x.fileId)}" data-act="zoom" alt="">` : ''}${x.text ? `<span>${esc(x.text)}</span>` : ''}<small>${hm2(x.at)}</small></div>`;
  function supportHtml() {
    if (sp.open) return `<button class="back" data-act="spback"><span>‹</span> Murojaatlar</button><div class="g-card ad-thread-h"><b>${esc(sp.name)}</b><small>ID ${sp.open}</small></div><div class="m-msgs ad-msgs" id="spMsgs">${sp.msgs.map(bubble).join('') || '<p class="m-empty">Xabar yo\'q</p>'}</div><div class="m-send"><input id="spText" maxlength="800" placeholder="Javob yozing…" autocomplete="off"><button class="m-ic go" data-act="spsend">➤</button></div>`;
    if (!sp.threads) return SK('rows', 3);
    return `<p class="ad-hint">Foydalanuvchilarning «Muammoli holatlar» bo'limidan yozgan xabarlari. Javobingiz foydalanuvchiga bot orqali ham boradi.</p>${sp.threads.map((x) => `<button class="g-card ad-thread" data-act="spopen" data-uid="${x.uid}" data-name="${esc(x.name)}"><span><b>${esc(x.name)}</b><small>${x.fromAdmin ? 'Siz: ' : ''}${esc(x.text.slice(0, 70))}</small></span><span class="ad-thread-r"><small>${hm2(x.at)}</small>${x.unread ? `<i class="gm-badge" style="position:static">${x.unread}</i>` : ''}</span></button>`).join('') || '<div class="pf-empty"><span>📭</span><p>Murojaat yo\'q</p></div>'}`;
  }
  async function loadSupport() { const r = await api('/api/admin/support'); if (r.ok) { sp.threads = r.threads; if (tab === 'support' && !sp.open) render(); } }
  async function loadThread(scroll) {
    if (!sp.open) return;
    const r = await api('/api/admin/support/' + sp.open);
    if (!r.ok || !sp.open) return;
    const sig = r.messages.length + (r.messages[r.messages.length - 1]?.id || '');
    if (sig === sp.sig && !scroll) return;
    sp.sig = sig; sp.msgs = r.messages;
    const box = el.querySelector('#spMsgs');
    if (!box) return render();
    box.innerHTML = r.messages.map(bubble).join('') || '<p class="m-empty">Xabar yo\'q</p>';
    box.scrollTop = box.scrollHeight; loadImgs(box);
  }
  function startSpTimer() { clearInterval(spTimer); spTimer = setInterval(() => { if (tab === 'support' && sp.open) loadThread(false); else { clearInterval(spTimer); spTimer = null; } }, 5000); }
  function lightbox(src) { const d = document.createElement('div'); d.className = 'm-light'; d.innerHTML = `<img src="${src}" alt="">`; d.onclick = () => d.remove(); document.body.appendChild(d); }

  // ——— Statistika paneli ———
  let st = null, bc = { list: null, count: null, text: '', league: '', lang: '' }, bcTimer = null;
  const SK = (kind, n) => window.Skel?.[kind]?.(n) || '<p class="ad-hint">Yuklanmoqda…</p>';
  const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' mln' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + ' ming' : String(n));
  function bars(vals, days, cls, fmt = (v) => v) {
    const W = 320, H = 100, max = Math.max(1, ...vals), bw = W / vals.length;
    const rects = vals.map((v, i) => { const h = v ? Math.max(3, Math.round((v / max) * H)) : 0; return `<rect x="${(i * bw + 2).toFixed(1)}" y="${H - h}" width="${(bw - 4).toFixed(1)}" height="${h}" rx="3"><title>${days[i].slice(5)} · ${fmt(v)}</title></rect>`; }).join('');
    return `<svg class="st-chart ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="grafik"><line x1="0" y1="${H - .5}" x2="${W}" y2="${H - .5}"/>${rects}</svg><div class="st-axis"><span>${days[0].slice(5)}</span><span>eng ko'pi: ${fmt(max)}</span><span>${days[days.length - 1].slice(5)}</span></div>`;
  }
  const kpi = (v, l, sub = '') => `<div class="g-card st-kpi"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
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
        ${r.pending ? `<p class="ad-hint">⏳ Tasdiq kutayotgan to'lovlar: <b>${r.pending}</b> (botdagi chek xabarlarida)</p>` : ''}</div>
      <div class="g-card st-box"><h3>Ligalar to'ldirilishi <small>${money(u.registered)} ro'yxatdan o'tgan</small></h3>
        ${st.leagues.map((l) => `<div class="st-lg"><span>${esc(l.name)}</span><i><u style="width:${Math.min(100, Math.round((l.players / l.max) * 100))}%"></u></i><b>${l.players}/${l.max}</b></div>`).join('')}</div>
      ${u.blocked ? `<p class="ad-hint">🚫 Botni bloklaganlar: ${money(u.blocked)} (ommaviy xabar ularga yuborilmaydi)</p>` : ''}`;
  }
  async function loadStats() { const r = await api('/api/admin/stats?days=14'); if (r.ok) { st = r; if (tab === 'stats') render(); } }

  // ——— Ommaviy xabar ———
  const BCS = { running: '⏳ Yuborilmoqda', done: '✅ Yakunlandi', interrupted: '⚠️ To\'xtatilgan' };
  function broadcastHtml() {
    const hist = !bc.list ? SK('rows', 2) : bc.list.length ? bc.list.map((b) => {
      const pct = b.total ? Math.round(((b.sent + b.failed + b.blocked) / b.total) * 100) : 0;
      return `<div class="g-card bc-item"><div class="ad-meta"><small>${hm2(b.at)} · ${b.league ? esc(b.league) : 'hamma'}${b.lang ? ' · ' + b.lang.toUpperCase() : ''}</small><span class="ad-st ${b.status === 'done' ? 'confirmed' : 'pending'}">${BCS[b.status]}</span></div>
        <p>${esc(b.text.length > 140 ? b.text.slice(0, 140) + '…' : b.text)}</p>
        <div class="st-lg"><i><u style="width:${pct}%"></u></i><b>${b.sent}/${b.total}</b></div>
        <small class="ad-hint">${b.blocked ? `🚫 bloklagan: ${b.blocked} · ` : ''}${b.failed ? `❌ xato: ${b.failed}` : ''}</small></div>`;
    }).join('') : '<p class="ad-hint">Hali xabar yuborilmagan</p>';
    return `<p class="ad-hint">Xabar botdan shaxsiy chatga ketadi, pastida «Ilovani ochish» tugmasi bo'ladi. Avval «Sinov» bilan o'zingizga yuborib ko'ring.</p>
      <div class="g-card bc-form">
        <label class="ad-lbl">Kimga<select data-f="bcleague"><option value="">Hamma foydalanuvchilar</option>${(ov?.leagues || []).map((l) => `<option value="${l.id}" ${bc.league === l.id ? 'selected' : ''}>${esc(l.name)} o'yinchilari (${l.players})</option>`).join('')}</select></label>
        <label class="ad-lbl">Til<select data-f="bclang">${[['', 'Barcha tillar'], ['uz', "O'zbekcha"], ['en', 'English'], ['ru', 'Русский']].map(([k, v]) => `<option value="${k}" ${bc.lang === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="ad-lbl">Matn<textarea id="bcText" maxlength="3500" rows="6" placeholder="E'lon matni…">${esc(bc.text)}</textarea></label>
        <div class="bc-meta"><span id="bcCount">${bc.count == null ? '…' : money(bc.count) + ' kishiga boradi'}</span><span id="bcLen">${bc.text.length}/3500</span></div>
        <div class="ad-row"><button class="ad-btn ghost" data-act="bc-test">🧪 Sinov (o'zimga)</button><button class="ad-btn ok" data-act="bc-send">📢 Yuborish</button></div>
      </div>
      <div class="g-label"><span>Oxirgi xabarlar</span></div>${hist}`;
  }
  async function loadBroadcasts() {
    const r = await api('/api/admin/broadcast');
    if (!r.ok) return;
    bc.list = r.list;
    if (tab === 'broadcast') { const y = window.scrollY; render(); window.scrollTo(0, y); }
    const running = r.list.some((b) => b.status === 'running');
    if (running && !bcTimer) bcTimer = setInterval(() => (tab === 'broadcast' ? loadBroadcasts() : (clearInterval(bcTimer), (bcTimer = null))), 3000);
    if (!running && bcTimer) { clearInterval(bcTimer); bcTimer = null; }
  }
  async function loadBcCount() {
    const r = await post('/api/admin/broadcast/count', { league: bc.league || undefined, lang: bc.lang || undefined });
    bc.count = r.ok ? r.count : null;
    const c = el.querySelector('#bcCount'); if (c) c.textContent = bc.count == null ? '—' : money(bc.count) + ' kishiga boradi';
  }

  function render() {
    if (ov && !ov.superAdmin && !HELPER_TABS.includes(tab)) tab = 'results';
    if (!ov) { el.innerHTML = `<div class="page ad-page">${SK('kpis')}</div>`; return; }
    const body = tab === 'clubs' ? clubsHtml() : tab === 'helpers' ? helpersHtml() : tab === 'stats' ? statsHtml() : tab === 'broadcast' ? broadcastHtml() : tab === 'results' ? resultsHtml() : tab === 'draw' ? drawHtml() : tab === 'cup' ? cupHtml() : tab === 'tour' ? toursHtml() : tab === 'cups' ? cupsHtml() : tab === 'open' ? openHtml() : tab === 'support' ? supportHtml() : playersHtml();
    el.innerHTML = `<div class="page ad-page"><button class="back" data-back><span>‹</span> Bo'limlar</button><h1 class="section-title">🛠 Admin panel</h1>${tabsHtml()}${body}</div>`;
    loadImgs(el);
    const sb = el.querySelector('#spMsgs'); if (sb) sb.scrollTop = sb.scrollHeight;
  }

  const confirmBox = (msg) => new Promise((res) => (tg?.showConfirm ? tg.showConfirm(msg, res) : res(window.confirm(msg))));
  async function done(r, okMsg, reload) {
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(okMsg); } else toast(ERR[r.error] || ERR.fail);
    await loadOverview();
    if (reload) await reload();
  }

  async function onClick(e) {
    const t = e.target.closest('[data-tab]'), a = e.target.closest('[data-act]');
    if (t) { tab = t.dataset.tab; render(); if (tab === 'stats') loadStats(); if (tab === 'broadcast') { loadBroadcasts(); loadBcCount(); } if (tab === 'results') loadMatches(); if (tab === 'players') loadPlayers(); if (tab === 'helpers') loadHelpers(); if (tab === 'clubs') loadClubs(); if (tab === 'tour') loadTours(); if (tab === 'cups') loadCups(); if (tab === 'cup') loadCup(); if (tab === 'support') { sp.open = null; loadSupport(); } loadOverview(); return; }
    if (!a) return;
    const act = a.dataset.act, lg = a.dataset.lg;
    if (act === 'clc') { cl.country = a.dataset.cid; cl.league = null; return render(); }
    if (act === 'cll') { cl.league = a.dataset.lid; return render(); }
    if (act === 'hadd') {
      const tid = Number(el.querySelector('#hId')?.value), lgId = el.querySelector('#hLg')?.value || '';
      if (!Number.isInteger(tid) || tid <= 0 || !lgId) return toast(ERR.fail);
      const r = await post('/api/admin/helpers', { telegramId: tid, league: lgId });
      return done(r, "Yordamchi admin qo'shildi ✅", loadHelpers);
    }
    if (act === 'hdel') {
      if (!(await confirmBox("Yordamchi admin huquqini olib tashlaysizmi?"))) return;
      const r = await post('/api/admin/helpers/remove', { telegramId: Number(a.dataset.id), league: a.dataset.league });
      return done(r, "Olib tashlandi", loadHelpers);
    }
    if (act === 'cupsave') {
      const box = a.closest('[data-cup]'), price = Math.round(Number(box.querySelector('[data-price]').value || 0));
      if (!(price >= 0 && price <= 1e9)) return toast("Narxni to'g'ri kiriting");
      const r = await post('/api/admin/cup-prices', { league: box.dataset.cup, price });
      if (!r.ok) return toast(ERR.fail);
      const c = cups.find((x) => x.id === box.dataset.cup); if (c) c.price = price;
      tg?.HapticFeedback?.notificationOccurred('success'); toast(price ? 'Narx saqlandi ✅' : "Narx o'chirildi");
      return render();
    }
        if (act === 'cup-shield') {
      const r = await post('/api/admin/cup/shield');
      if (!r.ok) return toast(r.error === 'pl_not_finished' ? 'Premier Liga hali tugamagan' : 'Finalchilar hali aniqlanmagan');
      toast('Community Shield yaratildi 🛡'); return loadCup();
    }
    if (act.startsWith('cup-')) {
      const box = a.closest('[data-cupstage]'), stage = box.dataset.cupstage;
      if (act === 'cup-time') {
        const v = box.querySelector('[data-dt]')?.value;
        if (!v) return toast('Vaqtni tanlang');
        return done(await post('/api/admin/cup/draw-time', { stage, drawAt: new Date(v).toISOString() }), 'Qura vaqti saqlandi ✅', loadCup);
      }
            if (act === 'cup-draw') {
        if (!(await confirmBox("Qurani hozir o'tkazamizmi? Ishtirokchilar tasodifiy juftlanadi."))) return;
        const r = await post('/api/admin/cup/draw', { stage });
        if (!r.ok) return toast(ERR[r.error] || ERR.fail);
        const p = await api('/api/admin/cup/pairs?stage=' + stage);
        return reveal(p.pairs || [], stage, loadCup);
      }
      if (act === 'cup-start') {
        const hours = Number(box.querySelector('[data-hours]')?.value || 0);
        return done(await post('/api/admin/cup/start', { stage, hours }), 'Tur ochildi ▶️', loadCup);
      }
      if (act === 'cup-advance') {
        return done(await post('/api/admin/cup/advance', { stage }), "Keyingi bosqichga o'tildi ➡️", loadCup);
      }
      if (act === 'cup-reset') {
        if (!(await confirmBox("Bosqich tozalanadi: o'yinlar o'chadi, qayta qura mumkin bo'ladi. Davom etilsinmi?"))) return;
        return done(await post('/api/admin/cup/reset', { stage }), 'Tozalandi 🧹', loadCup);
      }
    }
    if (act === 'bc-test' || act === 'bc-send') {
      const text = bc.text.trim();
      if (!text) return toast('Matnni yozing');
      if (act === 'bc-test') { const r = await post('/api/admin/broadcast', { text, test: true }); return toast(r.ok ? "Sinov xabari o'zingizga yuborildi 🧪" : "Yuborilmadi — avval botga /start bosing"); }
      if (!(await confirmBox(`Xabar ${bc.count ?? ''} kishiga yuboriladi. Davom etilsinmi?`))) return;
      const r = await post('/api/admin/broadcast', { text, league: bc.league || undefined, lang: bc.lang || undefined });
      if (!r.ok) return toast(r.error === 'busy' ? "Boshqa xabar hali yuborilmoqda" : r.error === 'empty' ? "Qabul qiluvchi yo'q" : ERR.fail);
      tg?.HapticFeedback?.notificationOccurred('success'); toast(`Yuborish boshlandi: ${r.total} kishi 📢`);
      bc.text = ''; return loadBroadcasts();
    }
    if (act === 'zoom') return lightbox(a.src);
    if (act === 'viewchat') {
      const box = a.parentElement.querySelector('[data-chatbox]'), mid = a.closest('[data-mid]').dataset.mid;
      if (box.innerHTML) { box.innerHTML = ''; return; }
      const r = await api(`/api/admin/matches/${mid}/chat`);
      box.innerHTML = r.ok ? (r.messages.map((x) => `<div class="m-b ${x.side === 'home' ? 'op' : 'me'}"><b class="ad-by">${esc(x.by)}</b>${x.type === 'room' ? `🎮 Xona ID: <b>${esc(x.text)}</b>` : `<span>${esc(x.text)}</span>`}<small>${hm2(x.at)}</small></div>`).join('') || '<p class="ad-hint">Chat bo\'sh</p>') : '<p class="ad-hint">Yuklanmadi</p>';
      return;
    }
    if (act === 'spopen') { sp.open = a.dataset.uid; sp.name = a.dataset.name; sp.msgs = []; sp.sig = ''; render(); await loadThread(true); startSpTimer(); loadOverview(); return; }
    if (act === 'spback') { sp.open = null; render(); loadSupport(); loadOverview(); return; }
    if (act === 'spsend') {
      const inp = el.querySelector('#spText'), text = inp.value.trim();
      if (!text) return;
      inp.value = '';
      const r = await post('/api/admin/support/' + sp.open, { text });
      if (!r.ok) { inp.value = text; return toast('Yuborilmadi'); }
      return loadThread(true);
    }
    if (act === 'toggleopen') {
      const closed = a.dataset.closed === '1';
      if (closed && !(await confirmBox('Ligani yopamizmi? Yangi ishtirokchilar ro\'yxatdan o\'ta olmaydi.'))) return;
      return done(await post(`/api/admin/league/${lg}/closed`, { closed }), closed ? 'Liga yopildi 🔒' : 'Liga ochildi 🔓');
    }
    if (act === 'tour-open') { location.hash = '#unofficial/' + a.dataset.tid; return; }
    if (act === 'result') {
      const box = a.closest('[data-mid]'), hg = parseInt(box.querySelector('[data-hg]').value, 10), ag = parseInt(box.querySelector('[data-ag]').value, 10);
      if (!(hg >= 0 && hg <= 99 && ag >= 0 && ag <= 99)) return toast(ERR.badScore);
      return done(await post(`/api/admin/matches/${box.dataset.mid}/result`, { hg, ag }), 'Natija saqlandi ✅', loadMatches);
    }
    if (act === 'settime' || act === 'cleartime' || act === 'draw') {
      const box = a.closest('[data-lgbox]'), v = box.querySelector('[data-dt]')?.value, rounds = Number(box.querySelector('[data-rounds]')?.value || 2), roundDays = Number(box.querySelector('[data-rdays]')?.value || 7);
      if (act === 'settime') { if (!v) return toast('Vaqtni tanlang'); return done(await post(`/api/admin/league/${lg}/draw-time`, { drawAt: new Date(v).toISOString(), rounds, roundDays }), 'Qura vaqti saqlandi ✅'); }
      if (act === 'cleartime') return done(await post(`/api/admin/league/${lg}/draw-time`, { drawAt: null, rounds, roundDays }), "Qura vaqti o'chirildi");
      if (!(await confirmBox('Qurani hozir o\'tkazamizmi? Ishtirokchilar aralashtirilib, o\'yinlar jadvali tuziladi.'))) return;
      return done(await post(`/api/admin/league/${lg}/draw`, { rounds, roundDays }), 'Qura o\'tkazildi 🎲');
    }
    if (act === 'deadlines') {
      const days = Number(a.closest('[data-lgbox]')?.querySelector('[data-rdays]')?.value || 7);
      if (!(await confirmBox(`Tugallanmagan o'yinlarga dedlayn beriladi (tur ${days} kun, hozirdan boshlab). Dedlayn o'tgach avtomatik texnik natija qo'llanadi. Davom etilsinmi?`))) return;
      const r = await post(`/api/admin/league/${lg}/deadlines`, { roundDays: days });
      return done(r, `Dedlayn berildi: ${r.matches} ta o'yin ⏰`, null).then(() => r.ok || toast(r.error === 'nodl' ? "Dedlaynsiz o'yin yo'q" : ERR.fail));
    }
    if (act === 'redo') {
      if (!(await confirmBox('Qurani qayta o\'tkazamizmi? Eski o\'yinlar jadvali o\'chiriladi.'))) return;
      return done(await post(`/api/admin/league/${lg}/draw`, { redo: true, rounds: ov.leagues.find((l) => l.id === lg)?.rounds, roundDays: Number(a.closest('[data-lgbox]')?.querySelector('[data-rdays]')?.value || 7) }), 'Qayta qura o\'tkazildi 🎲');
    }
    if (act === 'award') {
      const lname = ov?.leagues.find((l) => l.id === pl.league)?.name || '';
      if (!(await confirmBox(`${a.dataset.name} — ${lname} g'olibi sifatida kubok topshirilsinmi? Kubok uning Me → Kolleksiyasiga tushadi.`))) return;
      const r = await post(`/api/admin/league/${pl.league}/award`, { telegramId: Number(a.dataset.tid) });
      if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); return toast('Kubok topshirildi 🏆'); }
      return toast(r.error === 'already' ? 'Bu kubok unga allaqachon berilgan' : ERR[r.error] || ERR.fail);
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
  function onInput(e) {
    if (e.target.id !== 'bcText') return;
    bc.text = e.target.value;
    const l = el.querySelector('#bcLen'); if (l) l.textContent = bc.text.length + '/3500';
  }
  function onChange(e) {
    const f = e.target.dataset.f;
    if (f === 'league' || f === 'status') { mt[f] = e.target.value; loadMatches(); }
    if (f === 'bcleague' || f === 'bclang') { bc[f === 'bcleague' ? 'league' : 'lang'] = e.target.value; bc.count = null; loadBcCount(); }
    if (f === 'plleague') { pl = { league: e.target.value, data: null }; render(); loadPlayers(); }
  }

  function show(root, toastFn) {
    el = root; toast = toastFn;
    if (!el.dataset.bound) { el.dataset.bound = '1'; el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('input', onInput); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'spText') { e.preventDefault(); el.querySelector('[data-act="spsend"]')?.click(); } }); }
    render();
    if (el.dataset.loaded !== '1') { el.dataset.loaded = '1'; loadOverview(); loadMatches(); }
  }
  const leave = () => { if (el) el.dataset.loaded = ''; };
  return { show, leave };
})();