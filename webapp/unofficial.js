// Norasmiy turnirlar: tuzish, qo'shilish, jadval, setka, joriy tur, to'p urarlar, sovrinlar, tashkilotchi paneli
window.UnofficialView = (() => {
  const T = {
    uz: { heroTitle: "O'z turniringizni o'tkazing", heroSub: "Do'stlaringizni taklif qiling — jadval, play-off va chempion avtomatik aniqlanadi.", create: '+ Turnir tuzish', myTitle: 'Mening turnirlarim', none: "Hali turnir yo'q", codeTitle: 'Kod bo\'yicha qo\'shilish', codePh: 'Taklif kodi', go: 'Ochish', notFound: 'Turnir topilmadi', back: 'Ortga', owner: 'Tashkilotchi',
      st: { open: "Qabul ochiq", league: 'Davom etmoqda', playoff: 'Play-off', finished: 'Yakunlangan' }, pl: "O'yinchilar", place: "O'rin", rounds: 'Turlar', round: 'Tur', deadline: 'Tur muddati', yourMatch: "Sizning o'yiningiz", allMatches: "Barcha o'yinlarim", noMatch: "Hozircha o'yin yo'q",
      nav: ['Asosiy', 'Reyting', 'Profil', 'Sovrinlar', 'Boshqaruv'], tabs: ['Jadval', 'Setka', 'Joriy tur', "To'p urarlar"], player: "O'yinchi", goals: 'Gol', bracketEmpty: "Juftliklar jadval bosqichidan keyin chiqadi", champion: "G'olib", final: 'Final', semi: 'Yarim final', quarter: 'Chorak final', empty: "Hozircha o'yinchi yo'q",
      fName: 'Turnir nomi', fMax: "O'yinchilar soni", fRounds: 'Liga turlari soni', fPlayoff: 'Play-off', fNone: "Yo'q (faqat liga)", fTop: (n) => `Eng yaxshi ${n} ta`, fDays: 'Bir tur davomiyligi', days: (n) => `${n} kun`, submit: 'Tuzish', limit: "Bir vaqtda 3 tadan ortiq faol turnir tuza olmaysiz",
      join: "Qo'shilish", teamPh: 'Jamoa nomi (ixtiyoriy)', leave: 'Chiqish', joined: "Siz ishtirokchisiz", waitDraw: 'Qura kutilmoqda', drawAt: 'Qura vaqti', full: "Turnir to'lgan", started: 'Turnir allaqachon boshlangan', already: "Siz allaqachon ro'yxatdasiz", joinedOk: "Qo'shildingiz ✅",
      invite: 'Taklif', share: 'Ulashish', copy: 'Havolani nusxalash', copied: 'Nusxalandi ✅', code: 'Kod',
      report: 'Natija', edit: "Hisobni o'zgartirish", me: 'Men', opp: 'Raqib', send: 'Yuborish', waiting: 'Raqib tasdiqlashini kutmoqda', theirs: 'Raqib kiritgan hisob', ok: 'Tasdiqlash', fake: "Yolg'on", disputed: 'Hisob bekor qilindi — natijani tashkilotchi/admin kiritadi', big: "Katta hisob — tashkilotchi/admin tasdig'ini kutmoqda", chat: 'Chat',
      sent: 'Hisob yuborildi, raqib tasdiqlashi kerak ✅', confirmed: "Tasdiqlandi — natija jadvalga o'tdi ✅", rejected: 'Hisob bekor qilindi, tashkilotchi/admin kiritadi', badScore: "Hisobni to'g'ri kiriting (0–99)", noDraw: "Play-offda durang bo'lmaydi", gone: "O'yin holati o'zgargan", fail: "Xatolik, qayta urinib ko'ring", confirmFake: "Hisobni yolg'on deb belgilaysizmi? U bekor bo'ladi.", review: "Hisob yuborildi — katta hisob, tashkilotchi/admin tasdiqlaydi",
      sendRoom: 'Xona ID sini yuborish', roomPh: 'Xona ID', msgOpp: 'Raqibga yozish', roomSent: 'Xona ID yuborildi ✅', noUser: "Bu foydalanuvchida username yo'q",
      qTitle: 'Savol yoki nizo?', qText: "Raqib bilan kelisha olmasangiz yoki savol bo'lsa — tashkilotchiga yozing, u va adminlar javob beradi.", msgOrg: 'Tashkilotchiga yozish',
      rulesTitle: 'Turnir qoidalari', rules: ["Hisobni o'yin tugagach bitta o'yinchi kiritadi, raqib tasdiqlaydi.", "Raqib «Yolg'on» ni bossa — hisob bekor bo'ladi va tashkilotchi/admin kiritadi.", "Biror tomon 6 va undan ko'p gol urgan bo'lsa — hisobni tashkilotchi/admin tasdiqlaydi.", "Play-offda durang bo'lmaydi.", 'Tur muddati — har bir tur oxirgi kuni 23:59.'],
      boot: "Oltin butsa", bootSub: "Turnirning eng yaxshi to'p urari", ball: "Oltin to'p", ballSub: 'Liga bosqichi yetakchisi', cup: 'Turnir kubogi', cupSub: "Final g'olibi oladi", goalsN: (n) => `${n} gol`,
      mgr: 'Boshqaruv', mResults: 'Natijalar', fAction: 'Tasdiq kutayotganlar', fSched: 'Kiritilmagan', fConf: 'Tasdiqlangan', mHint: "Hisob tartibi: chapda uy egasi, o'ngda mehmon.", mOk: '✅ Tasdiqlash / kiritish', mChange: "O'zgartirish va saqlash", claimed: 'Bekor qilingan hisob', mNothing: "Hech narsa yo'q",
      mDraw: 'Qura', mDrawTime: 'Qura vaqti', mSave: 'Vaqtni saqlash', mClear: "Vaqtni o'chirish", mDrawNow: '🎲 Hozir qura qilish', mDrawConfirm: "Qurani hozir o'tkazamizmi? Ishtirokchilar aralashtirilib, o'yinlar tuziladi.", mAuto: 'Avtomatik qura', mStartPlayoff: '🏆 Play-offni boshlash', mPlayoffConfirm: "Liga bosqichi yakunlanib, play-off boshlansinmi?", mForce: (n) => `${n} ta o'yin hali tugamagan. Ular bekor qilinib, play-off boshlansinmi?`,
      mPlayers: 'Ishtirokchilar', mRemove: 'Chiqarish', mRemoveConfirm: (n) => `${n} turnirdan chiqarilsinmi? Uning o'yinlari bekor qilinadi.`, mAdd: "Ishtirokchi qo'shish", userPh: '@username yoki Telegram ID', add: "Qo'shish", mAddHint: "Foydalanuvchi botga kamida bir marta /start bosgan bo'lishi kerak.", mDelete: "Turnirni o'chirish", mDeleteConfirm: "Turnir va barcha o'yinlari butunlay o'chiriladi. Davom etasizmi?",
      saved: 'Saqlandi ✅', drawnOk: "Qura o'tkazildi 🎲", playoffOk: 'Play-off boshlandi 🏆', removedOk: 'Chiqarildi', addedOk: "Qo'shildi ✅", deletedOk: "Turnir o'chirildi",
      errs: { few: 'Kamida 2 ishtirokchi kerak', unfinished: "Liga o'yinlari hali tugamagan", locked: "Play-off boshlangan — o'zgartirib bo'lmaydi", nouser: "Foydalanuvchi topilmadi (botga /start bosgan bo'lishi kerak)", forbidden: "Ruxsat yo'q" } },
    en: { heroTitle: 'Run your own tournament', heroSub: 'Invite your friends — table, play-off and champion are handled automatically.', create: '+ Create a tournament', myTitle: 'My tournaments', none: 'No tournaments yet', codeTitle: 'Join by code', codePh: 'Invite code', go: 'Open', notFound: 'Tournament not found', back: 'Back', owner: 'Organizer',
      st: { open: 'Open for sign-up', league: 'In progress', playoff: 'Play-off', finished: 'Finished' }, pl: 'Players', place: 'Place', rounds: 'Rounds', round: 'Round', deadline: 'Round deadline', yourMatch: 'Your match', allMatches: 'All my matches', noMatch: 'No matches yet',
      nav: ['Home', 'Rating', 'Profile', 'Prizes', 'Manage'], tabs: ['Table', 'Bracket', 'Current round', 'Scorers'], player: 'Player', goals: 'Goals', bracketEmpty: 'Pairs will appear after the table stage', champion: 'Champion', final: 'Final', semi: 'Semi-finals', quarter: 'Quarter-finals', empty: 'No players yet',
      fName: 'Tournament name', fMax: 'Number of players', fRounds: 'League rounds', fPlayoff: 'Play-off', fNone: 'None (league only)', fTop: (n) => `Top ${n}`, fDays: 'Days per round', days: (n) => `${n} day${n > 1 ? 's' : ''}`, submit: 'Create', limit: 'You cannot run more than 3 active tournaments at once',
      join: 'Join', teamPh: 'Team name (optional)', leave: 'Leave', joined: 'You are in', waitDraw: 'Waiting for the draw', drawAt: 'Draw time', full: 'Tournament is full', started: 'The tournament has already started', already: 'You are already in', joinedOk: 'You joined ✅',
      invite: 'Invite', share: 'Share', copy: 'Copy link', copied: 'Copied ✅', code: 'Code',
      report: 'Result', edit: 'Change score', me: 'Me', opp: 'Opponent', send: 'Send', waiting: 'Waiting for the opponent to confirm', theirs: 'Score entered by opponent', ok: 'Confirm', fake: 'Fake', disputed: 'Score cancelled — the organizer/admin will enter the result', big: 'Big score — waiting for the organizer/admin', chat: 'Chat',
      sent: 'Score sent, your opponent must confirm ✅', confirmed: 'Confirmed — the result is in the table ✅', rejected: 'Score cancelled, the organizer/admin will enter it', badScore: 'Enter a valid score (0–99)', noDraw: 'No draws in the play-off', gone: 'The match status has changed', fail: 'Error, please try again', confirmFake: 'Mark this score as fake? It will be cancelled.', review: 'Score sent — big score, the organizer/admin will approve it',
      sendRoom: 'Send room ID', roomPh: 'Room ID', msgOpp: 'Message opponent', roomSent: 'Room ID sent ✅', noUser: 'This user has no username',
      qTitle: 'Question or dispute?', qText: "Can't agree with your opponent or have a question — write to the organizer, they and the admins will reply.", msgOrg: 'Message the organizer',
      rulesTitle: 'Tournament rules', rules: ['After the match one player enters the score and the opponent confirms it.', 'If the opponent presses “Fake”, the score is cancelled and the organizer/admin enters it.', 'If a side scores 6 or more, the organizer/admin approves the score.', 'No draws in the play-off.', 'Round deadline is 23:59 on the last day of each round.'],
      boot: 'Golden Boot', bootSub: 'Top scorer of the tournament', ball: 'Golden Ball', ballSub: 'League phase leader', cup: 'Tournament cup', cupSub: 'The final winner takes the cup', goalsN: (n) => `${n} goals`,
      mgr: 'Manage', mResults: 'Results', fAction: 'Awaiting approval', fSched: 'Not entered', fConf: 'Confirmed', mHint: 'Score order: home on the left, away on the right.', mOk: '✅ Confirm / enter', mChange: 'Change and save', claimed: 'Cancelled score', mNothing: 'Nothing here',
      mDraw: 'Draw', mDrawTime: 'Draw time', mSave: 'Save time', mClear: 'Clear time', mDrawNow: '🎲 Draw now', mDrawConfirm: 'Run the draw now? Players are shuffled and matches are created.', mAuto: 'Automatic draw', mStartPlayoff: '🏆 Start play-off', mPlayoffConfirm: 'Finish the league stage and start the play-off?', mForce: (n) => `${n} matches are not finished. Cancel them and start the play-off?`,
      mPlayers: 'Participants', mRemove: 'Remove', mRemoveConfirm: (n) => `Remove ${n} from the tournament? Their matches will be cancelled.`, mAdd: 'Add a participant', userPh: '@username or Telegram ID', add: 'Add', mAddHint: 'The user must have pressed /start in the bot at least once.', mDelete: 'Delete tournament', mDeleteConfirm: 'The tournament and all its matches will be deleted for good. Continue?',
      saved: 'Saved ✅', drawnOk: 'Draw done 🎲', playoffOk: 'Play-off started 🏆', removedOk: 'Removed', addedOk: 'Added ✅', deletedOk: 'Tournament deleted',
      errs: { few: 'At least 2 participants are needed', unfinished: 'League matches are not finished yet', locked: 'The play-off has started — no changes', nouser: 'User not found (they must press /start in the bot)', forbidden: 'No access' } },
    ru: { heroTitle: 'Проведите свой турнир', heroSub: 'Пригласите друзей — таблица, плей-офф и чемпион определяются автоматически.', create: '+ Создать турнир', myTitle: 'Мои турниры', none: 'Турниров пока нет', codeTitle: 'Вход по коду', codePh: 'Код приглашения', go: 'Открыть', notFound: 'Турнир не найден', back: 'Назад', owner: 'Организатор',
      st: { open: 'Набор открыт', league: 'Идёт', playoff: 'Плей-офф', finished: 'Завершён' }, pl: 'Игроки', place: 'Место', rounds: 'Туры', round: 'Тур', deadline: 'Срок тура', yourMatch: 'Ваш матч', allMatches: 'Все мои матчи', noMatch: 'Матчей пока нет',
      nav: ['Главная', 'Рейтинг', 'Профиль', 'Призы', 'Управление'], tabs: ['Таблица', 'Сетка', 'Текущий тур', 'Бомбардиры'], player: 'Игрок', goals: 'Голы', bracketEmpty: 'Пары появятся после этапа таблицы', champion: 'Победитель', final: 'Финал', semi: 'Полуфинал', quarter: 'Четвертьфинал', empty: 'Пока нет игроков',
      fName: 'Название турнира', fMax: 'Число игроков', fRounds: 'Туров в лиге', fPlayoff: 'Плей-офф', fNone: 'Нет (только лига)', fTop: (n) => `Лучшие ${n}`, fDays: 'Дней на тур', days: (n) => `${n} дн.`, submit: 'Создать', limit: 'Нельзя вести больше 3 активных турниров одновременно',
      join: 'Вступить', teamPh: 'Название команды (необязательно)', leave: 'Выйти', joined: 'Вы участвуете', waitDraw: 'Ждём жеребьёвку', drawAt: 'Время жеребьёвки', full: 'Турнир заполнен', started: 'Турнир уже начался', already: 'Вы уже участвуете', joinedOk: 'Вы вступили ✅',
      invite: 'Приглашение', share: 'Поделиться', copy: 'Копировать ссылку', copied: 'Скопировано ✅', code: 'Код',
      report: 'Результат', edit: 'Изменить счёт', me: 'Я', opp: 'Соперник', send: 'Отправить', waiting: 'Ждём подтверждения соперника', theirs: 'Счёт, введённый соперником', ok: 'Подтвердить', fake: 'Ложь', disputed: 'Счёт отменён — результат внесёт организатор/админ', big: 'Большой счёт — ждём организатора/админа', chat: 'Чат',
      sent: 'Счёт отправлен, соперник должен подтвердить ✅', confirmed: 'Подтверждено — результат в таблице ✅', rejected: 'Счёт отменён, его внесёт организатор/админ', badScore: 'Введите корректный счёт (0–99)', noDraw: 'В плей-офф ничьих нет', gone: 'Статус матча изменился', fail: 'Ошибка, попробуйте ещё раз', confirmFake: 'Отметить счёт как ложный? Он будет отменён.', review: 'Счёт отправлен — большой счёт, подтвердит организатор/админ',
      sendRoom: 'Отправить ID комнаты', roomPh: 'ID комнаты', msgOpp: 'Написать сопернику', roomSent: 'ID комнаты отправлен ✅', noUser: 'У пользователя нет username',
      qTitle: 'Вопрос или спор?', qText: 'Не договорились с соперником или есть вопрос — напишите организатору, он и админы ответят.', msgOrg: 'Написать организатору',
      rulesTitle: 'Правила турнира', rules: ['После матча один игрок вводит счёт, соперник подтверждает.', 'Если соперник нажал «Ложь» — счёт отменяется, его вносит организатор/админ.', 'Если одна из сторон забила 6 и более — счёт подтверждает организатор/админ.', 'В плей-офф ничьих нет.', 'Срок тура — 23:59 в последний день тура.'],
      boot: 'Золотая бутса', bootSub: 'Лучший бомбардир турнира', ball: 'Золотой мяч', ballSub: 'Лидер лиги', cup: 'Кубок турнира', cupSub: 'Кубок получает победитель финала', goalsN: (n) => `${n} гол.`,
      mgr: 'Управление', mResults: 'Результаты', fAction: 'Ждут подтверждения', fSched: 'Не введены', fConf: 'Подтверждённые', mHint: 'Порядок счёта: слева хозяин, справа гость.', mOk: '✅ Подтвердить / внести', mChange: 'Изменить и сохранить', claimed: 'Отменённый счёт', mNothing: 'Ничего нет',
      mDraw: 'Жеребьёвка', mDrawTime: 'Время жеребьёвки', mSave: 'Сохранить время', mClear: 'Убрать время', mDrawNow: '🎲 Провести сейчас', mDrawConfirm: 'Провести жеребьёвку сейчас? Игроки будут перемешаны, матчи созданы.', mAuto: 'Автожеребьёвка', mStartPlayoff: '🏆 Начать плей-офф', mPlayoffConfirm: 'Завершить лигу и начать плей-офф?', mForce: (n) => `${n} матчей не завершены. Отменить их и начать плей-офф?`,
      mPlayers: 'Участники', mRemove: 'Исключить', mRemoveConfirm: (n) => `Исключить ${n} из турнира? Его матчи будут отменены.`, mAdd: 'Добавить участника', userPh: '@username или Telegram ID', add: 'Добавить', mAddHint: 'Пользователь должен хотя бы раз нажать /start в боте.', mDelete: 'Удалить турнир', mDeleteConfirm: 'Турнир и все его матчи будут удалены навсегда. Продолжить?',
      saved: 'Сохранено ✅', drawnOk: 'Жеребьёвка проведена 🎲', playoffOk: 'Плей-офф начался 🏆', removedOk: 'Исключён', addedOk: 'Добавлен ✅', deletedOk: 'Турнир удалён',
      errs: { few: 'Нужно минимум 2 участника', unfinished: 'Матчи лиги ещё не завершены', locked: 'Плей-офф начался — менять нельзя', nouser: 'Пользователь не найден (ему нужно нажать /start в боте)', forbidden: 'Нет доступа' } },
  };
  const tg = window.Telegram?.WebApp;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-init-data': tg?.initData || '' } }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
  const fmt = (d) => { const x = new Date(d), p = (n) => String(n).padStart(2, '0'); return `${p(x.getDate())}.${p(x.getMonth() + 1)} ${p(x.getHours())}:${p(x.getMinutes())}`; };
  const local = (d) => { const x = new Date(d), p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; };

  let el, lang = 'uz', toast, view = 'list', tid = null, S = null, list = null, tab = 'home', rtab = 'table', panel = null, mfilter = 'action', mlist = null;
  const t = () => T[lang];
  const nm = (p) => esc(p.team || p.user), sub = (p) => (p.team ? `<small>${esc(p.user)}</small>` : '');

  const stBadge = (s) => `<span class="ut-st ${s}">${esc(t().st[s])}</span>`;
  const errMsg = (r, extra) => t()[r.error] || t().errs[r.error] || extra || t().fail;

  // ——— Ro'yxat ———
  function listHtml() {
    const x = t();
    const cards = (list || []).map((c) => `<button class="g-card ut-card" data-act="open" data-tid="${c.id}"><span><b>${esc(c.name)}</b><small>${c.players}/${c.max} ${esc(x.pl.toLowerCase())}${c.owner ? ' · ' + esc(x.owner) : ''}</small></span>${stBadge(c.status)}</button>`).join('');
    return `<div class="page l-page"><button class="back" data-act="back"><span>‹</span> ${x.back}</button>
      <div class="ut-hero"><h2>${esc(x.heroTitle)}</h2><p>${esc(x.heroSub)}</p><button class="l-reg" data-act="new">${esc(x.create)}</button></div>
      <div class="g-label"><span>${x.codeTitle}</span></div>
      <div class="ut-row"><input type="text" id="utCode" placeholder="${esc(x.codePh)}" maxlength="12"><button class="gm-btn" data-act="code">${x.go}</button></div>
      <div class="g-label"><span>${x.myTitle}</span></div>
      ${list === null ? '' : cards || `<div class="pf-empty"><span>🏆</span><p>${x.none}</p></div>`}</div>`;
  }
  function createHtml() {
    const x = t(), sel = (id, opts, def) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${v === def ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    return `<div class="page l-page"><button class="back" data-act="back"><span>‹</span> ${x.back}</button>
      <div class="g-card ut-form"><label>${x.fName}<input type="text" id="cfName" maxlength="40"></label>
      <label>${x.fMax}${sel('cfMax', [4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 48, 64].map((n) => [n, n]), 16)}</label>
      <label>${x.fRounds}${sel('cfRounds', Array.from({ length: 14 }, (_, i) => [i + 3, i + 3]), 8)}</label>
      <label>${x.fPlayoff}${sel('cfPlayoff', [[0, x.fNone], ...[4, 8, 16].map((n) => [n, x.fTop(n)])], 0)}</label>
      <label>${x.fDays}${sel('cfDays', [1, 2, 3, 5, 7].map((n) => [n, x.days(n)]), 1)}</label>
      <button class="l-reg" data-act="mk">${x.submit}</button></div></div>`;
  }

  // ——— O'yin kartasi ———
  function matchHtml(m) {
    const x = t(), me = S.me.id, mine = m.home.id === me || m.away.id === me, byMe = m.reportedBy === me;
    const score = m.hg != null ? `${m.hg} : ${m.ag}` : '– : –', btn = (act, label, cls = '') => `<button class="gm-btn ${cls}" data-act="${act}" data-mid="${m.id}">${label}</button>`;
    let acts = '', note = '';
    if (m.status === 'review') note = `<p class="gm-note">⚠️ ${x.big}</p>`;
    else if (m.status === 'disputed') note = `<p class="gm-note bad">⚠️ ${x.disputed}</p>`;
    else if (mine && m.status === 'scheduled') acts = `${btn('g-open', x.report)}${btn('g-chat', '💬', 'ghost')}`;
    else if (mine && m.status === 'pending' && byMe) { note = `<p class="gm-note">⏳ ${x.waiting}</p>`; acts = `${btn('g-open', x.edit, 'ghost')}${btn('g-chat', '💬', 'ghost')}`; }
    else if (mine && m.status === 'pending') { note = `<p class="gm-note">${x.theirs}</p>`; acts = `${btn('g-ok', '✅ ' + x.ok, 'ok')}${btn('g-bad', '❌ ' + x.fake, 'bad')}`; }
    const form = panel?.id === m.id && panel.kind === 'result' ? `<div class="gm-form" data-box="${m.id}"><label>${x.me}<input type="number" inputmode="numeric" min="0" max="99" data-in="my"></label><b>:</b><label>${x.opp}<input type="number" inputmode="numeric" min="0" max="99" data-in="opp"></label>${btn('g-send', x.send, 'ok')}</div>` : '';
    const opp = m.home.id === me ? m.away : m.home;
    const chat = panel?.id === m.id && panel.kind === 'chat' ? `<div class="gm-form" data-box="${m.id}"><label>${x.roomPh}<input type="text" maxlength="24" data-in="room"></label>${btn('g-room', x.sendRoom, 'ok')}</div><button class="gm-btn ghost" data-act="dm" data-un="${esc(opp.username)}">${x.msgOpp}</button>` : '';
    const tag = m.stage === 'playoff' ? `${roundName(m.round)}` : `${x.round} ${m.round}`;
    const state = m.status === 'confirmed' ? 'done' : m.status;
    return `<div class="g-card ut-m ${state}"><small class="ut-tag">${esc(tag)}</small><div class="ut-line"><span class="ut-side">${nm(m.home)}${sub(m.home)}</span><span class="ut-score ${m.status === 'pending' || m.status === 'review' ? 'wait' : ''}">${score}</span><span class="ut-side r">${nm(m.away)}${sub(m.away)}</span></div>${note}${acts ? `<div class="gm-row">${acts}</div>` : ''}${form}${chat}</div>`;
  }
  const roundName = (r) => { const x = t(), left = Math.log2(S.t.playoff) - r + 1; return left === 1 ? x.final : left === 2 ? x.semi : left === 3 ? x.quarter : `1/${2 ** (left - 1)}`; };

  // ——— Turnir sahifasi ———
  function heroHtml() {
    const x = t(), { t: T0, cur } = S;
    const roundTxt = cur ? `${cur.stage === 'playoff' ? roundName(cur.n) : `${cur.n}/${cur.total}`}` : '—';
    return `<div class="ut-top"><h2>${esc(T0.name)}</h2>${stBadge(T0.status)}
      <div class="l-stats"><div><b>${T0.players}/${T0.max}</b><small>${x.pl}</small></div><div><b>${T0.rounds}</b><small>${x.rounds}</small></div><div><b>${roundTxt}</b><small>${x.round}</small></div></div>
      ${cur && T0.status !== 'finished' ? `<div class="ut-dl">⏱ ${x.deadline}: ${fmt(cur.deadline)}</div>` : ''}
      ${T0.status === 'finished' && T0.champion ? `<div class="ut-dl">🏆 ${x.champion}: ${esc(S.players.find((p) => p.id === T0.champion)?.team || S.players.find((p) => p.id === T0.champion)?.user || '')}</div>` : ''}</div>`;
  }
  function homeHtml() {
    const x = t(), { t: T0, me } = S;
    let join = '';
    if (T0.status === 'open') {
      join = me.joined
        ? `<div class="note n-info"><small>✅ ${x.joined}</small><p>${x.waitDraw}${T0.drawAt ? ` · ${x.drawAt}: ${fmt(T0.drawAt)}` : ''}</p><button class="gm-btn ghost" data-act="leave">${x.leave}</button></div>`
        : `<div class="g-card ut-form"><label>${x.teamPh}<input type="text" id="jnTeam" maxlength="20"></label><button class="l-reg" data-act="join">${x.join}</button></div>`;
    }
    const next = S.mine.find((m) => m.status !== 'confirmed');
    const yours = me.joined && T0.status !== 'open' ? `<div class="g-label"><span>${x.yourMatch}</span></div>${next ? matchHtml(next) : `<div class="note n-info"><p>${x.noMatch}</p></div>`}${S.mine.length ? `<button class="ut-link" data-act="n-profile">${x.allMatches} →</button>` : ''}` : '';
    const invite = T0.status === 'open' && S.link ? `<div class="g-label"><span>${x.invite}</span></div><div class="g-card ut-inv"><p>${x.code}: <b>${esc(T0.code)}</b></p><div class="gm-row"><button class="gm-btn" data-act="share">${x.share}</button><button class="gm-btn ghost" data-act="copy">${x.copy}</button></div></div>` : '';
    const players = `<div class="g-label"><span>${x.pl} (${S.players.length}/${T0.max})</span></div><div class="ut-pls">${S.players.map((p) => `<div class="ut-pl"><b>${nm(p)}</b>${sub(p)}</div>`).join('') || `<p class="ad-hint">${x.empty}</p>`}</div>`;
    return `${heroHtml()}${join}${yours}${invite}
      <div class="note n-det"><small>💬 ${x.qTitle.toUpperCase()}</small><p>${esc(x.qText)}</p><button class="gm-btn" data-act="dm" data-un="${esc(T0.ownerUsername)}">${x.msgOrg} (${esc(T0.owner)})</button></div>
      <div class="g-card l-rules"><h3>📋 ${x.rulesTitle}</h3><ul>${x.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>${players}`;
  }
  function tableHtml() {
    const x = t(), q = S.t.playoff, rows = S.rows;
    const body = rows.map((r) => `<tr class="${r.pos <= 3 ? ['gold', 'silver', 'bronze'][r.pos - 1] : ''}"><td class="ps"><span class="pos ${q && r.pos <= q ? 'cl' : ''}">${r.pos}</span></td><td class="pl"><b>${nm(r)}</b>${sub(r)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="hl">${r.pts}</td></tr>`).join('');
    return `<div class="r-wrap"><table class="r-table"><thead><tr><th>#</th><th class="pl">${x.player}</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${body || `<tr><td colspan="8" class="empty">${x.empty}</td></tr>`}</tbody></table></div>`;
  }
  function scorersHtml() {
    const x = t(), rows = [...S.rows].sort((a, b) => b.gf - a.gf || a.pos - b.pos);
    return `<div class="r-wrap"><table class="r-table"><thead><tr><th>#</th><th class="pl">${x.player}</th><th>P</th><th>${x.goals}</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${i < 3 ? ['gold', 'silver', 'bronze'][i] : ''}"><td class="ps"><span class="pos">${i + 1}</span></td><td class="pl"><b>${nm(r)}</b>${sub(r)}</td><td>${r.p}</td><td class="hl">${r.gf}</td></tr>`).join('') || `<tr><td colspan="4" class="empty">${x.empty}</td></tr>`}</tbody></table></div>`;
  }
  function bracketHtml() {
    const x = t();
    if (!S.bracket.length) return `<div class="note n-info"><p>${x.bracketEmpty}</p></div>`;
    const rounds = [...new Set(S.bracket.map((m) => m.round))];
    return `<div class="ut-br">${rounds.map((r) => `<div class="ut-col"><h4>${esc(roundName(r))}</h4>${S.bracket.filter((m) => m.round === r).map((m) => `<div class="g-card ut-bm"><div class="${m.hg != null && m.hg > m.ag ? 'w' : ''}"><span>${nm(m.home)}</span><b>${m.hg ?? '–'}</b></div><div class="${m.hg != null && m.ag > m.hg ? 'w' : ''}"><span>${nm(m.away)}</span><b>${m.ag ?? '–'}</b></div></div>`).join('')}</div>`).join('')}</div>`;
  }
  function ratingHtml() {
    const x = t(), tabs = ['table', 'bracket', 'round', 'scorers'];
    const body = rtab === 'table' ? tableHtml() : rtab === 'scorers' ? scorersHtml() : rtab === 'bracket' ? bracketHtml()
      : (S.round.map(matchHtml).join('') || `<div class="note n-info"><p>${x.noMatch}</p></div>`);
    return `${heroHtml()}<div class="ut-seg">${tabs.map((k, i) => `<button class="${rtab === k ? 'on' : ''}" data-rt="${k}">${x.tabs[i]}</button>`).join('')}</div>${body}`;
  }
  function profileHtml() {
    const x = t(), u = tg?.initDataUnsafe?.user || {}, row = S.rows.find((r) => r.id === S.me.id);
    return `<div class="pf-card"><div class="pf-ava">${u.photo_url ? `<img src="${esc(u.photo_url)}" alt="">` : `<b>${esc((u.first_name || '?')[0])}</b>`}</div><div class="pf-info"><h2>${esc(row ? row.team || row.user : u.first_name || '')}</h2><p>${esc(u.first_name || '')}</p>${u.username ? `<a>@${esc(u.username)}</a>` : ''}</div></div>
      ${row ? `<div class="pf-stats"><div><b>#${row.pos}</b><small>${x.place}</small></div><div><b>${row.w}</b><small>W</small></div><div><b>${row.d}</b><small>D</small></div><div><b>${row.l}</b><small>L</small></div></div>` : ''}
      <div class="g-label"><span>${x.allMatches}</span></div>${S.mine.map(matchHtml).join('') || `<div class="pf-empty"><span>⚽</span><p>${x.noMatch}</p></div>`}`;
  }
  function prizesHtml() {
    const x = t(), boot = [...S.rows].sort((a, b) => b.gf - a.gf)[0], ball = S.rows[0], champ = S.players.find((p) => p.id === S.t.champion);
    const card = (cls, ico, title, subT, who, extra) => `<div class="g-card ut-prize ${cls}"><span class="ut-ico">${ico}</span><div><b>${esc(title)}</b><small>${esc(subT)}</small><p>${who ? esc(who) : '—'}${extra ? ` <em>${esc(extra)}</em>` : ''}</p></div></div>`;
    return `${heroHtml()}${card('gold', '👟', x.boot, x.bootSub, boot && boot.gf ? boot.team || boot.user : '', boot && boot.gf ? x.goalsN(boot.gf) : '')}${card('gold', '🏅', x.ball, x.ballSub, ball && ball.p ? ball.team || ball.user : '', '')}${card('cup', '🏆', x.cup, x.cupSub, champ ? champ.team || champ.user : '', '')}`;
  }

  // ——— Boshqaruv (tashkilotchi / admin) ———
  function mMatch(m) {
    const x = t(), claim = m.claim ? `<p class="ad-claim">${x.claimed}: ${m.claim.hg}:${m.claim.ag}</p>` : '';
    return `<div class="g-card ad-match" data-mid="${m.id}"><div class="ad-meta"><small>${m.stage === 'playoff' ? esc(roundName(m.round)) : `${x.round} ${m.round}`}</small><span class="ad-st ${m.status}">${m.status}</span></div>
      <div class="ad-vs"><div><b>${nm(m.home)}</b><small>${esc(m.home.user)}</small></div><div class="ad-in"><input type="number" inputmode="numeric" min="0" max="99" value="${m.hg ?? ''}" data-hg><b>:</b><input type="number" inputmode="numeric" min="0" max="99" value="${m.ag ?? ''}" data-ag></div><div><b>${nm(m.away)}</b><small>${esc(m.away.user)}</small></div></div>
      ${claim}<button class="ad-btn ok" data-act="m-result">${m.status === 'confirmed' ? x.mChange : x.mOk}</button></div>`;
  }
  function manageHtml() {
    const x = t(), T0 = S.t, ms = mfilter === 'action' ? S.action : mlist || [];
    const fs = [['action', x.fAction], ['scheduled', x.fSched], ['confirmed', x.fConf]];
    const drawBlock = T0.status === 'open'
      ? `<label class="ad-lbl">${x.mDrawTime}<input type="datetime-local" id="mDt" value="${T0.drawAt ? local(T0.drawAt) : ''}"></label>${T0.drawAt ? `<p class="ad-hint">⏰ ${x.mAuto}: ${fmt(T0.drawAt)}</p>` : ''}<div class="ad-row"><button class="ad-btn" data-act="m-time">${x.mSave}</button><button class="ad-btn ok" data-act="m-draw">${x.mDrawNow}</button></div>${T0.drawAt ? `<button class="ad-btn ghost" data-act="m-cleartime">${x.mClear}</button>` : ''}`
      : T0.status === 'league' ? `<button class="ad-btn ok" data-act="m-playoff">${x.mStartPlayoff}</button>` : `<p class="ad-ok">${stBadge(T0.status)}</p>`;
    const pls = S.players.map((p) => `<div class="g-card ad-pl"><span><b>${nm(p)}</b><small>${esc(p.user)}</small></span>${T0.status === 'playoff' || T0.status === 'finished' ? '' : `<button class="ad-btn bad" data-act="m-remove" data-pid="${p.id}" data-name="${esc(p.team || p.user)}">${x.mRemove}</button>`}</div>`).join('');
    return `${heroHtml()}<div class="g-label"><span>${x.mResults}</span></div>
      <div class="ad-filters"><select id="mFilter">${fs.map(([k, v]) => `<option value="${k}" ${mfilter === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div><p class="ad-hint">${x.mHint}</p>
      ${ms.map(mMatch).join('') || `<div class="pf-empty"><span>✅</span><p>${x.mNothing}</p></div>`}
      <div class="g-label"><span>${x.mDraw}</span></div><div class="g-card ad-lg">${drawBlock}</div>
      <div class="g-label"><span>${x.mPlayers} (${S.players.length}/${T0.max})</span></div>${pls}
      ${T0.status === 'playoff' || T0.status === 'finished' ? '' : `<div class="g-card ad-add"><b>${x.mAdd}</b><input type="text" id="mUser" placeholder="${esc(x.userPh)}"><input type="text" id="mTeam" maxlength="20" placeholder="${esc(x.teamPh)}"><button class="ad-btn ok" data-act="m-add">➕ ${x.add}</button><p class="ad-hint">${x.mAddHint}</p></div>`}
      <button class="ad-btn bad" data-act="m-delete">🗑 ${x.mDelete}</button>`;
  }

  const navHtml = () => { const x = t(), icons = ['🏠', '🏆', '👤', '🎁', '⚙️'], keys = ['home', 'rating', 'profile', 'prizes', 'manage'], n = S.me.mgr ? 5 : 4; return `<nav class="l-nav">${keys.slice(0, n).map((k, i) => `<button class="${tab === k ? 'on' : ''}" data-act="n-${k}"><span>${icons[i]}</span><small>${x.nav[i]}</small></button>`).join('')}</nav>`; };
  function tHtml() {
    if (!S) return `<div class="page l-page"><button class="back" data-act="back"><span>‹</span> ${t().back}</button></div>`;
    const body = tab === 'home' ? homeHtml() : tab === 'rating' ? ratingHtml() : tab === 'profile' ? profileHtml() : tab === 'prizes' ? prizesHtml() : manageHtml();
    return `<div class="page l-page"><button class="back" data-act="back"><span>‹</span> ${t().back}</button>${body}</div>${navHtml()}`;
  }
  function render() { el.innerHTML = view === 'create' ? createHtml() : view === 't' ? tHtml() : listHtml(); }

  // ——— Ma'lumot yuklash ———
  async function loadList() { const r = await api('/api/ut/mine'); if (r.ok) { list = r.list; if (view === 'list') render(); } }
  async function loadT(keepScroll) {
    const id = tid, r = await api('/api/ut/' + id);
    if (id !== tid) return;
    if (!r.ok) { toast(t().notFound); location.hash = '#unofficial'; return; }
    S = r; if (mfilter !== 'action') await loadM();
    const y = window.scrollY; render(); if (keepScroll) window.scrollTo(0, y);
  }
  async function loadM() { const r = await api(`/api/ut/${tid}/matches?status=${mfilter}`); if (r.ok) mlist = r.matches; }
  async function openCode(code) {
    const r = await api('/api/ut/code/' + encodeURIComponent(code));
    if (r.ok) { history.replaceState(null, '', '#unofficial/' + r.id); show(el, lang, toast, r.id); } else { toast(t().notFound); location.hash = '#unofficial'; }
  }
  const confirmBox = (msg) => new Promise((res) => (tg?.showConfirm ? tg.showConfirm(msg, res) : res(window.confirm(msg))));
  const dm = (un) => { if (!un) return toast(t().noUser); const url = 'https://t.me/' + un; tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, '_blank'); };
  async function act(r, okMsg, after) {
    if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); if (okMsg) toast(okMsg); } else toast(errMsg(r));
    if (after) after(r); await loadT(true);
  }

  async function onClick(e) {
    const x = t(), a = e.target.closest('[data-act]'), rt = e.target.closest('[data-rt]');
    if (rt) { rtab = rt.dataset.rt; render(); return; }
    if (!a) return;
    const k = a.dataset.act, mid = a.dataset.mid, box = () => [...el.querySelectorAll('[data-box]')].find((b) => b.dataset.box === mid), card = a.closest('[data-mid]');
    if (k === 'back') { if (!back()) location.hash = ''; return; }
    if (k === 'new') { view = 'create'; render(); window.scrollTo(0, 0); return; }
    if (k === 'open') { location.hash = '#unofficial/' + a.dataset.tid; return; }
    if (k === 'code') { const c = el.querySelector('#utCode').value.trim(); if (c) openCode(c); return; }
    if (k === 'mk') {
      const g = (id) => el.querySelector('#' + id).value, name = g('cfName').trim();
      if (name.length < 2) return toast(x.fName);
      const r = await post('/api/ut/create', { name, maxPlayers: +g('cfMax'), rounds: +g('cfRounds'), playoff: +g('cfPlayoff'), roundDays: +g('cfDays') });
      if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); view = 'list'; location.hash = '#unofficial/' + r.id; } else toast(r.error === 'limit' ? x.limit : x.fail);
      return;
    }
    if (k.startsWith('n-')) { tab = k.slice(2); panel = null; render(); window.scrollTo(0, 0); return; }
    if (k === 'join') return act(await post(`/api/ut/${tid}/join`, { team: el.querySelector('#jnTeam')?.value || '' }), x.joinedOk);
    if (k === 'leave') return act(await post(`/api/ut/${tid}/leave`));
    if (k === 'share' || k === 'copy') {
      const text = `${S.t.name}`, url = S.link || '';
      if (k === 'share' && tg?.openTelegramLink) return tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
      try { await navigator.clipboard.writeText(url); toast(x.copied); } catch (_) { window.prompt(x.copy, url); }
      return;
    }
    if (k === 'dm') return dm(a.dataset.un);
    // O'yin hisobi
    if (k === 'g-open' || k === 'g-chat') { const kind = k === 'g-open' ? 'result' : 'chat'; panel = panel?.id === mid && panel.kind === kind ? null : { id: mid, kind }; render(); return; }
    if (k === 'g-send') {
      const b = box(), my = parseInt(b?.querySelector('[data-in="my"]').value, 10), opp = parseInt(b?.querySelector('[data-in="opp"]').value, 10);
      if (!(my >= 0 && my <= 99 && opp >= 0 && opp <= 99)) return toast(x.badScore);
      return act(await post(`/api/ut/matches/${mid}/report`, { my, opp }), x.sent, () => { panel = null; });
    }
    if (k === 'g-ok') { const r = await post(`/api/ut/matches/${mid}/confirm`); return act(r, r.review ? x.review : x.confirmed); }
    if (k === 'g-bad') { if (!(await confirmBox(x.confirmFake))) return; return act(await post(`/api/ut/matches/${mid}/reject`), x.rejected); }
    if (k === 'g-room') { const room = box()?.querySelector('[data-in="room"]').value.trim(); if (!room) return; return act(await post(`/api/ut/matches/${mid}/room`, { room }), x.roomSent, () => { panel = null; }); }
    // Boshqaruv
    if (k === 'm-result') {
      const hg = parseInt(card.querySelector('[data-hg]').value, 10), ag = parseInt(card.querySelector('[data-ag]').value, 10);
      if (!(hg >= 0 && hg <= 99 && ag >= 0 && ag <= 99)) return toast(x.badScore);
      return act(await post(`/api/ut/matches/${card.dataset.mid}/result`, { hg, ag }), x.saved);
    }
    if (k === 'm-time') { const v = el.querySelector('#mDt').value; if (!v) return; return act(await post(`/api/ut/${tid}/settings`, { drawAt: new Date(v).toISOString() }), x.saved); }
    if (k === 'm-cleartime') return act(await post(`/api/ut/${tid}/settings`, { drawAt: null }), x.saved);
    if (k === 'm-draw') { if (!(await confirmBox(x.mDrawConfirm))) return; return act(await post(`/api/ut/${tid}/draw`), x.drawnOk); }
    if (k === 'm-playoff') {
      if (!(await confirmBox(x.mPlayoffConfirm))) return;
      let r = await post(`/api/ut/${tid}/playoff`);
      if (!r.ok && r.error === 'unfinished') { if (!(await confirmBox(x.mForce(r.left)))) return; r = await post(`/api/ut/${tid}/playoff`, { force: true }); }
      return act(r, x.playoffOk);
    }
    if (k === 'm-remove') { if (!(await confirmBox(x.mRemoveConfirm(a.dataset.name)))) return; return act(await post(`/api/ut/${tid}/remove`, { telegramId: Number(a.dataset.pid) }), x.removedOk); }
    if (k === 'm-add') { const user = el.querySelector('#mUser').value.trim(); if (!user) return; return act(await post(`/api/ut/${tid}/add`, { user, team: el.querySelector('#mTeam').value }), x.addedOk); }
    if (k === 'm-delete') { if (!(await confirmBox(x.mDeleteConfirm))) return; const r = await post(`/api/ut/${tid}/delete`); if (r.ok) { toast(x.deletedOk); location.hash = '#unofficial'; } else toast(errMsg(r)); }
  }
  async function onChange(e) { if (e.target.id === 'mFilter') { mfilter = e.target.value; if (mfilter !== 'action') await loadM(); render(); } }

  // Telegram "orqaga" tugmasi: ichki ekranlarda true qaytaradi
  function back() {
    if (view === 'create') { view = 'list'; render(); return true; }
    if (view === 't' && tid) { location.hash = '#unofficial'; return true; }
    return false;
  }
  function show(root, l, toastFn, a, b) {
    el = root; lang = l; toast = toastFn;
    if (!el.dataset.bound) { el.dataset.bound = '1'; el.addEventListener('click', onClick); el.addEventListener('change', onChange); }
    if (a === 'code' && b) { openCode(b); return; }
    if (a) {
      if (a !== tid || view !== 't') { tid = a; view = 't'; tab = 'home'; rtab = 'table'; panel = null; mfilter = 'action'; mlist = null; S = null; loadT(); }
      render();
    } else { tid = null; S = null; if (view !== 'create') view = 'list'; render(); loadList(); }
  }
  const leave = () => { view = 'list'; tid = null; S = null; panel = null; };
  return { show, leave, back };
})();
