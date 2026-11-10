// Brauzer (window.EFL) va server (require) uchun umumiy
// Sonlar (max) videodagi ro'yxatdan olingan. Klub nomlari — qoralama, o'yindagi ro'yxatga qarab tekshiring.
(function (root) {
  const slug = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const L = (id, name, group, max, clubs) => ({ id, name, group, max, clubs: clubs.map((n) => ({ id: slug(n), name: n })) });

  const LEAGUES = [
    // ——— 1-ligalar ———
    L('laliga', 'LaLiga', 1, 20, ['Alavés', 'Almería', 'Athletic Club', 'Atlético Madrid', 'Barcelona', 'Betis', 'Cádiz', 'Celta Vigo', 'Getafe', 'Girona', 'Granada', 'Las Palmas', 'Mallorca', 'Osasuna', 'Rayo Vallecano', 'Real Madrid', 'Real Sociedad', 'Sevilla', 'Valencia', 'Villarreal']),
    L('premier-league', 'Premier Liga', 1, 20, ['Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool', 'Luton Town', 'Manchester City', 'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sheffield United', 'Tottenham', 'West Ham', 'Wolverhampton']),
    L('bundesliga', 'Bundesliga', 1, 18, ['Augsburg', 'Bayer Leverkusen', 'Bayern München', 'Bochum', 'Borussia Dortmund', "Borussia M'gladbach", 'Darmstadt 98', 'Eintracht Frankfurt', 'Freiburg', 'Heidenheim', 'Hoffenheim', 'Köln', 'Mainz 05', 'RB Leipzig', 'Stuttgart', 'Union Berlin', 'Werder Bremen', 'Wolfsburg']),
    L('serie-a', 'Serie A', 1, 20, ['Atalanta', 'Bologna', 'Cagliari', 'Empoli', 'Fiorentina', 'Frosinone', 'Genoa', 'Inter', 'Juventus', 'Lazio', 'Lecce', 'Milan', 'Monza', 'Napoli', 'Roma', 'Salernitana', 'Sassuolo', 'Torino', 'Udinese', 'Hellas Verona']),
    L('ligue-1', 'Ligue 1', 1, 18, ['Brest', 'Clermont', 'Le Havre', 'Lens', 'Lille', 'Lorient', 'Lyon', 'Marseille', 'Metz', 'Monaco', 'Montpellier', 'Nantes', 'Nice', 'Paris Saint-Germain', 'Reims', 'Rennes', 'Strasbourg', 'Toulouse']),
    // ——— 2-ligalar ———
    L('laliga-2', 'LaLiga 2', 2, 22, ['Albacete', 'Alcorcón', 'Amorebieta', 'Andorra', 'Burgos', 'Cartagena', 'Eibar', 'Eldense', 'Elche', 'Espanyol', 'Huesca', 'Leganés', 'Levante', 'Mirandés', 'Oviedo', 'Racing Ferrol', 'Racing Santander', 'Sporting Gijón', 'Tenerife', 'Valladolid', 'Villarreal B', 'Zaragoza']),
    L('championship', 'Championship', 2, 24, ['Birmingham City', 'Blackburn Rovers', 'Bristol City', 'Cardiff City', 'Coventry City', 'Huddersfield', 'Hull City', 'Ipswich Town', 'Leeds United', 'Leicester City', 'Middlesbrough', 'Millwall', 'Norwich City', 'Plymouth Argyle', 'Preston', 'QPR', 'Rotherham', 'Sheffield Wednesday', 'Southampton', 'Stoke City', 'Sunderland', 'Swansea City', 'Watford', 'West Brom']),
    L('bundesliga-2', '2. Bundesliga', 2, 18, ['Braunschweig', 'Düsseldorf', 'Elversberg', 'Greuther Fürth', 'Hamburg', 'Hannover 96', 'Hansa Rostock', 'Hertha Berlin', 'Holstein Kiel', 'Kaiserslautern', 'Karlsruhe', 'Magdeburg', 'Nürnberg', 'Osnabrück', 'Paderborn', 'Schalke 04', 'St. Pauli', 'Wehen Wiesbaden']),
    L('serie-b', 'Serie B', 2, 20, ['Ascoli', 'Bari', 'Brescia', 'Catanzaro', 'Cittadella', 'Como', 'Cosenza', 'Cremonese', 'FeralpiSalò', 'Lecco', 'Modena', 'Palermo', 'Parma', 'Pisa', 'Reggiana', 'Sampdoria', 'Spezia', 'Südtirol', 'Ternana', 'Venezia']),
    L('ligue-2', 'Ligue 2', 2, 18, ['Amiens', 'Angers', 'Annecy', 'Auxerre', 'Bastia', 'Bordeaux', 'Caen', 'Concarneau', 'Dunkerque', 'Grenoble', 'Guingamp', 'Laval', 'Paris FC', 'Pau', 'Quevilly-Rouen', 'Rodez', 'Saint-Étienne', 'Troyes']),
  ];

  // ——— Qit'alar, davlatlar, kuboklar ———
  const CONTINENTS = [{ id: 'europe', open: true }];
  const K = (continent, id, flag, uz, en, ru, open) => ({ id, continent, flag, open: !!open, name: { uz, en, ru } });
  const COUNTRIES = [
    K('europe', 'en', '🇬🇧', 'Angliya', 'England', 'Англия', true),
    K('europe', 'es', '🇪🇸', 'Ispaniya', 'Spain', 'Испания', true),
    K('europe', 'it', '🇮🇹', 'Italiya', 'Italy', 'Италия', true),
    K('europe', 'de', '🇩🇪', 'Germaniya', 'Germany', 'Германия', true),
    K('europe', 'fr', '🇫🇷', 'Fransiya', 'France', 'Франция', true),
  ];

  // Qaysi liga qaysi davlatniki
  const COUNTRY_OF = {
    'premier-league': 'en', championship: 'en',
    laliga: 'es', 'laliga-2': 'es',
    'serie-a': 'it', 'serie-b': 'it',
    bundesliga: 'de', 'bundesliga-2': 'de',
    'ligue-1': 'fr', 'ligue-2': 'fr',
  };
  LEAGUES.forEach((l) => { l.country = COUNTRY_OF[l.id] || null; });

  // Davlat sahifasidagi kuboklar (faqat ko'rsatiladi, bosilmaydi). Rasm: webapp/cards/kubok/<id>.png
  // type: league | league2 | cup | supercup — tagiga yoziladigan tur nomi
  const cup = (id, name, type) => ({ id, name, type });
  const CUPS = {
    en: [cup('premier-league', 'Premier League', 'league'), cup('championship', 'Championship', 'league2'), cup('fa-cup', 'FA Cup', 'cup'), cup('community-shield', 'Community Shield', 'supercup')],
    es: [cup('laliga', 'La Liga', 'league'), cup('laliga-2', 'La Liga 2', 'league2'), cup('copa-del-rey', 'Copa del Rey', 'cup'), cup('supercopa', 'Supercopa de España', 'supercup')],
    it: [cup('serie-a', 'Serie A', 'league'), cup('serie-b', 'Serie B', 'league2'), cup('coppa-italia', 'Coppa Italia', 'cup'), cup('supercoppa', 'Supercoppa Italiana', 'supercup')],
    de: [cup('bundesliga', 'Bundesliga', 'league'), cup('bundesliga-2', '2. Bundesliga', 'league2'), cup('dfb-pokal', 'DFB-Pokal', 'cup'), cup('dfl-supercup', 'DFL-Supercup', 'supercup')],
    fr: [cup('ligue-1', 'Ligue 1', 'league'), cup('ligue-2', 'Ligue 2', 'league2'), cup('coupe-de-france', 'Coupe de France', 'cup'), cup('trophee-des-champions', 'Trophée des Champions', 'supercup')],
  };
  COUNTRIES.forEach((c) => { c.cups = CUPS[c.id] || []; });

  // Turnir formati (davlat sahifasi pastida). Hozircha faqat Angliya uchun yozilgan.
  const FORMATS = {
    en: {
      leagues: {
        'premier-league': {
          uz: ['20 ta klub', "1–5-o'rinlar: Chempionlar ligasi (UEFA CL) ro'yxatiga kiradi", "6–7-o'rinlar: Yevropa ligasiga kiradi", "8–9-o'rinlar: Konferensiya ligasiga o'tadi", "Oxirgi 3 o'rin: Championshipga tushadi"],
          en: ['20 clubs', '1st–5th: enter the Champions League (UEFA CL) list', '6th–7th: enter the Europa League', '8th–9th: go to the Conference League', 'Bottom 3: relegated to the Championship'],
          ru: ['20 клубов', '1–5 места: попадают в список Лиги чемпионов (УЕФА)', '6–7 места: попадают в Лигу Европы', '8–9 места: выходят в Лигу конференций', 'Последние 3 места: вылетают в Чемпионшип'],
        },
        championship: {
          uz: ['24 ta klub (2-liga)', "1-o'rin: Yevropa ligasiga kiradi va Premier Ligaga chiqadi", "2–3-o'rinlar: Premier Ligaga chiqadi"],
          en: ['24 clubs (2nd tier)', '1st: enters the Europa League and is promoted to the Premier League', '2nd–3rd: promoted to the Premier League'],
          ru: ['24 клуба (2-я лига)', '1 место: попадает в Лигу Европы и выходит в Премьер-лигу', '2–3 места: выходят в Премьер-лигу'],
        },
      },
      cups: [
        {
          id: 'fa-cup', name: 'FA Cup',
          uz: ["Championshipdan 6 ta klub saralanadi: 24 klub tasodifiy o'zaro o'ynaydi → 12 ta qoladi, ular yana tasodifiy o'ynaydi → 6 ta qoladi", "Premier Ligadan 10 ta klub saralanadi: 20 klub tasodifiy o'zaro o'ynaydi → 10 ta qoladi", "Jami 6 + 10 = 16 klub FA Cup'da o'ynaydi", "G'olib Yevropa ligasi ro'yxatiga kiradi"],
          en: ['6 clubs qualify from the Championship: all 24 clubs play each other at random → 12 remain, then they are paired at random again → 6 remain', '10 clubs qualify from the Premier League: all 20 clubs play each other at random → 10 remain', 'In total 6 + 10 = 16 clubs play the FA Cup', 'The winner enters the Europa League list'],
          ru: ['Из Чемпионшипа проходят 6 клубов: 24 клуба играют друг с другом случайным образом → остаются 12, затем их снова случайно разбивают на пары → остаются 6', 'Из Премьер-лиги проходят 10 клубов: 20 клубов играют случайным образом → остаются 10', 'Всего 6 + 10 = 16 клубов играют в Кубке Англии', 'Победитель попадает в список Лиги Европы'],
        },
        {
          id: 'community-shield', name: 'Community Shield',
          uz: ["Premier Liga g'olibi va FA Cup g'olibi o'rtasidagi o'yin", "Agar ikkala kubokni bitta klub yutgan bo'lsa, Community Shield g'olibi avtomatik shu klub bo'ladi"],
          en: ['A match between the Premier League winner and the FA Cup winner', 'If one club won both, it automatically becomes the Community Shield winner'],
          ru: ['Матч между победителем Премьер-лиги и обладателем Кубка Англии', 'Если оба трофея выиграл один клуб, он автоматически становится обладателем Суперкубка'],
        },
      ],
    },
    es: {
      leagues: {
        laliga: {
          uz: ['20 ta klub', "1–4-o'rinlar: Chempionlar ligasi (UEFA CL) ro'yxatiga kiradi", "5–6-o'rinlar: Yevropa ligasiga kiradi", "7-o'rin: Konferensiya ligasiga o'tadi", "Oxirgi 3 o'rin: LaLiga 2 ga tushadi"],
          en: ['20 clubs', '1st–4th: enter the Champions League (UEFA CL) list', '5th–6th: enter the Europa League', '7th: goes to the Conference League', 'Bottom 3: relegated to LaLiga 2'],
          ru: ['20 клубов', '1–4 места: попадают в список Лиги чемпионов (УЕФА)', '5–6 места: попадают в Лигу Европы', '7 место: выходит в Лигу конференций', 'Последние 3 места: вылетают в Ла Лигу 2'],
        },
        'laliga-2': {
          uz: ['22 ta klub (2-liga)', "1–2-o'rinlar: LaLigaga chiqadi", "Oxirgi 4 o'rin: pastki ligaga tushadi"],
          en: ['22 clubs (2nd tier)', '1st–2nd: promoted to LaLiga', 'Bottom 4: relegated'],
          ru: ['22 клуба (2-я лига)', '1–2 места: выходят в Ла Лигу', 'Последние 4 места: вылетают'],
        },
      },
      cups: [
        {
          id: 'copa-del-rey', name: 'Copa del Rey',
          uz: ["LaLiga 2 dan 6 ta klub saralanadi: 22 klub tasodifiy o'zaro o'ynaydi → 11 ta qoladi, ular yana tasodifiy o'ynaydi (toq bo'lgani uchun bitta klub o'yinsiz o'tadi) → 6 ta qoladi", "LaLigadan 10 ta klub saralanadi: 20 klub tasodifiy o'zaro o'ynaydi → 10 ta qoladi", "Jami 6 + 10 = 16 klub Copa del Rey'da o'ynaydi", "G'olib Yevropa ligasi ro'yxatiga kiradi"],
          en: ['6 clubs qualify from LaLiga 2: all 22 clubs play each other at random → 11 remain, then they are paired at random again (one club gets a bye because the number is odd) → 6 remain', '10 clubs qualify from LaLiga: all 20 clubs play each other at random → 10 remain', 'In total 6 + 10 = 16 clubs play the Copa del Rey', 'The winner enters the Europa League list'],
          ru: ['Из Ла Лиги 2 проходят 6 клубов: 22 клуба играют друг с другом случайным образом → остаются 11, затем их снова случайно разбивают на пары (один клуб проходит без игры, так как число нечётное) → остаются 6', 'Из Ла Лиги проходят 10 клубов: 20 клубов играют случайным образом → остаются 10', 'Всего 6 + 10 = 16 клубов играют в Кубке Испании', 'Победитель попадает в список Лиги Европы'],
        },
        {
          id: 'supercopa', name: 'Supercopa de España',
          uz: ["LaLiga g'olibi va Copa del Rey g'olibi o'rtasidagi o'yin", "Agar ikkala kubokni bitta klub yutgan bo'lsa, Supercopa g'olibi avtomatik shu klub bo'ladi"],
          en: ['A match between the LaLiga winner and the Copa del Rey winner', 'If one club won both, it automatically becomes the Supercopa winner'],
          ru: ['Матч между победителем Ла Лиги и обладателем Кубка Испании', 'Если оба трофея выиграл один клуб, он автоматически становится обладателем Суперкубка'],
        },
      ],
    },
  };

  const countryById = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
  const leaguesOf = (countryId) => LEAGUES.filter((l) => l.country === countryId);

  const byId = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));
  const clubName = (leagueId, clubId) => byId[leagueId]?.clubs.find((c) => c.id === clubId)?.name || clubId;
  // Kubok (sotiladigan/yutiladigan): ligalar + FA Cup, Community Shield, Copa del Rey, Supercopa
  const TROPHY_CUP_IDS = ['fa-cup', 'community-shield', 'copa-del-rey', 'supercopa'];
  const cupInfo = (id) => COUNTRIES.flatMap((c) => c.cups || []).find((k) => k.id === id);
  const trophyName = (id) => byId[id]?.name || cupInfo(id)?.name || id;
  const data = { season: 6, LEAGUES, byId, clubName, CONTINENTS, COUNTRIES, FORMATS, countryById, leaguesOf, TROPHY_CUP_IDS, cupInfo, trophyName };
  if (typeof module !== 'undefined') module.exports = data; else root.EFL = data;
})(this);
