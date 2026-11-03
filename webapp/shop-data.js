// Do'kon ma'lumotlari: Coins paketlari va kosmetika. Brauzer (window.SHOP) va server (require) uchun umumiy.
(function (root) {
  // Coins paketlari: [coins, narxi (UZS)] — narxlarni shu yerda o'zgartiring
  const PACKS = [[100, 7000], [300, 12000], [500, 18000], [800, 25000], [1000, 33000], [1500, 40000], [1800, 45000], [2000, 50000], [2500, 63000], [3000, 72000]]
    .map(([coins, uzs]) => ({ id: 'p' + coins, coins, uzs }));

  // Kosmetika faqat ko'rinish uchun (profil ramkasi va foni). price — Coins.
  const FRAMES = [
    { id: 'neon', name: { uz: 'Neon', en: 'Neon', ru: 'Неон' }, price: 250 },
    { id: 'ice', name: { uz: 'Muz', en: 'Ice', ru: 'Лёд' }, price: 250 },
    { id: 'emerald', name: { uz: 'Zumrad', en: 'Emerald', ru: 'Изумруд' }, price: 250 },
    { id: 'gold', name: { uz: 'Oltin', en: 'Gold', ru: 'Золото' }, price: 300 },
    { id: 'fire', name: { uz: 'Olov', en: 'Fire', ru: 'Огонь' }, price: 400 },
    { id: 'champion', name: { uz: 'Chempion', en: 'Champion', ru: 'Чемпион' }, price: 500 },
  ];
  const BACKGROUNDS = [
    { id: 'galaxy', name: { uz: 'Galaktika', en: 'Galaxy', ru: 'Галактика' }, price: 350 },
    { id: 'golden', name: { uz: 'Oltin hashamat', en: 'Golden luxury', ru: 'Золотая роскошь' }, price: 500 },
    { id: 'aurora', name: { uz: 'Shimoliy nur', en: 'Aurora', ru: 'Северное сияние' }, price: 350 },
    { id: 'sunset', name: { uz: 'Quyosh botishi', en: 'Sunset', ru: 'Закат' }, price: 300 },
    { id: 'ocean', name: { uz: 'Okean', en: 'Ocean', ru: 'Океан' }, price: 300 },
    { id: 'carbon', name: { uz: 'Karbon', en: 'Carbon', ru: 'Карбон' }, price: 250 },
    // Futbolchi fonlari: rasm webapp/cards/players/<id>.jpg (yoki .png) — rasm bo'lmasa gradient ko'rinadi
    { id: 'neymar', player: true, name: { uz: 'Neymar Jr', en: 'Neymar Jr', ru: 'Неймар' }, price: 800 },
    { id: 'ronaldo', player: true, name: { uz: 'Ronaldo', en: 'Ronaldo', ru: 'Роналду' }, price: 800 },
    { id: 'messi', player: true, name: { uz: 'Messi', en: 'Messi', ru: 'Месси' }, price: 800 },
    { id: 'shevchenko', player: true, name: { uz: 'Shevchenko', en: 'Shevchenko', ru: 'Шевченко' }, price: 800 },
    { id: 'gullit', player: true, name: { uz: 'Gullit', en: 'Gullit', ru: 'Гуллит' }, price: 800 },
    { id: 'ramos', player: true, name: { uz: 'Ramos', en: 'Ramos', ru: 'Рамос' }, price: 800 },
  ];
  const itemOf = (kind, id) => (kind === 'frame' ? FRAMES : kind === 'bg' ? BACKGROUNDS : []).find((x) => x.id === id) || null;
  const findItem = (id) => { const f = itemOf('frame', id); if (f) return { kind: 'frame', ...f }; const b = itemOf('bg', id); return b ? { kind: 'bg', ...b } : null; };

  const data = { PACKS, FRAMES, BACKGROUNDS, itemOf, findItem };
  if (typeof module !== 'undefined') module.exports = data; else root.SHOP = data;
})(this);
