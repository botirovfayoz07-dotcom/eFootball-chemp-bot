window.PrivateView = (() => {
  const tg = window.Telegram?.WebApp;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const T = {
    uz: {
      sections: "Bo'limlar", refresh: 'Yangilash', title: 'Norasmiy turnirlar', informal: 'NORASMIY TURNIR',
      subtitle: "Do'stlar bilan o'z turniringizni tuzing — qur'a, jadval va natijalar bir joyda.",
      tournaments: 'Turnirlar', newTournament: '+ Yangi turnir', createTitle: 'Yangi norasmiy turnir',
      name: 'Turnir nomi', namePh: 'Masalan: YCHL 2026', size: 'Ishtirokchilar soni', create: 'Yaratish', cancel: 'Bekor qilish',
      empty: "Hozircha norasmiy turnirlar yo'q", emptySub: 'Birinchi turnirni siz yarating — bir necha soniyada.',
      open: 'Ochish', manage: 'Boshqarish', you: 'Siz', adminHint: "Global admin sifatida istalgan turnirni boshqarishingiz mumkin.",
      table: 'Jadval', matches: "O'yinlar", players: 'Ishtirokchilar', admin: 'Admin panel', adminShort: 'Admin',
      liveShort: 'Jonli', pendingShort: 'Kutilmoqda', gamesShort: "o'yin",
      all: 'Barchasi', mine: "Mening o'yinlarim", round: 'tur', noTime: 'Vaqt belgilanmagan',
      submit: 'Natija kiritish', confirm: 'Tasdiqlash', dispute: "Yolg'on", waiting: "Raqib tasdig'i kutilmoqda",
      canceled: 'Hisob bekor qilindi — admin kiritadi', byAdmin: 'Admin tasdiqladi',
      results: 'Natijalar', drawTimes: "Qur'a va vaqtlar", settings: 'Sozlamalar', enterScore: 'Hisob kiritish', reject: 'Rad etish',
      pendingResults: 'Tasdiqlash kutayotgan natijalar', noPending: "Hozircha tasdiqlash kutayotgan natija yo'q.",
      drawTitle: "Qur'a tashlash", drawHint: "Barcha ishtirokchilar bir-biri bilan bir marta o'ynaydi. Har bir turga vaqt beriladi, keyin qo'lda o'zgartirish mumkin.",
      startAt: 'Boshlanish vaqti', interval: 'Turlar orasidagi daqiqa', draw: "Qur'a tashlash", redraw: "Qayta qur'a tashlash",
      redrawWarn: "Diqqat: qayta qur'a barcha o'yinlar va tasdiqlangan natijalarni o'chiradi. Davom etasizmi?",
      hasMatches: "Qur'a allaqachon tashlangan. Vaqtlarni quyida o'zgartiring yoki qayta qur'a tashlang.",
      notEnough: 'Kamida 2 ishtirokchi kerak.', times: "O'yin vaqtlari", save: 'Saqlash',
      addMatch: "Qo'lda o'yin qo'shish", home: 'Uy', away: 'Mehmon', addMatchBtn: "O'yin qo'shish",
      addPlayer: "Ishtirokchi qo'shish", playerQuery: '@username yoki Telegram ID', playerName: 'Ism (ixtiyoriy)',
      club: 'Klub (ixtiyoriy)', add: "Qo'shish", addHint: "Foydalanuvchi botni ishga tushirmagan bo'lsa, ismni qo'lda yozing.",
      lateJoinHint: "Qur'a tashlanganidan keyin qo'shilsa, uning o'yinlarini «Qo'lda o'yin qo'shish» orqali yarating.",
      noPlayers: "Hali ishtirokchi yo'q.", noMatches: "Hali o'yinlar yo'q. Admin panelda qur'a tashlang.",
      noConfirmed: "Tasdiqlangan natijalar yo'q. Birinchi o'yindan keyin jadval to'ladi.",
      remove: "O'yindan chiqarish", removeAsk: "Ishtirokchi va u bilan bog'liq barcha o'yinlar o'chiriladi. Davom etasizmi?",
      finish: 'Turnirni tugatish', reopen: 'Qayta ochish', finishAsk: 'Turnirni tugatasizmi? Yangi natijalar qabul qilinmaydi.',
      saveName: 'Nomni saqlash', status: 'Holat', created: 'Turnir yaratildi ✅', added: "Qo'shildi ✅", removed: 'Chiqarildi',
      submitted: 'Natija yuborildi ✅', confirmed: 'Tasdiqlandi ✅', disputed: 'Hisob bekor qilindi',
      drawn: "Qur'a tashlandi ✅", saved: 'Saqlandi ✅', deleted: "O'yin o'chirildi", resultTitle: 'Natija kiritish',
      adminResultTitle: 'Admin natijasi', score: 'Hisob', send: 'Yuborish', close: 'Yopish',
      submitHint: "Raqib tasdiqlasa, hisob avtomatik jadvalga tushadi. Tasdiqlamasa — bekor bo'ladi va admin kiritadi.",
      adminResultHint: 'Admin natijasi darhol jadvalga tushadi.',
      confirmAsk: "Raqibingiz kiritgan hisobni tasdiqlaysizmi? Tasdiqlansa, u jadvalga tushadi.",
      disputeAsk: "Raqibingiz kiritgan hisobni rad etasizmi? Hisob bekor qilinadi va uni admin kiritadi.",
      adminConfirmAsk: 'Bu natijani tasdiqlaysizmi? Hisob jadvalga tushadi.',
      adminRejectAsk: "Natijani bekor qilasizmi? Hisob jadvaldan olib tashlanadi va qayta kiritish kerak bo'ladi.",
      noPlayersAdmin: "Avval ishtirokchilar qo'shing.", noMatchesAdmin: "Avval qur'a tashlang yoki qo'lda o'yin qo'shing.",
      login: 'Ilovani Telegram orqali oching.', retry: 'Qayta urinish',
      colPlayer: 'Ishtirokchi', colPlayed: "O'yn", colPts: 'Ochko',
    },
    en: {
      sections: 'Sections', refresh: 'Refresh', title: 'Informal tournaments', informal: 'INFORMAL TOURNAMENT',
      subtitle: 'Run your own tournament with friends — draw, table and results in one place.',
      tournaments: 'Tournaments', newTournament: '+ New tournament', createTitle: 'New informal tournament',
      name: 'Tournament name', namePh: 'e.g. YCHL 2026', size: 'Number of players', create: 'Create', cancel: 'Cancel',
      empty: 'No informal tournaments yet', emptySub: 'Create the first one — it takes seconds.',
      open: 'Open', manage: 'Manage', you: 'You', adminHint: 'As a global admin you can manage any tournament.',
      table: 'Table', matches: 'Matches', players: 'Players', admin: 'Admin panel', adminShort: 'Admin',
      liveShort: 'Live', pendingShort: 'Pending', gamesShort: 'matches',
      all: 'All', mine: 'My matches', round: 'round', noTime: 'Time not set',
      submit: 'Enter result', confirm: 'Confirm', dispute: 'False', waiting: 'Waiting for opponent to confirm',
      canceled: 'Result canceled — admin will enter it', byAdmin: 'Confirmed by admin',
      results: 'Results', drawTimes: 'Draw & times', settings: 'Settings', enterScore: 'Enter score', reject: 'Reject',
      pendingResults: 'Results awaiting confirmation', noPending: 'No results awaiting confirmation right now.',
      drawTitle: 'Draw', drawHint: 'Everyone plays everyone once. Each round gets a time; you can change it later.',
      startAt: 'Start time', interval: 'Minutes between rounds', draw: 'Make draw', redraw: 'Redo draw',
      redrawWarn: 'Warning: redoing the draw deletes all matches and confirmed results. Continue?',
      hasMatches: 'The draw already exists. Edit times below or redo the draw.',
      notEnough: 'At least 2 players are required.', times: 'Match times', save: 'Save',
      addMatch: 'Add match manually', home: 'Home', away: 'Away', addMatchBtn: 'Add match',
      addPlayer: 'Add player', playerQuery: '@username or Telegram ID', playerName: 'Name (optional)',
      club: 'Club (optional)', add: 'Add', addHint: 'If the user has not started the bot, type the name manually.',
      lateJoinHint: 'If added after the draw, create their matches with “Add match manually”.',
      noPlayers: 'No players yet.', noMatches: 'No matches yet. Make a draw in the admin panel.',
      noConfirmed: 'No confirmed results yet. The table fills after the first match.',
      remove: 'Remove from tournament', removeAsk: 'The player and all related matches will be deleted. Continue?',
      finish: 'Finish tournament', reopen: 'Reopen', finishAsk: 'Finish the tournament? New results will not be accepted.',
      saveName: 'Save name', status: 'Status', created: 'Tournament created ✅', added: 'Added ✅', removed: 'Removed',
      submitted: 'Result submitted ✅', confirmed: 'Confirmed ✅', disputed: 'Result canceled',
      drawn: 'Draw completed ✅', saved: 'Saved ✅', deleted: 'Match deleted', resultTitle: 'Enter result',
      adminResultTitle: 'Admin result', score: 'Score', send: 'Send', close: 'Close',
      submitHint: 'If your opponent confirms, the score goes to the table automatically. If not, it is canceled and the admin enters it.',
      adminResultHint: 'The admin result goes to the table immediately.',
      confirmAsk: 'Confirm the score entered by your opponent? It will go to the table.',
      disputeAsk: 'Reject the score entered by your opponent? It will be canceled and entered by the admin.',
      adminConfirmAsk: 'Confirm this result? It will go to the table.',
      adminRejectAsk: 'Cancel this result? It will be removed from the table and must be entered again.',
      noPlayersAdmin: 'Add players first.', noMatchesAdmin: 'Make a draw or add a match manually first.',
      login: 'Open the app through Telegram.', retry: 'Try again',
      colPlayer: 'Player', colPlayed: 'P', colPts: 'Pts',
    },
    ru: {
      sections: 'Разделы', refresh: 'Обновить', title: 'Неофициальные турниры', informal: 'НЕОФИЦИАЛЬНЫЙ ТУРНИР',
      subtitle: 'Свой турнир с друзьями — жеребьёвка, таблица и результаты в одном месте.',
      tournaments: 'Турниры', newTournament: '+ Новый турнир', createTitle: 'Новый неофициальный турнир',
      name: 'Название турнира', namePh: 'Например: YCHL 2026', size: 'Число участников', create: 'Создать', cancel: 'Отмена',
      empty: 'Неофициальных турниров пока нет', emptySub: 'Создайте первый — это займёт секунды.',
      open: 'Открыть', manage: 'Управлять', you: 'Вы', adminHint: 'Как глобальный админ вы можете управлять любым турниром.',
      table: 'Таблица', matches: 'Матчи', players: 'Участники', admin: 'Админ-панель', adminShort: 'Админ',
      liveShort: 'Идёт', pendingShort: 'Ожидает', gamesShort: 'матчей',
      all: 'Все', mine: 'Мои матчи', round: 'тур', noTime: 'Время не задано',
      submit: 'Ввести результат', confirm: 'Подтвердить', dispute: 'Ложь', waiting: 'Ожидает подтверждения соперника',
      canceled: 'Результат отменён — введёт админ', byAdmin: 'Подтверждено админом',
      results: 'Результаты', drawTimes: 'Жеребьёвка и время', settings: 'Настройки', enterScore: 'Ввести счёт', reject: 'Отклонить',
      pendingResults: 'Результаты на подтверждение', noPending: 'Сейчас нет результатов на подтверждение.',
      drawTitle: 'Жеребьёвка', drawHint: 'Каждый играет с каждым один раз. Каждому туру задаётся время, потом его можно изменить.',
      startAt: 'Время начала', interval: 'Минут между турами', draw: 'Провести жеребьёвку', redraw: 'Повторить жеребьёвку',
      redrawWarn: 'Внимание: повторная жеребьёвка удалит все матчи и подтверждённые результаты. Продолжить?',
      hasMatches: 'Жеребьёвка уже есть. Измените время ниже или повторите жеребьёвку.',
      notEnough: 'Нужно минимум 2 участника.', times: 'Время матчей', save: 'Сохранить',
      addMatch: 'Добавить матч вручную', home: 'Дома', away: 'В гостях', addMatchBtn: 'Добавить матч',
      addPlayer: 'Добавить участника', playerQuery: '@username или Telegram ID', playerName: 'Имя (необязательно)',
      club: 'Клуб (необязательно)', add: 'Добавить', addHint: 'Если пользователь не запускал бота, введите имя вручную.',
      lateJoinHint: 'Если участник добавлен после жеребьёвки, создайте его матчи через «Добавить матч вручную».',
      noPlayers: 'Участников пока нет.', noMatches: 'Матчей пока нет. Проведите жеребьёвку в админ-панели.',
      noConfirmed: 'Подтверждённых результатов нет. Таблица заполнится после первого матча.',
      remove: 'Убрать из турнира', removeAsk: 'Участник и все связанные матчи будут удалены. Продолжить?',
      finish: 'Завершить турнир', reopen: 'Открыть снова', finishAsk: 'Завершить турнир? Новые результаты не будут приниматься.',
      saveName: 'Сохранить название', status: 'Статус', created: 'Турнир создан ✅', added: 'Добавлено ✅', removed: 'Удалено',
      submitted: 'Результат отправлен ✅', confirmed: 'Подтверждено ✅', disputed: 'Результат отменён',
      drawn: 'Жеребьёвка проведена ✅', saved: 'Сохранено ✅', deleted: 'Матч удалён', resultTitle: 'Ввод результата',
      adminResultTitle: 'Результат админа', score: 'Счёт', send: 'Отправить', close: 'Закрыть',
      submitHint: 'Если соперник подтвердит, счёт попадёт в таблицу. Если нет — он будет отменён, и счёт введёт админ.',
      adminResultHint: 'Результат админа сразу попадает в таблицу.',
      confirmAsk: 'Подтвердить счёт, введённый соперником? Он попадёт в таблицу.',
      disputeAsk: 'Отклонить счёт соперника? Он будет отменён, и его введёт админ.',
      adminConfirmAsk: 'Подтвердить этот результат? Он попадёт в таблицу.',
      adminRejectAsk: 'Отменить результат? Он будет убран из таблицы, и его нужно ввести заново.',
      noPlayersAdmin: 'Сначала добавьте участников.', noMatchesAdmin: 'Сначала проведите жеребьёвку или добавьте матч.',
      login: 'Откройте приложение через Telegram.', retry: 'Повторить',
      colPlayer: 'Участник', colPlayed: 'И', colPts: 'Очки',
    },
  };

  const ERR = {
    auth: { uz: 'Ilovani Telegram orqali oching.', en: 'Open the app through Telegram.', ru: 'Откройте приложение через Telegram.' },
    network: { uz: "Internet aloqasi yo'q.", en: 'No internet connection.', ru: 'Нет подключения к интернету.' },
    fail: { uz: "Xatolik. Qayta urinib ko'ring.", en: 'Something went wrong. Try again.', ru: 'Ошибка. Попробуйте ещё раз.' },
    not_found: { uz: 'Turnir yoki o‘yin topilmadi.', en: 'Tournament or match not found.', ru: 'Турнир или матч не найден.' },
    full: { uz: "Joylar to'lgan.", en: 'The tournament is full.', ru: 'Мест больше нет.' },
    already: { uz: "Bu ishtirokchi allaqachon qo'shilgan.", en: 'This player has already joined.', ru: 'Этот участник уже добавлен.' },
    user_not_found: { uz: "Foydalanuvchi topilmadi. Ismni qo'lda kiriting.", en: 'User not found. Enter the name manually.', ru: 'Пользователь не найден. Введите имя вручную.' },
    has_matches: { uz: "Avval qur'a tashlangan. Qayta qur'a uchun tasdiqlang.", en: 'A draw already exists. Confirm to redo it.', ru: 'Жеребьёвка уже есть. Подтвердите повтор.' },
    not_enough: { uz: 'Kamida 2 ishtirokchi kerak.', en: 'At least 2 players are required.', ru: 'Нужно минимум 2 участника.' },
    pair_exists: { uz: 'Bu juftlik allaqachon bor.', en: 'This pair already exists.', ru: 'Эта пара уже есть.' },
    confirmed: { uz: 'Natija allaqachon tasdiqlangan.', en: 'The result is already confirmed.', ru: 'Результат уже подтверждён.' },
    pending: { uz: 'Natija tasdiq kutmoqda.', en: 'The result is awaiting confirmation.', ru: 'Результат ожидает подтверждения.' },
    disputed: { uz: "Bu o'yin hisobi bekor qilingan. Uni faqat admin kiritadi.", en: 'This result was canceled. Only the admin can enter it.', ru: 'Этот результат отменён. Его может ввести только админ.' },
    not_pending: { uz: "Tasdiqlash uchun natija yo'q.", en: 'There is no result to confirm.', ru: 'Нет результата для подтверждения.' },
    self_confirm: { uz: "O'z hisobingizni o'zingiz tasdiqlay olmaysiz.", en: 'You cannot confirm your own score.', ru: 'Нельзя подтвердить свой счёт.' },
    finished: { uz: 'Turnir tugagan.', en: 'The tournament is finished.', ru: 'Турнир завершён.' },
    forbidden: { uz: "Ruxsat yo'q.", en: 'Not allowed.', ru: 'Нет доступа.' },
    score: { uz: "Hisob 0–99 oralig'ida butun son bo'lsin.", en: 'Score must be a whole number from 0 to 99.', ru: 'Счёт должен быть целым числом 0–99.' },
    limit: { uz: "Juda ko'p faol turnir.", en: 'Too many active tournaments.', ru: 'Слишком много активных турниров.' },
    name: { uz: "Nom kamida 2 ta belgidan iborat bo'lsin.", en: 'The name must be at least 2 characters.', ru: 'Название должно быть не короче 2 символов.' },
    pair: { uz: "Ishtirokchilarni to'g'ri tanlang.", en: 'Choose the players correctly.', ru: 'Выберите участников правильно.' },
    time: { uz: "Vaqt noto'g'ri.", en: 'Invalid time.', ru: 'Неверное время.' },
    status: { uz: "Holat noto'g'ri.", en: 'Invalid status.', ru: 'Неверный статус.' },
    empty: { uz: "Ma'lumot kiriting.", en: 'Enter the data.', ru: 'Введите данные.' },
  };

  const MST = {
    scheduled: { cls: 'wait', label: { uz: 'Rejalashtirilgan', en: 'Scheduled', ru: 'Запланирован' } },
    pending: { cls: 'pend', label: { uz: 'Tasdiq kutilmoqda', en: 'Awaiting confirmation', ru: 'Ожидает подтверждения' } },
    confirmed: { cls: 'ok', label: { uz: 'Tasdiqlangan', en: 'Confirmed', ru: 'Подтверждён' } },
    disputed: { cls: 'bad', label: { uz: 'Bekor qilindi', en: 'Canceled', ru: 'Отменён' } },
  };
  const TST = {
    draft: { cls: 'draft', label: { uz: 'Qoralama', en: 'Draft', ru: 'Черновик' } },
    live: { cls: 'live', label: { uz: 'Davom etmoqda', en: 'In progress', ru: 'Идёт' } },
    finished: { cls: 'done', label: { uz: 'Tugallangan', en: 'Finished', ru: 'Завершён' } },
  };

  let el = null, lang = 'uz', toast = () => {}, bound = false;
  const S = {
    list: null, listLoading: false, listError: '', listSeq: 0,
    id: null, detail: null, detailLoading: false, detailError: '', seq: 0,
    tab: 'table', adminTab: 'results', filter: 'all',
    creating: false, addOpen: false, modal: null,
  };

  const tx = (k) => (T[lang] && T[lang][k]) || T.uz[k] || k;
  const errText = (code) => (ERR[code] && (ERR[code][lang] || ERR[code].uz)) || (ERR[code] && ERR[code].uz) || tx('fail');
  const labelOf = (obj) => (obj && (obj.label[lang] || obj.label.uz)) || '';
  const api = (path, opts = {}) => fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '', ...(opts.headers || {}) },
  }).then(async (r) => ({ ok: r.ok, status: r.status, ...(await r.json().catch(() => ({}))) }))
    .catch(() => ({ ok: false, error: 'network' }));

  const ask = (msg) => new Promise((resolve) => {
    if (tg?.showConfirm) tg.showConfirm(msg, resolve);
    else resolve(window.confirm(msg));
  });
  const haptic = (type = 'success') => tg?.HapticFeedback?.notificationOccurred?.(type);
  const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (iso) => {
    if (!iso) return tx('noTime');
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return tx('noTime');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const toLocalInput = (iso) => {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const nextHour = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString();
  };
  const toIso = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  function statusBadge(status, kind = 'match') {
    const obj = (kind === 'match' ? MST : TST)[status] || MST.scheduled;
    return `<span class="p-badge ${obj.cls}">${esc(labelOf(obj))}</span>`;
  }
  function playerMap(d) { return new Map((d.players || []).map((p) => [p.id, p])); }
  function pname(p) { return p ? p.name : '—'; }

  // ——— Ro'yxat ———
  function topBar(back) {
    return `<div class="p-top"><button class="p-back" data-act="${back}">← ${esc(tx('sections'))}</button><span class="p-brand">eFOOTBALL</span><button class="p-refresh" data-act="refresh" title="${esc(tx('refresh'))}" aria-label="${esc(tx('refresh'))}">↻</button></div>`;
  }

  function listHtml() {
    if (S.listLoading && !S.list) return shell(skeleton('p-list-skel'));
    if (!S.list && S.listError) return shell(`${topBar('home')}${errorBox(S.listError, 'list')}`);
    const data = S.list || { tournaments: [], admin: false };
    const list = data.tournaments || [];
    const live = list.filter((t) => t.status === 'live').length;
    const pending = list.reduce((n, t) => n + (t.canManage ? (t.pending || 0) : 0), 0);
    const totalMatches = list.reduce((n, t) => n + (t.matches || 0), 0);
    const stats = list.length ? `<div class="p-hero-stats">
      <div><b>${list.length}</b><small>${esc(tx('tournaments'))}</small></div>
      <div><b>${live}</b><small>${esc(tx('liveShort'))}</small></div>
      <div><b>${data.admin ? pending : totalMatches}</b><small>${esc(data.admin ? tx('pendingShort') : tx('gamesShort'))}</small></div>
    </div>` : '';
    return shell(`
      ${topBar('home')}
      <div class="p-hero">
        <span class="p-kicker">⚽ EFOOTBALL</span>
        <h1>${esc(tx('title'))}</h1>
        <p>${esc(tx('subtitle'))}</p>
        ${stats}
      </div>
      <div class="p-list-head">
        <span>${esc(tx('tournaments'))} <i>${list.length}</i></span>
        <button class="p-new" data-act="toggle-create">${esc(tx('newTournament'))}</button>
      </div>
      ${S.creating ? createFormHtml() : ''}
      ${list.length ? list.map(cardHtml).join('') : `<div class="p-empty">
        <span>🎟️</span><b>${esc(tx('empty'))}</b><p>${esc(tx('emptySub'))}</p>
        <button class="p-btn" data-act="toggle-create">${esc(tx('newTournament'))}</button>
      </div>`}
      ${data.admin ? `<div class="p-admin-note"><b>🛡 ${esc(tx('admin'))}</b><span>${esc(tx('adminHint'))}</span></div>` : ''}
    `);
  }

  function createFormHtml() {
    return `<form class="p-form p-create" data-form="create">
      <div class="p-form-title">${esc(tx('createTitle'))}</div>
      <label>${esc(tx('name'))}<input name="name" maxlength="60" required placeholder="${esc(tx('namePh'))}" autocomplete="off"></label>
      <label>${esc(tx('size'))}
        <select name="maxPlayers">
          ${[2, 4, 8, 12, 16, 24, 32].map((n) => `<option value="${n}"${n === 8 ? ' selected' : ''}>${n}</option>`).join('')}
        </select>
      </label>
      <div class="p-form-actions">
        <button class="p-btn" type="submit">${esc(tx('create'))}</button>
        <button class="p-btn ghost" type="button" data-act="toggle-create">${esc(tx('cancel'))}</button>
      </div>
    </form>`;
  }

  function cardHtml(t) {
    return `<article class="p-card">
      <div class="p-card-top">
        ${statusBadge(t.status, 'tour')}
        ${t.canManage ? `<span class="p-owner" title="${esc(tx('manage'))}">🛡</span>` : ''}
        ${t.canManage && t.pending ? `<span class="p-pending">${t.pending}</span>` : ''}
      </div>
      <h3>${esc(t.name)}</h3>
      <div class="p-card-meta">
        <span>👥 ${t.players}/${t.maxPlayers}</span>
        <span>⚽ ${t.matches} ${esc(tx('gamesShort'))}</span>
        ${t.joined ? `<span class="p-mine">${esc(tx('you'))}</span>` : ''}
      </div>
      <div class="p-card-foot">
        <button class="p-btn small" data-act="open" data-id="${esc(t.id)}">${esc(tx('open'))}</button>
        ${t.canManage ? `<button class="p-btn small ghost" data-act="manage" data-id="${esc(t.id)}">⚙ ${esc(tx('manage'))}</button>` : ''}
      </div>
    </article>`;
  }

  // ——— Turnir sahifasi ———
  function detailHtml() {
    const d = S.detail, tr = d.tournament;
    const tabs = [['table', tx('table')], ['matches', tx('matches')], ['players', tx('players')]];
    if (tr.canManage) tabs.push(['admin', '🛡 ' + tx('adminShort')]);
    const active = (!tr.canManage && S.tab === 'admin') ? 'table' : S.tab;
    return shell(`
      ${topBar('list')}
      <div class="p-dhead">
        <div class="p-dtitle">
          <span class="p-kicker">${esc(tx('informal'))}</span>
          <h1>${esc(tr.name)}</h1>
        </div>
        ${statusBadge(tr.status, 'tour')}
      </div>
      <div class="p-dmeta">
        <span>👥 ${d.players.length}/${tr.maxPlayers}</span>
        <span>⚽ ${d.matches.length}</span>
        ${tr.startsAt ? `<span>📅 ${esc(fmt(tr.startsAt))}</span>` : ''}
      </div>
      <div class="p-tabs">${tabs.map(([id, label]) => `<button class="${active === id ? 'on' : ''}" data-tab="${id}">${esc(label)}</button>`).join('')}</div>
      ${active === 'table' ? tableHtml(d) : active === 'matches' ? matchesHtml(d) : active === 'players' ? playersHtml(d) : adminHtml(d)}
      ${modalHtml(d)}
    `);
  }

  function tableHtml(d) {
    if (!d.players.length) return emptyBox('👥', tx('noPlayers'), tx('noPlayersAdmin'));
    const rows = d.table || [];
    const playersWithGames = rows.some((r) => r.played > 0);
    const body = rows.map((r) => `<tr class="${r.playerId === d.me.playerId ? 'me' : ''}${r.pos <= 3 ? ' top' + r.pos : ''}">
      <td class="p-pos">${r.pos}</td>
      <td class="p-cell-player"><div class="p-tname"><span class="p-ava">${esc(initials(r.name))}</span><div><b>${esc(r.name)}</b>${r.username ? `<small>@${esc(r.username)}</small>` : ''}</div></div></td>
      <td>${r.played}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
      <td>${r.gf}</td><td>${r.ga}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="p-pts">${r.pts}</td>
    </tr>`).join('');
    return `<div class="p-table-wrap"><table class="p-table">
      <thead><tr><th>#</th><th class="p-cell-player">${esc(tx('colPlayer'))}</th><th>${esc(tx('colPlayed'))}</th><th>G</th><th>D</th><th>M</th><th>GF</th><th>GA</th><th>±</th><th>${esc(tx('colPts'))}</th></tr></thead>
      <tbody>${body}</tbody></table></div>
      ${playersWithGames ? '' : `<p class="p-under">${esc(tx('noConfirmed'))}</p>`}`;
  }

  function matchesHtml(d) {
    const pm = playerMap(d);
    let list = d.matches || [];
    if (S.filter === 'mine' && d.me.playerId) list = list.filter((m) => m.homeId === d.me.playerId || m.awayId === d.me.playerId);
    const rounds = [];
    list.forEach((m) => {
      const g = rounds.find((x) => x.round === m.round);
      if (g) g.items.push(m); else rounds.push({ round: m.round, items: [m] });
    });
    return `<div class="p-filter">
      <button class="${S.filter === 'all' ? 'on' : ''}" data-filter="all">${esc(tx('all'))}</button>
      <button class="${S.filter === 'mine' ? 'on' : ''}" data-filter="mine">${esc(tx('mine'))}</button>
    </div>
    ${rounds.length ? rounds.map((g) => `<div class="p-round"><span>${g.round}-${esc(tx('round'))}</span><i></i></div>${g.items.map((m) => matchHtml(m, d, pm)).join('')}`).join('') : emptyBox('⚽', tx('noMatches'), tx('noMatchesAdmin'))}`;
  }

  function matchHtml(m, d, pm) {
    const h = pm.get(m.homeId), a = pm.get(m.awayId);
    const me = d.me.playerId;
    const mine = me && (m.homeId === me || m.awayId === me);
    const submitter = !!me && m.submittedById === me;
    const hasScore = m.homeScore !== null && m.homeScore !== undefined && m.awayScore !== null && m.awayScore !== undefined;
    const canPlay = mine && m.status === 'scheduled';
    const canRespond = mine && m.status === 'pending' && !submitter;
    let actions = '';
    if (canPlay) actions += `<button class="p-btn small" data-act="submit" data-mid="${esc(m.id)}">${esc(tx('submit'))}</button>`;
    if (canRespond) {
      actions += `<button class="p-btn small ok" data-act="confirm" data-mid="${esc(m.id)}">✓ ${esc(tx('confirm'))}</button>
        <button class="p-btn small danger" data-act="dispute" data-mid="${esc(m.id)}">✕ ${esc(tx('dispute'))}</button>`;
    }
    if (m.status === 'pending' && submitter) actions += `<span class="p-wait">⏳ ${esc(tx('waiting'))}</span>`;
    if (m.status === 'disputed') actions += `<span class="p-wait bad">❌ ${esc(tx('canceled'))}</span>`;
    if (m.status === 'confirmed' && m.resultSource === 'admin') actions += `<span class="p-byadmin">🛡 ${esc(tx('byAdmin'))}</span>`;
    if (d.tournament.canManage && m.status !== 'confirmed') actions += `<button class="p-btn small ghost" data-act="admin-result" data-mid="${esc(m.id)}">🛡 ${esc(tx('enterScore'))}</button>`;
    return `<article class="p-match ${m.status}">
      <div class="p-match-top"><span>${esc(fmt(m.scheduledAt))}</span>${statusBadge(m.status)}</div>
      <div class="p-scoreline">
        <div class="p-team"><span class="p-ava">${esc(initials(pname(h)))}</span><b>${esc(pname(h))}</b></div>
        <div class="p-score ${m.status === 'disputed' ? 'canceled' : ''}">${hasScore ? `${m.homeScore}<i>:</i>${m.awayScore}` : '<span>—</span>'}</div>
        <div class="p-team away"><span class="p-ava">${esc(initials(pname(a)))}</span><b>${esc(pname(a))}</b></div>
      </div>
      ${actions ? `<div class="p-match-actions">${actions}</div>` : ''}
    </article>`;
  }

  function playersHtml(d) {
    const tr = d.tournament;
    const canAdd = tr.canManage && tr.status !== 'finished' && d.players.length < tr.maxPlayers;
    const add = canAdd ? `<button class="p-add-toggle" data-act="toggle-add">${S.addOpen ? '× ' + esc(tx('cancel')) : '+ ' + esc(tx('addPlayer'))}</button>
      ${S.addOpen ? `<form class="p-form" data-form="add-player">
        <label>${esc(tx('playerQuery'))}<input name="query" maxlength="80" placeholder="@username / 123456789" autocomplete="off"></label>
        <div class="p-form-row"><label>${esc(tx('playerName'))}<input name="name" maxlength="80" autocomplete="off"></label>
        <label>${esc(tx('club'))}<input name="club" maxlength="60" autocomplete="off"></label></div>
        <p class="p-hint">${esc(tx('addHint'))}</p>
        ${d.matches.length ? `<p class="p-hint">${esc(tx('lateJoinHint'))}</p>` : ''}
        <button class="p-btn" type="submit">${esc(tx('add'))}</button>
      </form>` : ''}` : '';
    const rows = d.players.map((p) => `<div class="p-player ${p.isMe ? 'me' : ''}">
      <span class="p-ava big">${esc(initials(p.name))}</span>
      <div class="p-player-info"><b>${esc(p.name)} ${p.isMe ? `<i>${esc(tx('you'))}</i>` : ''}</b>
        <small>${p.username ? '@' + esc(p.username) : (p.club ? esc(p.club) : esc(tx('players')))}${p.username && p.club ? ' · ' + esc(p.club) : ''}</small></div>
      ${tr.canManage ? `<button class="p-remove" data-act="remove-player" data-pid="${esc(p.id)}" title="${esc(tx('remove'))}">✕</button>` : ''}
    </div>`).join('');
    return `${add}<div class="p-players">${rows || emptyBox('👥', tx('noPlayers'), tx('noPlayersAdmin'))}</div>`;
  }

  function adminHtml(d) {
    const pending = d.matches.filter((m) => m.status === 'pending' || m.status === 'disputed');
    return `<div class="p-atabs">
      <button class="${S.adminTab === 'results' ? 'on' : ''}" data-atab="results">${esc(tx('results'))}${pending.length ? `<i>${pending.length}</i>` : ''}</button>
      <button class="${S.adminTab === 'draw' ? 'on' : ''}" data-atab="draw">${esc(tx('drawTimes'))}</button>
      <button class="${S.adminTab === 'settings' ? 'on' : ''}" data-atab="settings">${esc(tx('settings'))}</button>
    </div>
    ${S.adminTab === 'results' ? adminResults(d, pending) : S.adminTab === 'draw' ? adminDraw(d) : adminSettings(d)}
    <div class="p-admin-people">
      <div class="p-section-title"><span>${esc(tx('players'))}</span><i>${d.players.length}/${d.tournament.maxPlayers}</i></div>
      ${playersHtml(d)}
    </div>`;
  }

  function adminResults(d, pending) {
    if (!pending.length) return emptyBox('✅', tx('noPending'), tx('noPending'));
    const pm = playerMap(d);
    return pending.map((m) => {
      const h = pm.get(m.homeId), a = pm.get(m.awayId);
      const submitter = pm.get(m.submittedById);
      const hasScore = m.homeScore !== null && m.awayScore !== null;
      return `<article class="p-result ${m.status}">
        <div class="p-result-head"><b>${esc(pname(h))} — ${esc(pname(a))}</b>${statusBadge(m.status)}</div>
        <div class="p-result-score">${hasScore ? `${m.homeScore}:${m.awayScore}` : '—'}</div>
        <small>${submitter ? `${esc(submitter.name)} · ` : ''}${esc(fmt(m.submittedAt))}</small>
        ${m.status === 'disputed' ? `<p class="p-warn">❌ ${esc(m.disputeReason || tx('canceled'))}</p>` : ''}
        <div class="p-result-actions">
          ${m.status === 'pending' && hasScore ? `<button class="p-btn small ok" data-act="admin-confirm" data-mid="${esc(m.id)}">✓ ${esc(tx('confirm'))}</button>` : ''}
          <button class="p-btn small" data-act="admin-result" data-mid="${esc(m.id)}">${esc(tx('enterScore'))}</button>
          ${m.status === 'pending' ? `<button class="p-btn small danger" data-act="admin-reject" data-mid="${esc(m.id)}">${esc(tx('reject'))}</button>` : ''}
        </div>
      </article>`;
    }).join('');
  }

  function adminDraw(d) {
    if (d.players.length < 2) return emptyBox('👥', tx('notEnough'), tx('noPlayersAdmin'));
    const existing = d.matches.length > 0;
    const form = `<form class="p-form" data-form="draw" data-reset="${existing ? '1' : '0'}">
      <div class="p-form-title">${esc(tx('drawTitle'))}</div>
      <p class="p-hint">${esc(tx('drawHint'))}</p>
      <div class="p-form-row p-draw-row">
        <label>${esc(tx('startAt'))}<input type="datetime-local" name="startAt" value="${esc(toLocalInput(d.tournament.startsAt || nextHour()))}" required></label>
        <label>${esc(tx('interval'))}<select name="intervalMinutes">${[30, 60, 120, 180, 1440].map((n) => `<option value="${n}"${n === 60 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      ${existing ? `<p class="p-warn">${esc(tx('hasMatches'))}</p>` : ''}
      <button class="p-btn ${existing ? 'danger' : ''}" type="submit">${esc(existing ? tx('redraw') : tx('draw'))}</button>
    </form>`;
    const times = existing ? `<div class="p-section-title"><span>${esc(tx('times'))}</span><i>${d.matches.length}</i></div>
      <div class="p-times">${d.matches.map((m) => {
        const pm = playerMap(d), h = pm.get(m.homeId), a = pm.get(m.awayId);
        return `<form class="p-time-row" data-form="time" data-mid="${esc(m.id)}">
          <div class="p-time-name"><b>${esc(pname(h))}</b><span>—</span><b>${esc(pname(a))}</b><small>${m.round}-${esc(tx('round'))}</small></div>
          <input type="datetime-local" name="time" value="${esc(toLocalInput(m.scheduledAt))}">
          <button class="p-btn small ghost" type="submit">${esc(tx('save'))}</button>
          <button class="p-icon danger" type="button" data-act="delete-match" data-mid="${esc(m.id)}" title="${esc(tx('deleted'))}">✕</button>
        </form>`;
      }).join('')}</div>` : '';
    const manual = `<div class="p-section-title"><span>${esc(tx('addMatch'))}</span></div>
      <form class="p-form" data-form="add-match">
        <div class="p-form-row">
          <label>${esc(tx('home'))}<select name="homeId">${d.players.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
          <label>${esc(tx('away'))}<select name="awayId">${d.players.map((p, i) => `<option value="${esc(p.id)}"${i === 1 ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        </div>
        <label>${esc(tx('startAt'))}<input type="datetime-local" name="scheduledAt" value="${esc(toLocalInput(nextHour()))}"></label>
        <button class="p-btn ghost" type="submit">${esc(tx('addMatchBtn'))}</button>
      </form>`;
    return `${form}${times}${manual}`;
  }

  function adminSettings(d) {
    const tr = d.tournament;
    return `<form class="p-form" data-form="settings">
      <div class="p-form-title">${esc(tx('settings'))}</div>
      <label>${esc(tx('name'))}<input name="name" maxlength="60" value="${esc(tr.name)}" required></label>
      <button class="p-btn" type="submit">${esc(tx('saveName'))}</button>
    </form>
    <div class="p-setting-row">
      <div><b>${esc(tx('status'))}</b><span>${statusBadge(tr.status, 'tour')}</span></div>
      ${tr.status === 'finished'
        ? `<button class="p-btn ghost" data-act="reopen">${esc(tx('reopen'))}</button>`
        : `<button class="p-btn danger" data-act="finish">${esc(tx('finish'))}</button>`}
    </div>`;
  }

  function modalHtml(d) {
    if (!S.modal) return '';
    const m = (d.matches || []).find((x) => x.id === S.modal.mid);
    if (!m) return '';
    const pm = playerMap(d), h = pm.get(m.homeId), a = pm.get(m.awayId);
    const admin = S.modal.type === 'admin';
    const hs = m.homeScore !== null && m.homeScore !== undefined ? m.homeScore : '';
    const as = m.awayScore !== null && m.awayScore !== undefined ? m.awayScore : '';
    return `<div class="p-modal">
      <div class="p-sheet">
        <button class="p-close" data-act="close-modal" aria-label="${esc(tx('close'))}">✕</button>
        <div class="p-sheet-title">${esc(admin ? tx('adminResultTitle') : tx('resultTitle'))}</div>
        <div class="p-sheet-teams"><b>${esc(pname(h))}</b><span>—</span><b>${esc(pname(a))}</b></div>
        <form data-form="score">
          <div class="p-score-inputs">
            <label>${esc(pname(h))}<input type="number" name="homeScore" min="0" max="99" inputmode="numeric" value="${hs}" required></label>
            <span class="p-colon">:</span>
            <label>${esc(pname(a))}<input type="number" name="awayScore" min="0" max="99" inputmode="numeric" value="${as}" required></label>
          </div>
          <p class="p-hint">${esc(admin ? tx('adminResultHint') : tx('submitHint'))}</p>
          <button class="p-btn" type="submit">${esc(tx('send'))}</button>
        </form>
      </div>
    </div>`;
  }

  function emptyBox(icon, title, sub) {
    return `<div class="p-empty"><span>${icon}</span><b>${esc(title)}</b>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
  }
  function errorBox(code, kind) {
    return `<div class="p-error"><span>⚠️</span><b>${esc(errText(code))}</b><button class="p-btn small ghost" data-act="retry" data-kind="${kind}">${esc(tx('retry'))}</button></div>`;
  }
  function skeleton(extra = '') {
    return `<div class="p-skel ${extra}"><i></i><i></i><i></i></div>`;
  }
  function shell(inner) { return `<div class="page p-page">${inner}</div>`; }

  // ——— Yuklash ———
  async function loadList(silent = false) {
    const seq = ++S.listSeq;
    if (!silent) { S.listLoading = true; S.listError = ''; render(); }
    const r = await api('/api/private');
    if (seq !== S.listSeq) return;
    S.listLoading = false;
    if (!r.ok) {
      if (!silent) S.listError = r.error || 'fail';
      else toast(errText(r.error || 'fail'));
      render(); return;
    }
    S.list = r; S.listError = ''; render();
  }

  async function loadDetail(id, silent = false) {
    const seq = ++S.seq;
    if (!silent) { S.detailLoading = true; S.detailError = ''; render(); }
    const r = await api('/api/private/' + encodeURIComponent(id));
    if (seq !== S.seq || S.id !== id) return;
    S.detailLoading = false;
    if (!r.ok) {
      if (!silent) { S.detailError = r.error || 'fail'; S.detail = null; render(); }
      else toast(errText(r.error || 'fail'));
      return;
    }
    S.detail = r; S.detailError = '';
    if (!S.detail.tournament.canManage && S.tab === 'admin') S.tab = 'table';
    render();
  }

  function refresh() {
    if (S.id) return loadDetail(S.id, true);
    return loadList(true);
  }

  // ——— Render ———
  function render() {
    if (!el) return;
    if (S.id) {
      if (S.detailLoading && !S.detail) { el.innerHTML = shell(skeleton('p-detail-skel')); return; }
      if (!S.detail && S.detailError) {
        el.innerHTML = shell(`${topBar('list')}${errorBox(S.detailError, 'detail')}`);
        return;
      }
      if (!S.detail) { el.innerHTML = shell(skeleton('p-detail-skel')); return; }
      el.innerHTML = detailHtml(); return;
    }
    el.innerHTML = listHtml();
  }

  // ——— Amallar ———
  async function confirmMatch(mid) {
    if (!await ask(tx('confirmAsk'))) return;
    const r = await api(`/api/private/${S.id}/matches/${mid}/confirm`, { method: 'POST', body: '{}' });
    if (!r.ok) return toast(errText(r.error));
    haptic(); toast(tx('confirmed')); await refresh();
  }

  async function disputeMatch(mid) {
    if (!await ask(tx('disputeAsk'))) return;
    const r = await api(`/api/private/${S.id}/matches/${mid}/dispute`, { method: 'POST', body: '{}' });
    if (!r.ok) return toast(errText(r.error));
    haptic('warning'); toast(tx('disputed')); await refresh();
  }

  async function adminConfirm(mid) {
    const m = S.detail?.matches.find((x) => x.id === mid);
    if (!m || m.homeScore === null || m.awayScore === null) return;
    if (!await ask(tx('adminConfirmAsk'))) return;
    const r = await api(`/api/private/${S.id}/matches/${mid}/admin-result`, {
      method: 'POST', body: JSON.stringify({ homeScore: m.homeScore, awayScore: m.awayScore }),
    });
    if (!r.ok) return toast(errText(r.error));
    haptic(); toast(tx('confirmed')); await refresh();
  }

  async function adminReject(mid) {
    if (!await ask(tx('adminRejectAsk'))) return;
    const r = await api(`/api/private/${S.id}/matches/${mid}/admin-reject`, { method: 'POST', body: '{}' });
    if (!r.ok) return toast(errText(r.error));
    haptic('warning'); toast(tx('disputed')); await refresh();
  }

  async function removePlayer(pid) {
    if (!await ask(tx('removeAsk'))) return;
    const r = await api(`/api/private/${S.id}/players/${pid}`, { method: 'DELETE' });
    if (!r.ok) return toast(errText(r.error));
    haptic(); toast(`${tx('removed')}${r.removedMatches ? ` · ${r.removedMatches} ⚽` : ''}`);
    await refresh();
  }

  async function deleteMatch(mid) {
    if (!await ask(tx('deleted') + '?')) return;
    const r = await api(`/api/private/${S.id}/matches/${mid}`, { method: 'DELETE' });
    if (!r.ok) return toast(errText(r.error));
    toast(tx('deleted')); await refresh();
  }

  async function setStatus(status) {
    if (status === 'finished' && !await ask(tx('finishAsk'))) return;
    const r = await api(`/api/private/${S.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (!r.ok) return toast(errText(r.error));
    haptic(); toast(tx('saved')); await refresh();
  }

  function closeModal() { S.modal = null; render(); }
  function openModal(type, mid) {
    const m = S.detail?.matches.find((x) => x.id === mid);
    if (!m) return;
    S.modal = { type, mid };
    render();
  }

  // ——— Hodisalar ———
  function onClick(e) {
    const overlay = e.target.closest('.p-modal');
    if (overlay && !e.target.closest('.p-sheet')) { closeModal(); return; }
    const tabEl = e.target.closest('[data-tab]');
    if (tabEl) {
      S.tab = tabEl.dataset.tab; S.modal = null;
      if (S.id) history.replaceState(null, '', `#private/${S.id}/${S.tab}`);
      window.scrollTo(0, 0); render(); return;
    }
    const atabEl = e.target.closest('[data-atab]');
    if (atabEl) { S.adminTab = atabEl.dataset.atab; render(); return; }
    const filterEl = e.target.closest('[data-filter]');
    if (filterEl) { S.filter = filterEl.dataset.filter; render(); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'home') { location.hash = ''; return; }
    if (act === 'list') { location.hash = '#private'; return; }
    if (act === 'refresh') { tg?.HapticFeedback?.selectionChanged?.(); refresh(); return; }
    if (act === 'open') { location.hash = '#private/' + a.dataset.id; return; }
    if (act === 'manage') { location.hash = '#private/' + a.dataset.id + '/admin'; return; }
    if (act === 'toggle-create') { S.creating = !S.creating; render(); return; }
    if (act === 'toggle-add') { S.addOpen = !S.addOpen; render(); return; }
    if (act === 'submit') { openModal('submit', a.dataset.mid); return; }
    if (act === 'admin-result') { openModal('admin', a.dataset.mid); return; }
    if (act === 'confirm') { confirmMatch(a.dataset.mid); return; }
    if (act === 'dispute') { disputeMatch(a.dataset.mid); return; }
    if (act === 'admin-confirm') { adminConfirm(a.dataset.mid); return; }
    if (act === 'admin-reject') { adminReject(a.dataset.mid); return; }
    if (act === 'remove-player') { removePlayer(a.dataset.pid); return; }
    if (act === 'delete-match') { deleteMatch(a.dataset.mid); return; }
    if (act === 'finish') { setStatus('finished'); return; }
    if (act === 'reopen') { setStatus('live'); return; }
    if (act === 'close-modal') { closeModal(); return; }
    if (act === 'retry') {
      if (a.dataset.kind === 'detail') loadDetail(S.id); else loadList();
      return;
    }
  }

  async function onSubmit(e) {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const btn = f.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    const fd = new FormData(f);
    const form = f.dataset.form;
    try {
      if (form === 'create') {
        const name = String(fd.get('name') || '').trim();
        const r = await api('/api/private', { method: 'POST', body: JSON.stringify({ name, maxPlayers: Number(fd.get('maxPlayers') || 8) }) });
        if (!r.ok) return toast(errText(r.error));
        haptic(); toast(tx('created')); S.creating = false;
        location.hash = '#private/' + r.id; return;
      }
      if (form === 'add-player') {
        const body = { query: String(fd.get('query') || '').trim(), name: String(fd.get('name') || '').trim(), club: String(fd.get('club') || '').trim() };
        const r = await api(`/api/private/${S.id}/players`, { method: 'POST', body: JSON.stringify(body) });
        if (!r.ok) return toast(errText(r.error));
        haptic(); toast(tx('added')); f.reset(); await refresh(); return;
      }
      if (form === 'score') {
        const mode = S.modal?.type, mid = S.modal?.mid;
        if (!mode || !mid) return;
        const body = { homeScore: Number(fd.get('homeScore')), awayScore: Number(fd.get('awayScore')) };
        const path = mode === 'admin' ? 'admin-result' : 'submit';
        const r = await api(`/api/private/${S.id}/matches/${mid}/${path}`, { method: 'POST', body: JSON.stringify(body) });
        if (!r.ok) return toast(errText(r.error));
        haptic(); toast(mode === 'admin' ? tx('confirmed') : tx('submitted'));
        S.modal = null; await refresh(); return;
      }
      if (form === 'draw') {
        const reset = f.dataset.reset === '1';
        if (reset && !await ask(tx('redrawWarn'))) return;
        const startAt = toIso(fd.get('startAt'));
        if (!startAt) return toast(errText('time'));
        const r = await api(`/api/private/${S.id}/draw`, {
          method: 'POST',
          body: JSON.stringify({ startAt, intervalMinutes: Number(fd.get('intervalMinutes') || 60), reset }),
        });
        if (!r.ok) return toast(errText(r.error));
        haptic(); toast(`${tx('drawn')} · ${r.matches} ⚽`); await refresh(); return;
      }
      if (form === 'time') {
        const raw = fd.get('time');
        const scheduledAt = toIso(raw);
        if (raw && !scheduledAt) return toast(errText('time'));
        const r = await api(`/api/private/${S.id}/matches/${f.dataset.mid}`, {
          method: 'PATCH', body: JSON.stringify({ scheduledAt }),
        });
        if (!r.ok) return toast(errText(r.error));
        toast(tx('saved')); await refresh(); return;
      }
      if (form === 'add-match') {
        const r = await api(`/api/private/${S.id}/matches`, {
          method: 'POST',
          body: JSON.stringify({
            homeId: fd.get('homeId'), awayId: fd.get('awayId'),
            scheduledAt: toIso(fd.get('scheduledAt')),
          }),
        });
        if (!r.ok) return toast(errText(r.error));
        haptic(); toast(tx('added')); await refresh(); return;
      }
      if (form === 'settings') {
        const r = await api(`/api/private/${S.id}`, { method: 'PATCH', body: JSON.stringify({ name: String(fd.get('name') || '').trim() }) });
        if (!r.ok) return toast(errText(r.error));
        haptic(); toast(tx('saved')); await refresh(); return;
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bind() {
    if (bound || !el) return;
    bound = true;
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);
  }

  // ——— Tashqi API ———
  function show(root, l, toastFn, id, tab) {
    el = root; lang = l; toast = toastFn; bind();
    const valid = ['table', 'matches', 'players', 'admin'];
    if (id) {
      const nextTab = valid.includes(tab) ? tab : 'table';
      if (S.id !== id) {
        S.id = id; S.detail = null; S.detailError = ''; S.tab = nextTab; S.adminTab = 'results';
        S.filter = 'all'; S.modal = null; S.addOpen = false;
        window.scrollTo(0, 0);
        loadDetail(id);
      } else {
        if (tab && valid.includes(tab) && S.tab !== tab) S.tab = tab;
        if (S.detail?.tournament?.canManage === false && S.tab === 'admin') S.tab = 'table';
        render();
      }
    } else {
      if (S.id) {
        S.id = null; S.detail = null; S.detailError = ''; S.tab = 'table'; S.modal = null;
        S.addOpen = false; S.adminTab = 'results'; window.scrollTo(0, 0);
      }
      if (!S.list && !S.listLoading) loadList(); else render();
    }
  }

  function leave() {
    S.id = null; S.detail = null; S.detailError = ''; S.list = null; S.listLoading = false;
    S.listError = ''; S.modal = null; S.tab = 'table'; S.adminTab = 'results'; S.filter = 'all';
    S.creating = false; S.addOpen = false;
  }

  function back() {
    if (S.modal) { closeModal(); return true; }
    if (S.id) { location.hash = '#private'; return true; }
    location.hash = '';
    return true;
  }

  return { show, leave, back };
})();
