// JCH: milliy jamoalar (davlatlar). Brauzer (window.NATIONS) va server (require) uchun umumiy.
// Eslatma: bu ro'yxat 48 ta mashhur jamoa; rasmiy 2026 saralash natijalari bilan almashtirish mumkin.
(function (g) {
  const CC = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));
  // [id, ISO kod, uz, en, ru]
  const rows = [
    ['ar', 'AR', 'Argentina', 'Argentina', 'Аргентина'], ['br', 'BR', 'Braziliya', 'Brazil', 'Бразилия'],
    ['fr', 'FR', 'Fransiya', 'France', 'Франция'], ['gb', 'GB', 'Angliya', 'England', 'Англия'],
    ['es', 'ES', 'Ispaniya', 'Spain', 'Испания'], ['de', 'DE', 'Germaniya', 'Germany', 'Германия'],
    ['pt', 'PT', 'Portugaliya', 'Portugal', 'Португалия'], ['nl', 'NL', 'Niderlandiya', 'Netherlands', 'Нидерланды'],
    ['be', 'BE', 'Belgiya', 'Belgium', 'Бельгия'], ['it', 'IT', 'Italiya', 'Italy', 'Италия'],
    ['hr', 'HR', 'Xorvatiya', 'Croatia', 'Хорватия'], ['uy', 'UY', 'Urugvay', 'Uruguay', 'Уругвай'],
    ['co', 'CO', 'Kolumbiya', 'Colombia', 'Колумбия'], ['mx', 'MX', 'Meksika', 'Mexico', 'Мексика'],
    ['us', 'US', 'AQSh', 'USA', 'США'], ['ca', 'CA', 'Kanada', 'Canada', 'Канада'],
    ['ma', 'MA', 'Marokash', 'Morocco', 'Марокко'], ['jp', 'JP', 'Yaponiya', 'Japan', 'Япония'],
    ['kr', 'KR', 'Janubiy Koreya', 'South Korea', 'Южная Корея'], ['au', 'AU', 'Avstraliya', 'Australia', 'Австралия'],
    ['sn', 'SN', 'Senegal', 'Senegal', 'Сенегал'], ['ng', 'NG', 'Nigeriya', 'Nigeria', 'Нигерия'],
    ['eg', 'EG', 'Misr', 'Egypt', 'Египет'], ['cm', 'CM', 'Kamerun', 'Cameroon', 'Камерун'],
    ['gh', 'GH', 'Gana', 'Ghana', 'Гана'], ['tn', 'TN', 'Tunis', 'Tunisia', 'Тунис'],
    ['dz', 'DZ', 'Jazoir', 'Algeria', 'Алжир'], ['ci', 'CI', "Kot-d'Ivuar", 'Ivory Coast', "Кот-д'Ивуар"],
    ['ir', 'IR', 'Eron', 'Iran', 'Иран'], ['sa', 'SA', 'Saudiya Arabistoni', 'Saudi Arabia', 'Саудовская Аравия'],
    ['qa', 'QA', 'Qatar', 'Qatar', 'Катар'], ['uz', 'UZ', "O'zbekiston", 'Uzbekistan', 'Узбекистан'],
    ['ch', 'CH', 'Shveysariya', 'Switzerland', 'Швейцария'], ['dk', 'DK', 'Daniya', 'Denmark', 'Дания'],
    ['pl', 'PL', 'Polsha', 'Poland', 'Польша'], ['rs', 'RS', 'Serbiya', 'Serbia', 'Сербия'],
    ['at', 'AT', 'Avstriya', 'Austria', 'Австрия'], ['tr', 'TR', 'Turkiya', 'Turkey', 'Турция'],
    ['ec', 'EC', 'Ekvador', 'Ecuador', 'Эквадор'], ['py', 'PY', 'Paragvay', 'Paraguay', 'Парагвай'],
    ['cl', 'CL', 'Chili', 'Chile', 'Чили'], ['pe', 'PE', 'Peru', 'Peru', 'Перу'],
    ['jm', 'JM', 'Yamayka', 'Jamaica', 'Ямайка'], ['cr', 'CR', 'Kosta-Rika', 'Costa Rica', 'Коста-Рика'],
    ['pa', 'PA', 'Panama', 'Panama', 'Панама'], ['nz', 'NZ', 'Yangi Zelandiya', 'New Zealand', 'Новая Зеландия'],
    ['hu', 'HU', 'Vengriya', 'Hungary', 'Венгрия'], ['cz', 'CZ', 'Chexiya', 'Czechia', 'Чехия'],
  ];
  const NATIONS = rows.map(([id, cc, uz, en, ru]) => ({ id, flag: CC(cc), name: { uz, en, ru: ru } }));
  const nationById = Object.fromEntries(NATIONS.map((n) => [n.id, n]));
  const lib = { NATIONS, nationById };
  g.NATIONS = NATIONS; g.NATIONS_BY_ID = nationById;
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof window !== 'undefined' ? window : globalThis);
