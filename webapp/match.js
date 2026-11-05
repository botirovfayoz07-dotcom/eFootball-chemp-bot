// O'yin oynalari (pastdan chiqadigan varaq): natija kiritish, «Yolg'on» + isbot, raqib bilan chat, xona ID,
// va «Muammoli holatlar» (adminga yozish). league.js dan init() orqali ulanadi.
window.MatchView = (() => {
  const T = {
    uz: {
      cConfirmed: 'TASDIQLANDI', cPending: 'KUTILMOQDA', cDisputed: 'BAHSLI', result: 'Natija', addProof: 'Isbot',
      resultTitle: 'Natija kiritish', you: 'Siz', send: 'Yuborish',
      resultHint: "Raqib tasdiqlasa natija darhol qabul qilinadi (admin tasdig'i shart emas). Raqib tasdiqlamasa, admin ko'rib chiqadi.",
      disputeTitle: "Hisob yolg'on", proofTitle: "Isbot qo'shish", claimed: 'Raqib kiritgan hisob', real: 'Haqiqiy hisob (ixtiyoriy)',
      comment: "Izoh — nima noto'g'ri?", commentPh: "Masalan: o'yin 2:1 tugadi, skrinshotni qo'shdim", shot: "Skrinshot qo'shish",
      proofHint: "O'yinning aniq hisobi tushgan skrinshot yoki izoh yuboring. Isbot adminga boradi, natijani admin kiritadi.",
      submit: 'Adminga yuborish', needProof: "Skrinshot yoki izoh qo'shing", proofSent: 'Isbot adminga yuborildi ✅', badImage: 'Rasm yaroqsiz (5 MB gacha)',
      roomBtn: '🎮 Xona ID yuborish', chatBtn: '💬 Chatni ochish', tgBtn: '✈️ Raqibga yozish (Telegram)', noTg: "Raqibda Telegram username yo'q — chatdan foydalaning",
      roomTitle: 'eFootball xona ID si', roomPh: 'Masalan: 123456', roomBad: "Xona ID ni to'g'ri kiriting (3–24 belgi)", roomSent: 'Xona ID yuborildi ✅',
      chatPh: 'Xabar yozing…', chatEmpty: "Hozircha xabar yo'q. Birinchi bo'lib yozing 👋", room: 'Xona ID', copied: 'Nusxalandi ✅', fast: 'Sekinroq yozing 🙂', tooMany: 'Isbotlar soni limitga yetdi',
      supportName: 'Admin', supportSub: 'Muammoli holatlar', supportEmpty: "Muammoingizni yozing — admin javob beradi. Skrinshotni 📎 tugmasi bilan yuborishingiz mumkin.",
      supportCard: 'Muammoli holatlar', supportDesc: "Chempionatdagi muammo, bahsli natija yoki boshqa savol — adminga yozing", supportOpen: 'Adminga yozish',
      fail: "Xatolik, qayta urinib ko'ring", gone: "O'yin holati o'zgargan",
    },
    en: {
      cConfirmed: 'CONFIRMED', cPending: 'PENDING', cDisputed: 'DISPUTED', result: 'Result', addProof: 'Proof',
      resultTitle: 'Enter the result', you: 'You', send: 'Send',
      resultHint: "If your opponent confirms, the result is accepted right away (no admin approval needed). If they don't, the admin will review it.",
      disputeTitle: 'The score is fake', proofTitle: 'Add proof', claimed: 'Score entered by opponent', real: 'Real score (optional)',
      comment: "Comment — what's wrong?", commentPh: 'E.g. the match ended 2:1, screenshot attached', shot: 'Add screenshot',
      proofHint: 'Send a screenshot showing the exact score, or a comment. The proof goes to the admin, who will enter the result.',
      submit: 'Send to admin', needProof: 'Add a screenshot or a comment', proofSent: 'Proof sent to the admin ✅', badImage: 'Invalid image (up to 5 MB)',
      roomBtn: '🎮 Send room ID', chatBtn: '💬 Open chat', tgBtn: '✈️ Message opponent (Telegram)', noTg: 'The opponent has no Telegram username — use the chat',
      roomTitle: 'eFootball room ID', roomPh: 'E.g. 123456', roomBad: 'Enter a valid room ID (3–24 characters)', roomSent: 'Room ID sent ✅',
      chatPh: 'Type a message…', chatEmpty: 'No messages yet. Say hi first 👋', room: 'Room ID', copied: 'Copied ✅', fast: 'Slow down 🙂', tooMany: 'Proof limit reached',
      supportName: 'Admin', supportSub: 'Problem reports', supportEmpty: 'Describe your problem — the admin will reply. You can attach a screenshot with the 📎 button.',
      supportCard: 'Problem reports', supportDesc: 'League issue, disputed result or any other question — write to the admin', supportOpen: 'Write to admin',
      fail: 'Error, please try again', gone: 'The match status has changed',
    },
    ru: {
      cConfirmed: 'ПОДТВЕРЖДЁН', cPending: 'ОЖИДАЕТ', cDisputed: 'СПОР', result: 'Счёт', addProof: 'Доказ.',
      resultTitle: 'Ввод результата', you: 'Вы', send: 'Отправить',
      resultHint: 'Если соперник подтвердит, результат принимается сразу (подтверждение админа не нужно). Если нет — проверит админ.',
      disputeTitle: 'Счёт ложный', proofTitle: 'Добавить доказательство', claimed: 'Счёт, введённый соперником', real: 'Настоящий счёт (необязательно)',
      comment: 'Комментарий — что не так?', commentPh: 'Например: матч закончился 2:1, скриншот приложен', shot: 'Добавить скриншот',
      proofHint: 'Отправьте скриншот с точным счётом или комментарий. Доказательство уйдёт админу, он внесёт результат.',
      submit: 'Отправить админу', needProof: 'Добавьте скриншот или комментарий', proofSent: 'Доказательство отправлено админу ✅', badImage: 'Неверное изображение (до 5 МБ)',
      roomBtn: '🎮 Отправить ID комнаты', chatBtn: '💬 Открыть чат', tgBtn: '✈️ Написать сопернику (Telegram)', noTg: 'У соперника нет username в Telegram — используйте чат',
      roomTitle: 'ID комнаты eFootball', roomPh: 'Например: 123456', roomBad: 'Введите корректный ID комнаты (3–24 символа)', roomSent: 'ID комнаты отправлен ✅',
      chatPh: 'Напишите сообщение…', chatEmpty: 'Сообщений пока нет. Напишите первым 👋', room: 'ID комнаты', copied: 'Скопировано ✅', fast: 'Не так быстро 🙂', tooMany: 'Лимит доказательств исчерпан',
      supportName: 'Админ', supportSub: 'Проблемные ситуации', supportEmpty: 'Опишите проблему — админ ответит. Скриншот можно отправить кнопкой 📎.',
      supportCard: 'Проблемные ситуации', supportDesc: 'Проблема в чемпионате, спорный результат или другой вопрос — напишите админу', supportOpen: 'Написать админу',
      fail: 'Ошибка, попробуйте ещё раз', gone: 'Статус матча изменился',
    },
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ago = (d) => {
    const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 3) return '🟢 online';
    if (m < 60) return `${m} daq oldin`;
    if (m < 1440) return `${Math.round(m / 60)} soat oldin`;
    return `${Math.round(m / 1440)} kun oldin`;
  };
  const tg = window.Telegram?.WebApp;
  let C = null, root = null, timer = null, S = {};
  const t = () => T[C.lang()] || T.uz;
  const crest = (l, c, n) => window.EFL.crest(l, c, n, 'crest');
  const hm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ——— varaq (bottom sheet) ———
  // «yozyapti...» signali: yozish paytida har 3 soniyada bir marta yuboriladi
  let lastTyping = 0;
  const typingPing = () => {
    if (!S.g || S.mode !== 'chat' || Date.now() - lastTyping < 3000) return;
    lastTyping = Date.now(); C.post(`/api/matches/${S.g.id}/typing`, {}).catch(() => {});
  };
  function show(inner) {
    if (!root) {
      root = document.createElement('div');
      root.id = 'mSheet'; root.className = 'msheet-root';
      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'mChatText') { e.preventDefault(); chatSend(); } });
      root.addEventListener('input', (e) => { if (e.target.id === 'mChatText') typingPing(); });
      document.body.appendChild(root);
    }
    root.innerHTML = `<div class="msheet-bg" data-m="close"></div><div class="msheet"><i class="msheet-handle"></i><button class="msheet-x" data-m="close">✕</button>${inner}</div>`;
  }
  function close() {
    clearInterval(timer); timer = null;
    const was = S.mode;
    root?.remove(); root = null; S = {};
    if (was === 'chat' || was === 'support') C?.reload();      // o'qilmagan belgisi yangilansin
  }
  const vs = (g) => `<div class="m-vs"><div>${crest(g.league, g.club, g.myName)}<b>${esc(g.myName)}</b><small>${t().you}</small></div><span>VS</span><div>${crest(g.league, g.oppClub, g.opponent)}<b>${esc(g.opponent || '—')}</b><small>${esc(g.user || '')}</small></div></div>`;

  // ——— 1. Natija kiritish ———
  const stepper = (side, v) => `<div class="m-step"><button data-m="step" data-d="-1">−</button><input type="number" inputmode="numeric" min="0" max="99" value="${v}" data-in="${side}"><button data-m="step" data-d="1">+</button></div>`;
  function openResult(g) {
    S = { mode: 'result', g };
    const pre = g.status === 'pending' && g.byMe && g.score ? g.score.split(':') : ['0', '0'];
    show(`<h3>${t().resultTitle}</h3>${vs(g)}<div class="m-score">${stepper('my', pre[0])}<b>:</b>${stepper('opp', pre[1])}</div><p class="m-note">${t().resultHint}</p><button class="m-primary" data-m="result-send">${t().send}</button>`);
  }
  async function resultSend() {
    const q = (k) => parseInt(root.querySelector(`[data-in="${k}"]`).value, 10), my = q('my'), opp = q('opp'), p = window.ProfileView.T[C.lang()];
    if (!(my >= 0 && my <= 99 && opp >= 0 && opp <= 99)) return C.toast(p.badScore);
    const r = await C.post(`/api/matches/${S.g.id}/report`, { my, opp });
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); C.toast(p.sent); close(); C.reload(); } else C.toast(p[r.error] || t().fail);
  }

  // ——— 2. «Yolg'on» (isbot bilan) va keyingi isbot qo'shish ———
  function openDispute(g, mode) {
    S = { mode, g, image: null };
    const x = t();
    show(`<h3>${mode === 'dispute' ? x.disputeTitle : x.proofTitle}</h3>${vs(g)}
      ${mode === 'dispute' ? `<p class="m-claim">${x.claimed}: <b>${esc(g.score || '')}</b></p><label class="m-lb">${x.real}</label><div class="m-real"><input type="number" inputmode="numeric" min="0" max="99" data-in="my" placeholder="${x.you}"><b>:</b><input type="number" inputmode="numeric" min="0" max="99" data-in="opp" placeholder="—"></div>` : ''}
      <label class="m-lb">${x.comment}</label><textarea class="m-ta" id="mText" maxlength="600" rows="3" placeholder="${esc(x.commentPh)}"></textarea>
      <div id="mPrev" class="m-prev"></div>
      <button class="m-ghost" data-m="shot">📎 ${x.shot}</button><input type="file" id="mFile" accept="image/*" hidden>
      <p class="m-note">${x.proofHint}</p>
      <button class="m-primary bad" data-m="dispute-send">${x.submit}</button>`);
  }
  async function disputeSend() {
    const x = t(), text = root.querySelector('#mText').value.trim();
    if (!S.image && text.length < 3) return C.toast(x.needProof);
    const body = { text, image: S.image || '' };
    if (S.mode === 'dispute') {
      const my = parseInt(root.querySelector('[data-in="my"]').value, 10), opp = parseInt(root.querySelector('[data-in="opp"]').value, 10);
      if (my >= 0 && my <= 99 && opp >= 0 && opp <= 99) Object.assign(body, { my, opp });
    }
    const btn = root.querySelector('[data-m="dispute-send"]'); btn.disabled = true;
    const r = await C.post(`/api/matches/${S.g.id}/${S.mode === 'dispute' ? 'dispute' : 'proof'}`, body);
    btn.disabled = false;
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); C.toast(x.proofSent); close(); C.reload(); } else C.toast(x[r.error] || x.fail);
  }

  // ——— 3. Chat tugmasi varag'i: Xona ID · Chat · Raqibga yozish ———
  function openActions(g) {
    S = { mode: 'actions', g };
    show(`${vs(g)}<button class="m-opt" data-m="room-open">${t().roomBtn}</button><button class="m-opt main" data-m="chat-open">${t().chatBtn}${g.unread ? ` <i class="m-badge in">${g.unread}</i>` : ''}</button><button class="m-opt" data-m="tg">${t().tgBtn}</button>`);
  }
  function openRoom() {
    clearInterval(timer); timer = null;
    S = { ...S, mode: 'room' };
    show(`<h3>${t().roomTitle}</h3><input class="m-room" id="mRoom" maxlength="24" placeholder="${esc(t().roomPh)}" autocomplete="off"><button class="m-primary" data-m="room-send">${t().send}</button>`);
    root.querySelector('#mRoom').focus();
  }
  async function roomSend() {
    const v = root.querySelector('#mRoom').value.trim();
    if (!/^[A-Za-z0-9\-]{3,24}$/.test(v)) return C.toast(t().roomBad);
    const r = await C.post(`/api/matches/${S.g.id}/chat`, { type: 'room', text: v });
    if (!r.ok) return C.toast(t()[r.error] || t().fail);
    tg?.HapticFeedback?.notificationOccurred('success'); C.toast(t().roomSent); openChat(S.g);
  }

  // ——— 4. Chat (raqib bilan yoki adminga) ———
  const imgCache = new Map();
  async function loadImgs(box) {
    for (const im of box.querySelectorAll('img[data-fid]:not([data-ok])')) {
      im.dataset.ok = '1';
      const fid = im.dataset.fid;
      if (!imgCache.has(fid)) {
        try { const r = await fetch('/api/file/' + encodeURIComponent(fid), { headers: { 'x-init-data': tg?.initData || '' } }); if (!r.ok) throw 0; imgCache.set(fid, URL.createObjectURL(await r.blob())); } catch (_) { im.alt = '⚠️'; continue; }
      }
      im.src = imgCache.get(fid);
    }
  }
  const msgHtml = (x) => {
    const cls = x.mine ? 'me' : 'op';
    if (x.type === 'room') return `<div class="m-b ${cls} room">🎮 ${t().room}: <b>${esc(x.text)}</b> <button class="m-copy" data-m="copy" data-v="${esc(x.text)}">📋</button><small>${hm(x.at)}</small></div>`;
    return `<div class="m-b ${cls}">${x.fileId ? `<img class="m-img" data-fid="${esc(x.fileId)}" data-m="zoom" alt="">` : ''}${x.text ? `<span>${esc(x.text)}</span>` : ''}<small>${hm(x.at)}</small></div>`;
  };
  // Sarlavha holati: yozyapti... / online / oxirgi marta … oldin
  const statusText = (o) => {
    if (!o) return '';
    if (o.typing) return 'yozyapti...';
    if (!o.lastSeen) return '';
    const m = Math.round((Date.now() - new Date(o.lastSeen).getTime()) / 60000);
    if (m < 2) return 'online';
    if (m < 60) return `oxirgi marta ${m} daqiqa oldin`;
    if (m < 1440) return `oxirgi marta ${Math.round(m / 60)} soat oldin`;
    return `oxirgi marta ${new Date(o.lastSeen).toLocaleDateString('uz-UZ')}`;
  };
  async function refresh(force) {
    if (!root || !S.mode) return;
    const support = S.mode === 'support', r = await C.api(support ? '/api/support?league=' + encodeURIComponent(S.league || '') : `/api/matches/${S.g.id}/chat`);
    if (!r.ok || !root) return;
    if (r.opp) S.opp = r.opp;
    if (!support) { const st = root.querySelector('.m-st'); if (st) { st.textContent = statusText(S.opp); st.classList.toggle('typing', !!S.opp?.typing); } }
    if (support && r.peer?.name) { const pe = root.querySelector('#mPeer'); if (pe) pe.textContent = r.peer.name; }
    const sig = r.messages.length + ':' + (r.messages[r.messages.length - 1]?.id || '');
    if (!force && sig === S.sig) return;
    S.sig = sig;
    const box = root.querySelector('#mMsgs');
    if (!box) return;
    const near = force || box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    box.innerHTML = r.messages.length ? r.messages.map(msgHtml).join('') : `<p class="m-empty">${support ? t().supportEmpty : t().chatEmpty}</p>`;
    if (near) box.scrollTop = box.scrollHeight;
    loadImgs(box);
  }
  function openChat(g, support = false, league = '') {
    S = { mode: support ? 'support' : 'chat', g, image: null, sig: '', league: support ? (league || '') : '' };
    const x = t();
    const head = support
      ? `<div class="m-head"><span class="m-av">🛟</span><div><b id="mPeer">${x.supportName}</b><small>${x.supportSub}</small></div></div>`
      : `<div class="m-head"><span class="m-av">${esc((g.user || g.opponent || '?').replace('@', '')[0] || '?')}</span><div><b>${esc(g.opponent || '—')}</b><small>${esc(g.user || '')}</small><small class="m-st">${esc(statusText(S.opp))}</small></div></div>`;
    // Chat oynasi tuzilmasi: sarlavha + xabarlar + kiritish (yozish maydoni, skrinshot, yuborish)
    show(`${head}<div class="m-msgs" id="mMsgs"></div><div id="mPrev" class="m-prev"></div><div class="m-send"><button class="m-ic" data-m="shot" aria-label="📎">📎</button><input id="mChatText" maxlength="800" placeholder="${esc(x.chatPh)}" autocomplete="off"><button class="m-ic go" data-m="chat-send" aria-label="send">➤</button></div><input type="file" id="mFile" accept="image/*" hidden>`);
    root.querySelector('.msheet').classList.add('chat');
    refresh(true);
    clearInterval(timer); timer = setInterval(() => refresh(false), 2500);
  }
  async function chatSend() {
    const inp = root?.querySelector('#mChatText');
    if (!inp) return;
    const text = inp.value.trim(), support = S.mode === 'support';
    if (!text && !S.image) return;
    inp.value = ''; const image = S.image; S.image = null; const pv = root.querySelector('#mPrev'); if (pv) pv.innerHTML = '';
    const r = support ? await C.post('/api/support', { text, image: image || '', league: S.league || '' }) : await C.post(`/api/matches/${S.g.id}/chat`, { text });
    if (!r.ok) { inp.value = text; S.image = image; return C.toast(t()[r.error] || t().fail); }
    refresh(true);
  }

  // ——— rasm tanlash (skrinshot) ———
  function compress(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
      img.src = url;
    });
  }
  async function onChange(e) {
    if (e.target.id !== 'mFile') return;
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { S.image = await compress(f); } catch (_) { return C.toast(t().badImage); }
    const pv = root.querySelector('#mPrev');
    if (pv) pv.innerHTML = `<img src="${S.image}" alt=""><button data-m="shot-del">✕</button>`;
  }

  function zoom(src) {
    const d = document.createElement('div'); d.className = 'm-light'; d.innerHTML = `<img src="${src}" alt="">`;
    d.onclick = () => d.remove(); document.body.appendChild(d);
  }

  function onClick(e) {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    const m = b.dataset.m;
    if (m === 'close') close();
    else if (m === 'step') { const inp = b.parentElement.querySelector('input'); inp.value = Math.max(0, Math.min(99, (parseInt(inp.value, 10) || 0) + Number(b.dataset.d))); tg?.HapticFeedback?.selectionChanged(); }
    else if (m === 'result-send') resultSend();
    else if (m === 'dispute-send') disputeSend();
    else if (m === 'shot') root.querySelector('#mFile')?.click();
    else if (m === 'shot-del') { S.image = null; root.querySelector('#mPrev').innerHTML = ''; }
    else if (m === 'room-open') openRoom();
    else if (m === 'room-send') roomSend();
    else if (m === 'chat-open') openChat(S.g);
    else if (m === 'chat-send') chatSend();
    else if (m === 'tg') {
      if (!S.g.oppTg) return C.toast(t().noTg);
      const u = 'https://t.me/' + S.g.oppTg;
      if (tg?.openTelegramLink) tg.openTelegramLink(u); else window.open(u, '_blank');
    }
    else if (m === 'copy') { navigator.clipboard?.writeText(b.dataset.v).then(() => C.toast(t().copied)).catch(() => {}); }
    else if (m === 'zoom') zoom(b.src);
  }

  return {
    T,
    init(ctx) { C = ctx; },
    // league.js dagi bosishlardan: m-result | m-actions | m-bad | m-proof
    act(a, gid) {
      const g = C.game(gid);
      if (!g) return;
      if (a === 'm-result') openResult(g);
      else if (a === 'm-actions') openActions(g);
      else if (a === 'm-bad') openDispute(g, 'dispute');
      else if (a === 'm-proof') openDispute(g, 'proof');
    },
    openSupport(league) { openChat(null, true, league || ''); },
    openMatchChat(gid) { const g = C.game(gid); if (g) openChat(g); },
    close,
  };
})();
