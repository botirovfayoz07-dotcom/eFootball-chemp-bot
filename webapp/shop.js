// "Do'kon" bo'limi: hozircha Auksion (foydalanuvchilar auksionga qo'ygan klublar)
window.ShopView = (() => {
  const T = {
    uz: { title: "Do'kon", auction: 'Auksion', empty: "Hozircha auksionda klub yo'q", buy: 'Sotib olish', cancel: 'Auksiondan olish', games: "o'yin", back: 'Ortga' },
    en: { title: 'Shop', auction: 'Auction', empty: 'No clubs on auction yet', buy: 'Buy', cancel: 'Take off auction', games: 'games', back: 'Back' },
    ru: { title: 'Магазин', auction: 'Аукцион', empty: 'Пока нет клубов на аукционе', buy: 'Купить', cancel: 'Снять с аукциона', games: 'игр', back: 'Назад' },
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // st: { lots: [{ league, club, price, games, mine }] }
  function html(lang, st) {
    const t = T[lang], EFL = window.EFL;
    const lots = (st.lots || []).map((l) => {
      const name = EFL.clubName(l.league, l.club), lg = EFL.byId[l.league]?.name || '';
      const btn = l.mine ? `<button class="lot-btn" data-act="unauction" data-key="${esc(l.league + '|' + l.club)}">${t.cancel}</button>` : `<button class="lot-btn buy" data-act="buy">${t.buy}</button>`;
      return `<div class="lot">${EFL.crest(l.league, l.club, name)}<span class="lot-info"><b>${esc(name)}</b><small>${esc(lg)} · ${l.games} ${t.games}</small></span><span class="lot-side"><i class="lot-price">${esc(l.price)} 🪙</i>${btn}</span></div>`;
    }).join('');
    return `<button class="back" data-act="back"><span>‹</span> ${t.back}</button>
      <div class="g-label"><span>${t.title}</span></div>
      <div class="seg"><button class="on">🔨 ${t.auction}</button></div>
      ${lots || `<div class="pf-empty"><span>🔨</span><p>${t.empty}</p></div>`}`;
  }
  return { html };
})();
