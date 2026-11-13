// "Do'kon" bo'limi: Coins (sariq tanga) paketlari · Kosmetika · Auksion · Sell (kubokni adminga sotish)
window.ShopView = (() => {
  const T = {
    uz: { title: "Do'kon", balance: 'Balansingiz', payVia: (n) => `${n} orqali to'lash`, payOr: 'yoki chek rasmini yuboring', bonusLabel: 'Bonuslar', dailyTitle: 'Kunlik bonus', dailyHint: (n) => `Bugun +${n} Coins`, dailyBtn: 'Olish', dailyDone: 'Bugun olingan ✓', streak: (n) => `${n} kun ketma-ket`, refTitle: "Do'stlarni taklif qilish", refHint: (n) => `+${n} Coins · do'st ligaga yozilgach`, refCount: (n) => `Taklif qilganlar: ${n}`, tabs: { coins: 'Coins', cosmetics: 'Kosmetika', auction: 'Auksion', sell: 'Sell' }, packs: 'Paketlar',
      transfer: (a) => `Kartaga <b>${a}</b> UZS o'tkazing`, holder: 'Karta egasi', copy: 'Nusxa', step2: "To'lov chekining rasmini yuboring", send: 'Chek rasmini yuborish',
      note: "Admin chekni tekshiradi, odatda bir necha soat ichida. Bot sizga xabar beradi.", cant: 'Chek yubora olmayman', close: 'Yopish', noCard: "Karta raqami hali kiritilmagan — admin bilan bog'laning",
      cosIntro: "Kosmetika faqat ko'rinish uchun: avatar ramkasi va profil foni. Sotib olishdan oldin «Ko'rish» ni bosing.", frames: 'Ramkalar', bgs: 'Fonlar', players: 'Futbolchi fonlari', preview: "Ko'rish", buy: 'Sotib olish', equip: 'Yoqish', equipped: 'Yoqilgan', unequip: "O'chirish",
      prevTitle: "Profilingizda shunday ko'rinadi", prevHint: "Boshqalarini ko'rish uchun ‹ › ni bosing. Sotib olmaguncha hech narsa o'zgarmaydi.", notReg: "Ro'yxatdan o'tmagan",
      auction: 'Auksion', empty: "Hozircha auksionda klub yo'q", aBuy: 'Pul tikish', cancel: 'Auksiondan olish', games: "o'yin",
      sellIntro: "Yutgan kubogingizni adminga soting: «Sotish» ni bosing va karta raqamingizni yuboring. Pul 24 soat ichida kartangizga o'tkaziladi, shundan so'ng kubok ro'yxatingizdan chiqariladi.",
      notOwned: "Sizda bu kubok mavjud emas", sellPrice: 'Narx', noPrice: 'Narx hali belgilanmagan', sellFor: 'Sotish narxi', sellEmpty: "Sotadigan kubok yo'q. Ligada g'olib bo'lsangiz, kubok shu yerda paydo bo'ladi.", sell: 'Sotish', sellNoPrice: "Narx belgilanmagan", sellWait: "⏳ Admin pulni o'tkazishini kutmoqda (24 soat ichida)", season: 'Mavsum',
      sellTitle: 'Kubokni adminga sotish', sellLabel: "Admin pulni qaysi kartaga tashlasin? Karta raqamini kiriting", sellSend: 'Adminga yuborish', sellNote: "Karta raqami adminga yuboriladi. Pul 24 soat ichida o'tkazib beriladi." },
    en: { title: 'Shop', balance: 'Your balance', payVia: (n) => `Pay with ${n}`, payOr: 'or send a receipt photo', bonusLabel: 'Bonuses', dailyTitle: 'Daily bonus', dailyHint: (n) => `Today +${n} Coins`, dailyBtn: 'Claim', dailyDone: 'Claimed today ✓', streak: (n) => `${n}-day streak`, refTitle: 'Invite friends', refHint: (n) => `+${n} Coins · once the friend joins a league`, refCount: (n) => `Invited: ${n}`, tabs: { coins: 'Coins', cosmetics: 'Cosmetics', auction: 'Auction', sell: 'Sell' }, packs: 'Packages',
      transfer: (a) => `Transfer <b>${a}</b> UZS to the card`, holder: 'Card holder', copy: 'Copy', step2: 'Send a photo of the payment receipt', send: 'Send receipt photo',
      note: 'The admin checks the receipt, usually within a few hours. The bot will notify you.', cant: "I can't send the receipt", close: 'Close', noCard: 'The card number is not set yet — contact the admin',
      cosIntro: 'Cosmetics are for looks only: an avatar frame and a profile background. Tap “Preview” before you buy.', frames: 'Frames', bgs: 'Backgrounds', players: 'Footballer backgrounds', preview: 'Preview', buy: 'Buy', equip: 'Equip', equipped: 'Equipped', unequip: 'Remove',
      prevTitle: 'How it looks on your profile', prevHint: 'Use ‹ › to try others. Nothing changes until you buy.', notReg: 'Not registered',
      auction: 'Auction', empty: 'No clubs on auction yet', aBuy: 'Bid', cancel: 'Take off auction', games: 'games',
      sellIntro: 'Sell the trophy you won to the admin: tap “Sell” and send your card number. The money is sent to your card within 24 hours, then the trophy is removed from your list.',
      notOwned: "You don't have this trophy", sellPrice: 'Price', noPrice: 'Price not set yet', sellFor: 'Selling price', sellEmpty: 'No trophies to sell. If you win a league, the trophy appears here.', sell: 'Sell', sellNoPrice: 'No price set', sellWait: '⏳ Waiting for the admin to send the money (within 24 hours)', season: 'Season',
      sellTitle: 'Sell the trophy to the admin', sellLabel: 'Which card should the admin send the money to? Enter the card number', sellSend: 'Send to admin', sellNote: 'Your card number goes to the admin. The money is sent within 24 hours.' },
    ru: { title: 'Магазин', balance: 'Ваш баланс', payVia: (n) => `Оплатить через ${n}`, payOr: 'или отправьте фото чека', bonusLabel: 'Бонусы', dailyTitle: 'Ежедневный бонус', dailyHint: (n) => `Сегодня +${n} Coins`, dailyBtn: 'Получить', dailyDone: 'Получено сегодня ✓', streak: (n) => `Серия: ${n} дн.`, refTitle: 'Пригласить друзей', refHint: (n) => `+${n} Coins · когда друг запишется в лигу`, refCount: (n) => `Приглашено: ${n}`, tabs: { coins: 'Coins', cosmetics: 'Косметика', auction: 'Аукцион', sell: 'Sell' }, packs: 'Пакеты',
      transfer: (a) => `Переведите <b>${a}</b> UZS на карту`, holder: 'Владелец карты', copy: 'Копия', step2: 'Отправьте фото чека об оплате', send: 'Отправить фото чека',
      note: 'Админ проверит чек, обычно в течение нескольких часов. Бот сообщит вам.', cant: 'Не могу отправить чек', close: 'Закрыть', noCard: 'Номер карты ещё не указан — свяжитесь с админом',
      cosIntro: 'Косметика только для вида: рамка аватара и фон профиля. Перед покупкой нажмите «Просмотр».', frames: 'Рамки', bgs: 'Фоны', players: 'Фоны с футболистами', preview: 'Просмотр', buy: 'Купить', equip: 'Надеть', equipped: 'Надето', unequip: 'Снять',
      prevTitle: 'Так это выглядит в вашем профиле', prevHint: 'Листайте ‹ ›, чтобы посмотреть другие. Пока не купите — ничего не меняется.', notReg: 'Не зарегистрирован',
      auction: 'Аукцион', empty: 'Пока нет клубов на аукционе', aBuy: 'Купить', cancel: 'Снять с аукциона', games: 'игр',
      sellIntro: 'Продайте выигранный кубок админу: нажмите «Продать» и отправьте номер карты. Деньги придут на карту в течение 24 часов, после чего кубок исчезнет из вашего списка.',
      notOwned: "У вас нет этого кубка", sellPrice: 'Цена', noPrice: 'Цена пока не назначена', sellFor: 'Цена продажи', sellEmpty: 'Нет кубков для продажи. Если вы выиграете лигу, кубок появится здесь.', sell: 'Продать', sellNoPrice: 'Цена не задана', sellWait: '⏳ Ждём, пока админ переведёт деньги (в течение 24 часов)', season: 'Сезон',
      sellTitle: 'Продать кубок админу', sellLabel: 'На какую карту админу перевести деньги? Введите номер карты', sellSend: 'Отправить админу', sellNote: 'Номер карты уйдёт админу. Деньги переводятся в течение 24 часов.' },
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const coin = (cls = '') => `<i class="coin ${cls}"></i>`;                 // sariq tanga
  const stack = (n) => `<span class="stack">${Array.from({ length: n }, (_, i) => `<i class="coin" style="--i:${i}"></i>`).join('')}</span>`;
  const itemName = (it, lang) => it.name[lang] || it.name.uz;

  // Kubok rasmi (zanjir: keyingi manba, oxirida 🏆)
  const FB = `var f=(this.dataset.f||'').split('|').filter(Boolean);if(f.length){this.dataset.f=f.slice(1).join('|');this.src=f[0];}else{this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🏆'}))}`;
  const cupImg = (id, cls = '') => { const s = window.EFL.cupSrcs(id); return `<img class="${cls}" src="${esc(s[0])}" data-f="${esc(s.slice(1).join('|'))}" alt="" loading="lazy" onerror="${FB}">`; };

  const bgClass = (id) => (id && !window.SHOP.itemOf('bg', id)?.player ? 'bg-' + id : '');   // karta foni: faqat oddiy fonlar (futbolchi fonlari butun ekranda)
  const avatar = () => { const u = window.Telegram?.WebApp?.initDataUnsafe?.user || {}; return u.photo_url ? `<img src="${esc(u.photo_url)}" alt="">` : `<b>${esc((u.first_name || '?')[0])}</b>`; };

  // ——— Kunlik bonus va do'st taklif qilish ———
  function bonusHtml(lang, st, t) {
    const d = st.daily || {}, r = st.ref || {};
    const daily = `<div class="pack bonus-tile">
      <span class="bonus-ico">🎁</span>
      <b>${t.dailyTitle}</b>
      <small>${d.claimed ? t.dailyDone : t.dailyHint(d.next || 5)}</small>
      ${d.streak ? `<small>${t.streak(d.streak)}</small>` : ''}
      ${d.claimed ? '<button class="pack-buy" disabled>✓</button>' : `<button class="pack-buy" data-act="daily">${t.dailyBtn}</button>`}
    </div>`;
    const ref = r.link ? `<div class="pack bonus-tile">
      <span class="bonus-ico">👥</span>
      <b>${t.refTitle}</b>
      <small>${t.refHint(r.bonus || 0)}</small>
      <small>${t.refCount(r.count || 0)}</small>
      <button class="pack-buy" data-act="refcopy" data-link="${esc(r.link)}">${t.copy}</button>
    </div>` : '';
    return `<div class="g-label"><span>${t.bonusLabel}</span></div><div class="packs">${daily}${ref}</div>`;
  }

  // ——— Coins paketlari ———
  function coinsHtml(lang, st, t) {
    const packs = window.SHOP.PACKS.map((p, i) => `<div class="pack">${stack(Math.min(5, 1 + Math.floor(i / 2)))}<b>${fmt(p.coins)}</b><small>Coins</small><button class="pack-buy" data-act="pack" data-pack="${p.id}">${fmt(p.uzs)} UZS</button></div>`).join('');
    return bonusHtml(lang, st, t) + `<div class="g-label"><span>${t.packs}</span></div><div class="packs">${packs}</div>`;
  }

  // ——— Kosmetika ———
  const cosCard = (kind, it, st, lang, t) => {
    const slot = kind === 'bg' && it.player ? 'pbg' : kind, own = (st.owned || []).includes(it.id), on = st.equipped?.[slot] === it.id;
    const vis = kind === 'frame' ? `<span class="cos-av"><span class="pf-ava fr-${it.id}">${avatar()}</span></span>` : `<span class="cos-bg bg-${it.id}${it.player ? ' tall' : ''}"></span>`;
    const btn = own
      ? `<button class="cos-btn ${on ? 'on' : 'eq'}" data-act="equip" data-kind="${slot}" data-id="${on ? '' : it.id}">${on ? '✓ ' + t.equipped : t.equip}</button>`
      : `<button class="cos-btn buy" data-act="preview" data-kind="${kind}" data-id="${it.id}">${coin('sm')} ${fmt(it.price)}</button>`;
    return `<div class="cos${on ? ' on' : ''}">${vis}<b>${esc(itemName(it, lang))}</b>${btn}${own ? '' : `<button class="cos-prev" data-act="preview" data-kind="${kind}" data-id="${it.id}">👁 ${t.preview}</button>`}</div>`;
  };
  function cosmeticsHtml(lang, st, t) {
    const S = window.SHOP;
    return `<p class="shop-note">${t.cosIntro}</p>
      <div class="g-label"><span>${t.frames}</span></div><div class="cos-grid">${S.FRAMES.map((x) => cosCard('frame', x, st, lang, t)).join('')}</div>
      <div class="g-label"><span>${t.bgs}</span></div><div class="cos-grid two">${S.BACKGROUNDS.filter((x) => !x.player).map((x) => cosCard('bg', x, st, lang, t)).join('')}</div>
      <div class="g-label"><span>${t.players}</span></div><div class="cos-grid two">${S.BACKGROUNDS.filter((x) => x.player).map((x) => cosCard('bg', x, st, lang, t)).join('')}</div>`;
  }

  // ——— Auksion (foydalanuvchilar qo'ygan klublar) ———
  function auctionHtml(lang, st, t) {
    const EFL = window.EFL;
    const lots = (st.lots || []).map((l) => {
      const name = EFL.clubName(l.league, l.club), lg = EFL.byId[l.league]?.name || '';
      const btn = l.mine ? `<button class="lot-btn" data-act="unauction" data-key="${esc(l.league + '|' + l.club)}">${t.cancel}</button>` : `<button class="lot-btn buy" data-act="buy" data-bl="${esc(l.league)}" data-bc="${esc(l.club)}">${t.aBuy}</button>`;
      return `<div class="lot">${EFL.crest(l.league, l.club, name)}<span class="lot-info"><b>${esc(name)}</b><small>${esc(lg)} · ${l.games} ${t.games}</small>${l.user ? `<small class="lot-user">👤 ${esc(l.user)}</small>` : ''}</span><span class="lot-side"><i class="lot-price">${esc(l.price)} ${coin('sm')}</i>${btn}</span></div>`;
    }).join('');
    return lots || `<div class="pf-empty"><span>🔨</span><p>${t.empty}</p></div>`;
  }

  // ——— Sell: yutilgan kuboklarni adminga sotish ———
  function sellHtml(st, t) {
    const EFL = window.EFL;
    const priced = new Map((st.cupPrices || []).map((c) => [c.league, c.price]));
    const own = (lg) => (st.trophies || []).filter((x) => x.league === lg);
    // Admin narx qo'ygan har bir kubok (liga va cup) ko'rinadi; rasm burchagida foydalanuvchida nechta borligi (0 ham); egasi bor kuboklar birinchi
    const ids = [...new Set([...priced.keys(), ...(st.trophies || []).map((x) => x.league)])];
    ids.sort((a, b) => (own(b).length > 0) - (own(a).length > 0));
    const cards = ids.map((id) => {
      const mine = own(id), price = priced.get(id) || 0, free = mine.filter((x) => x.status !== 'selling');
      const waiting = mine.length && !free.length;
      const act = waiting ? `<p class="sell-wait">${t.sellWait}</p>`
        : !price ? `<p class="sell-wait">${t.sellNoPrice}</p>`
        : `<button class="sell-red${free.length ? '' : ' off'}" data-act="sellcup" data-league="${esc(id)}">Sell</button>`;
      return `<div class="sell-card${mine.length ? ' own' : ''}" data-act="sellcup" data-league="${esc(id)}" style="cursor:pointer"><span class="sell-img">${cupImg(id)}<i class="sell-n${mine.length ? '' : ' zero'}">${mine.length}</i></span><b>${esc(EFL.trophyName(id))}</b>${price ? `<small class="sell-price"><b>${fmt(price)} UZS</b></small>` : `<small class="sell-price">${t.sellNoPrice}</small>`}${act}</div>`;
    }).join('');
    return `<p class="shop-note">${t.sellIntro}</p>${cards ? `<div class="sell-grid">${cards}</div>` : `<div class="pf-empty"><span>🏆</span><p>${t.sellEmpty}</p></div>`}`;
  }

  // st: { tab, coins, owned, equipped, trophies, lots }
  function html(lang, st) {
    const t = T[lang], tab = st.tab || 'coins';
    const tabs = ['coins', 'cosmetics', 'auction', 'sell'].map((k) => `<button class="${k === tab ? 'on' : ''}" data-act="stab" data-tab="${k}">${k === 'coins' ? coin('sm') + ' ' : k === 'cosmetics' ? '🎨 ' : k === 'auction' ? '🔨 ' : '💸 '}${t.tabs[k]}</button>`).join('');
    const body = tab === 'coins' ? coinsHtml(lang, st, t) : tab === 'cosmetics' ? cosmeticsHtml(lang, st, t) : tab === 'auction' ? auctionHtml(lang, st, t) : sellHtml(st, t);
    return `<button class="back" data-act="back"><span>‹</span> ${lang === 'en' ? 'Back' : lang === 'ru' ? 'Назад' : 'Ortga'}</button>
      <div class="g-label"><span>${t.title}</span></div>
      <div class="shop-bal">${coin('lg')}<span><small>${t.balance}</small><b>${fmt(st.coins || 0)} <em>Coins</em></b></span></div>
      <div class="seg four">${tabs}</div>
      ${body}`;
  }

  // ——— Modal oynalar ———
  const modal = (inner) => `<div class="modal-box shopbox">${inner}</div>`;
  function topupModal(lang, pack, st) {
    const t = T[lang], card = st.card ? st.card.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() : '';
    const autoBtns = [['payme', 'Payme'], ['click', 'Click']].filter(([k]) => st.pay?.[k])
      .map(([k, n]) => `<button class="tu-send" data-act="payauto" data-prov="${k}" data-pack="${pack.id}">💳 ${t.payVia(n)}</button>`).join('');
    const auto = autoBtns ? `<div class="tu-auto">${autoBtns}<small class="tu-note">${t.payOr}</small></div>` : '';
    return modal(`<span class="tu-ico">${stack(3)}</span><h3>${fmt(pack.coins)} Coins</h3>
      ${auto}
      <p class="tu-step"><i>1</i> <span>${t.transfer(fmt(pack.uzs))}</span></p>
      ${card ? `<div class="tu-card"><b>${esc(card)}</b><button data-act="copycard" data-card="${esc(card)}">${t.copy}</button></div>${st.holder ? `<small class="tu-holder">${t.holder}: ${esc(st.holder)}</small>` : ''}` : `<p class="tu-warn">${t.noCard}</p>`}
      <p class="tu-step"><i>2</i> <span>${t.step2}</span></p>
      <input type="file" id="rcpt" accept="image/*" hidden>
      <button class="tu-send" data-act="pickrcpt" data-pack="${pack.id}" ${card ? '' : 'disabled'}>📎 ${t.send}</button>
      <small class="tu-note">${t.note}</small>
      <button class="tu-link" data-act="contact">${t.cant}</button>
      <button class="tu-close" data-act="mclose">${t.close}</button>`);
  }
  // prev: { kind, idx } — kosmetika ko'rinishi, ‹ › bilan almashtiriladi
  function previewModal(lang, prev, st) {
    const t = T[lang], S = window.SHOP, list = prev.kind === 'frame' ? S.FRAMES : S.BACKGROUNDS, it = list[prev.idx];
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const frame = prev.kind === 'frame' ? it.id : st.equipped?.frame, bg = prev.kind === 'bg' && !it.player ? it.id : st.equipped?.bg;
    const own = (st.owned || []).includes(it.id);
    return modal(`<h3 class="pv-title">${t.prevTitle}</h3>
      <div class="pf-card pv-card ${bgClass(bg)}"><div class="pf-ava ${frame ? 'fr-' + frame : ''}">${avatar()}</div><div class="pf-info"><h2>${esc(u.first_name || '')}</h2><p>${t.notReg}</p></div></div>
      <div class="pv-nav"><button data-act="pvnav" data-d="-1">‹</button><span><b>${esc(itemName(it, lang))}</b><small>${prev.kind === 'frame' ? t.frames : t.bgs} · ${prev.idx + 1}/${list.length}</small></span><button data-act="pvnav" data-d="1">›</button></div>
      <p class="pv-hint">${t.prevHint}</p>
      ${own ? `<button class="tu-send" disabled>✓ ${t.equipped}</button>` : `<button class="tu-send" data-act="pvbuy" data-id="${it.id}">${t.buy} · ${coin('sm')} ${fmt(it.price)}</button>`}
      <button class="tu-close" data-act="mclose">${t.close}</button>`);
  }
  function sellModal(lang, tr) {
    const t = T[lang], name = window.EFL.trophyName(tr.league);
    return modal(`<span class="tu-ico sell-img">${cupImg(tr.league)}</span><h3>${t.sellTitle}</h3><p class="shop-note">${esc(name)} · ${t.season} ${esc(tr.season)}</p>
      ${tr.price ? `<p class="sell-for">${t.sellFor}: <b>${fmt(tr.price)} UZS</b></p>` : ''}
      <label>${t.sellLabel}</label><input id="sellCard" type="text" inputmode="numeric" autocomplete="off" maxlength="19" placeholder="0000 0000 0000 0000">
      <small class="tu-note">${t.sellNote}</small>
      <button class="tu-send" data-act="sellgo" data-tid="${esc(tr.id)}">${t.sellSend}</button>
      <button class="tu-close" data-act="mclose">${t.close}</button>`);
  }
  return { html, coin, fmt, T, cupImg, bgClass, topupModal, previewModal, sellModal };
})();
