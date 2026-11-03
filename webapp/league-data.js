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
    L('liga-portugal', 'Liga Portugal', 1, 18, ['Arouca', 'Benfica', 'Boavista', 'Braga', 'Casa Pia', 'Estoril', 'Estrela Amadora', 'Famalicão', 'Gil Vicente', 'Marítimo', 'Moreirense', 'Nacional', 'Paços de Ferreira', 'Porto', 'Rio Ave', 'Santa Clara', 'Sporting CP', 'Vitória SC']),
    L('super-lig', 'Süper Lig', 1, 18, ['Adana Demirspor', 'Alanyaspor', 'Ankaragücü', 'Antalyaspor', 'Başakşehir', 'Beşiktaş', 'Fenerbahçe', 'Galatasaray', 'Gaziantep', 'Hatayspor', 'Kasımpaşa', 'Kayserispor', 'Konyaspor', 'Pendikspor', 'Rizespor', 'Samsunspor', 'Sivasspor', 'Trabzonspor']),
    L('superliga', 'Superliga', 1, 16, ['AGMK', 'Andijon', 'Bunyodkor', 'Buxoro', 'Dinamo Samarqand', 'Lokomotiv', 'Mashal', 'Nasaf', 'Navbahor', 'Neftchi', 'Pakhtakor', 'Qizilqum', 'Sogdiana', 'Surkhon', 'Turon', 'Xorazm']),
    L('saudi-pro-league', 'Saudi Pro Liga', 1, 18, ['Abha', 'Al Ahli', 'Al Ettifaq', 'Al Fateh', 'Al Fayha', 'Al Hazem', 'Al Hilal', 'Al Ittihad', 'Al Khaleej', 'Al Nassr', 'Al Okhdood', 'Al Raed', 'Al Riyadh', 'Al Shabab', 'Al Taawoun', 'Al Tai', 'Al Wehda', 'Damac']),
    L('uae-pro-league', 'UAE Pro Liga', 1, 14, ['Ajman', 'Al Ain', 'Al Bataeh', 'Al Jazira', 'Al Nasr', 'Al Orooba', 'Al Wahda', 'Al Wasl', 'Bani Yas', 'Dibba Al Fujairah', 'Emirates Club', 'Khor Fakkan', 'Sharjah', 'Shabab Al Ahli']),
    L('j1-league', 'J1 Liga', 1, 20, ['Albirex Niigata', 'Avispa Fukuoka', 'Cerezo Osaka', 'Consadole Sapporo', 'FC Tokyo', 'Gamba Osaka', 'Jubilo Iwata', 'Kashima Antlers', 'Kashiwa Reysol', 'Kawasaki Frontale', 'Kyoto Sanga', 'Machida Zelvia', 'Nagoya Grampus', 'Sagan Tosu', 'Sanfrecce Hiroshima', 'Shonan Bellmare', 'Tokyo Verdy', 'Urawa Reds', 'Vissel Kobe', 'Yokohama F. Marinos']),
    // ——— 2-ligalar ———
    L('laliga-2', 'LaLiga 2', 2, 22, ['Albacete', 'Alcorcón', 'Amorebieta', 'Andorra', 'Burgos', 'Cartagena', 'Eibar', 'Eldense', 'Elche', 'Espanyol', 'Huesca', 'Leganés', 'Levante', 'Mirandés', 'Oviedo', 'Racing Ferrol', 'Racing Santander', 'Sporting Gijón', 'Tenerife', 'Valladolid', 'Villarreal B', 'Zaragoza']),
    L('championship', 'Championship', 2, 24, ['Birmingham City', 'Blackburn Rovers', 'Bristol City', 'Cardiff City', 'Coventry City', 'Huddersfield', 'Hull City', 'Ipswich Town', 'Leeds United', 'Leicester City', 'Middlesbrough', 'Millwall', 'Norwich City', 'Plymouth Argyle', 'Preston', 'QPR', 'Rotherham', 'Sheffield Wednesday', 'Southampton', 'Stoke City', 'Sunderland', 'Swansea City', 'Watford', 'West Brom']),
    L('bundesliga-2', '2. Bundesliga', 2, 18, ['Braunschweig', 'Düsseldorf', 'Elversberg', 'Greuther Fürth', 'Hamburg', 'Hannover 96', 'Hansa Rostock', 'Hertha Berlin', 'Holstein Kiel', 'Kaiserslautern', 'Karlsruhe', 'Magdeburg', 'Nürnberg', 'Osnabrück', 'Paderborn', 'Schalke 04', 'St. Pauli', 'Wehen Wiesbaden']),
    L('serie-b', 'Serie B', 2, 20, ['Ascoli', 'Bari', 'Brescia', 'Catanzaro', 'Cittadella', 'Como', 'Cosenza', 'Cremonese', 'FeralpiSalò', 'Lecco', 'Modena', 'Palermo', 'Parma', 'Pisa', 'Reggiana', 'Sampdoria', 'Spezia', 'Südtirol', 'Ternana', 'Venezia']),
    L('ligue-2', 'Ligue 2', 2, 18, ['Amiens', 'Angers', 'Annecy', 'Auxerre', 'Bastia', 'Bordeaux', 'Caen', 'Concarneau', 'Dunkerque', 'Grenoble', 'Guingamp', 'Laval', 'Paris FC', 'Pau', 'Quevilly-Rouen', 'Rodez', 'Saint-Étienne', 'Troyes']),
    L('liga-portugal-2', 'Liga Portugal 2', 2, 18, ['Académica', 'Amarante', 'AVS', 'Benfica B', 'Chaves', 'Farense', 'Feirense', 'Felgueiras', 'Leixões', 'Lusitânia Lourosa', 'Penafiel', 'Porto B', 'Portimonense', 'Sporting CP B', 'Tondela', 'Torreense', 'União Leiria', 'Vizela']),
  ];

  // ——— Qit'alar, davlatlar, kuboklar ———
  // Qit'alar hammasi ochiq. Davlat esa `open: true` bo'lsagina ochiladi (hozircha 5 ta).
  const CONTINENTS = [{ id: 'europe', open: true }, { id: 'asia', open: true }, { id: 'africa', open: true }];
  const K = (continent, id, flag, uz, en, ru, open) => ({ id, continent, flag, open: !!open, name: { uz, en, ru } });
  const COUNTRIES = [
    // Europe (ochiq: Angliya, Ispaniya, Italiya, Germaniya, Fransiya)
    K('europe', 'en', '🇬🇧', 'Angliya', 'England', 'Англия', true),
    K('europe', 'es', '🇪🇸', 'Ispaniya', 'Spain', 'Испания', true),
    K('europe', 'it', '🇮🇹', 'Italiya', 'Italy', 'Италия', true),
    K('europe', 'de', '🇩🇪', 'Germaniya', 'Germany', 'Германия', true),
    K('europe', 'fr', '🇫🇷', 'Fransiya', 'France', 'Франция', true),
    K('europe', 'pt', '🇵🇹', 'Portugaliya', 'Portugal', 'Португалия'),
    K('europe', 'tr', '🇹🇷', 'Turkiya', 'Turkey', 'Турция'),
    K('europe', 'nl', '🇳🇱', 'Niderlandiya', 'Netherlands', 'Нидерланды'),
    K('europe', 'be', '🇧🇪', 'Belgiya', 'Belgium', 'Бельгия'),
    K('europe', 'at', '🇦🇹', 'Avstriya', 'Austria', 'Австрия'),
    K('europe', 'gr', '🇬🇷', 'Gresiya', 'Greece', 'Греция'),
    K('europe', 'ch', '🇨🇭', 'Shveytsariya', 'Switzerland', 'Швейцария'),
    // Asia (hammasi yopiq)
    K('asia', 'uz', '🇺🇿', "O'zbekiston", 'Uzbekistan', 'Узбекистан'),
    K('asia', 'jp', '🇯🇵', 'Yaponiya', 'Japan', 'Япония'),
    K('asia', 'sa', '🇸🇦', 'Saudiya Arabistoni', 'Saudi Arabia', 'Саудовская Аравия'),
    K('asia', 'ae', '🇦🇪', 'BAA', 'UAE', 'ОАЭ'),
    K('asia', 'kr', '🇰🇷', 'Janubiy Koreya', 'South Korea', 'Южная Корея'),
    K('asia', 'cn', '🇨🇳', 'Xitoy', 'China', 'Китай'),
    K('asia', 'qa', '🇶🇦', 'Qatar', 'Qatar', 'Катар'),
    K('asia', 'ir', '🇮🇷', 'Eron', 'Iran', 'Иран'),
    K('asia', 'kz', '🇰🇿', "Qozog'iston", 'Kazakhstan', 'Казахстан'),
    K('asia', 'in', '🇮🇳', 'Hindiston', 'India', 'Индия'),
    K('asia', 'th', '🇹🇭', 'Tailand', 'Thailand', 'Таиланд'),
    K('asia', 'jo', '🇯🇴', 'Iordaniya', 'Jordan', 'Иордания'),
    // Africa (hammasi yopiq)
    K('africa', 'eg', '🇪🇬', 'Misr', 'Egypt', 'Египет'),
    K('africa', 'ma', '🇲🇦', 'Marokash', 'Morocco', 'Марокко'),
    K('africa', 'dz', '🇩🇿', 'Jazoir', 'Algeria', 'Алжир'),
    K('africa', 'tn', '🇹🇳', 'Tunis', 'Tunisia', 'Тунис'),
    K('africa', 'ng', '🇳🇬', 'Nigeriya', 'Nigeria', 'Нигерия'),
    K('africa', 'za', '🇿🇦', 'JAR', 'South Africa', 'ЮАР'),
    K('africa', 'sn', '🇸🇳', 'Senegal', 'Senegal', 'Сенегал'),
    K('africa', 'gh', '🇬🇭', 'Gana', 'Ghana', 'Гана'),
    K('africa', 'cm', '🇨🇲', 'Kamerun', 'Cameroon', 'Камерун'),
    K('africa', 'ci', '🇨🇮', "Kot-d'Ivuar", 'Ivory Coast', 'Кот-д’Ивуар'),
    K('africa', 'ke', '🇰🇪', 'Keniya', 'Kenya', 'Кения'),
    K('africa', 'tz', '🇹🇿', 'Tanzaniya', 'Tanzania', 'Танзания'),
  ];

  // Qaysi liga qaysi davlatniki
  const COUNTRY_OF = {
    'premier-league': 'en', championship: 'en',
    laliga: 'es', 'laliga-2': 'es',
    'serie-a': 'it', 'serie-b': 'it',
    bundesliga: 'de', 'bundesliga-2': 'de',
    'ligue-1': 'fr', 'ligue-2': 'fr',
    'liga-portugal': 'pt', 'liga-portugal-2': 'pt',
    'super-lig': 'tr',
    superliga: 'uz', 'saudi-pro-league': 'sa', 'uae-pro-league': 'ae', 'j1-league': 'jp',
  };
  LEAGUES.forEach((l) => { l.country = COUNTRY_OF[l.id] || null; });

  // Davlat sahifasidagi kuboklar (faqat ko'rsatiladi, bosilmaydi). Rasm: webapp/cards/kubok/<id>.png
  // type: league | league2 | cup | supercup — tagiga yoziladigan tur nomi
  // auto: true — bu kubok qo'lda ochilmaydi, ligalar bilan bir kunda avtomatik start oladi
  const cup = (id, name, type) => ({ id, name, type, auto: type === 'cup' || type === 'supercup' });
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
  };

  // ——— MAVSUM KALENDARI ———
  // Qoida: bitta davlatning BARCHA ligalari va kuboklari bitta vaqtda boshlanadi.
  // Premier Liga, Championship, FA Cup va Community Shield — hammasi bitta start.
  // Sanani o'zgartirish: SEASON_START / SEASON_END muhit o'zgaruvchilari yoki shu yer.
  const envOf = (k) => (typeof process !== 'undefined' && process.env ? process.env[k] : null);
  const SEASON = {
    number: 6,
    // Start — shanba kuni, real futboldagidek. Ro'yxatdan o'tish `openDaysBefore` kun oldin ochiladi.
    startAt: envOf('SEASON_START') || '2026-12-19T18:00:00+05:00',
    endAt: envOf('SEASON_END') || '2027-06-06T21:00:00+05:00',
    openDaysBefore: 60,
    timezone: 'Asia/Tashkent',
  };

  const DAY_MS = 86400000;
  const toMs = (v) => {
    const t = Date.parse(String(v || ''));
    return Number.isFinite(t) ? t : null;
  };
  // Noto'g'ri sana kiritilsa — bugundan boshlab 1 yillik oyna (ilova ishlashdan to'xtamasligi uchun)
  const NOW_FALLBACK = Date.now();
  const SEASON_START_MS = toMs(SEASON.startAt) ?? NOW_FALLBACK;
  const SEASON_END_MS = toMs(SEASON.endAt) ?? SEASON_START_MS + 290 * DAY_MS;
  const SEASON_OPEN_MS = SEASON_START_MS - (Number(SEASON.openDaysBefore) || 0) * DAY_MS;

  // Mavsum holati: soon → registration → live → finished
  function seasonCalendar(nowMs) {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    let phase = 'finished';
    if (now < SEASON_OPEN_MS) phase = 'soon';
    else if (now < SEASON_START_MS) phase = 'registration';
    else if (now < SEASON_END_MS) phase = 'live';
    return {
      number: SEASON.number,
      phase,
      canRegister: phase === 'registration',
      now,
      opensAt: new Date(SEASON_OPEN_MS).toISOString(),
      startAt: new Date(SEASON_START_MS).toISOString(),
      endAt: new Date(SEASON_END_MS).toISOString(),
      timezone: SEASON.timezone,
      msToStart: SEASON_START_MS - now,
      msToEnd: SEASON_END_MS - now,
    };
  }

  const countryById = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
  const leaguesOf = (countryId) => LEAGUES.filter((l) => l.country === countryId);

  const byId = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));
  const clubName = (leagueId, clubId) => byId[leagueId]?.clubs.find((c) => c.id === clubId)?.name || clubId;

  // ——— Bitta davlat = bitta "paket": ligalar + avtomatik kuboklar bitta start bilan ———
  // Masalan Angliya: Premier Liga + Championship, ularga qo'shilib FA Cup + Community Shield.
  const bundleOfLeague = (leagueId) => byId[leagueId]?.country || null;

  function bundleInfo(countryId, nowMs) {
    const cal = seasonCalendar(nowMs);
    const c = countryById[countryId] || null;
    const leagues = leaguesOf(countryId).map((l) => ({ id: l.id, name: l.name, kind: 'league', group: l.group, auto: false }));
    const cups = ((c && c.cups) || [])
      .filter((k) => k.auto)
      .map((k) => ({ id: k.id, name: k.name, kind: k.type, auto: true }));
    return {
      country: countryId,
      number: cal.number,
      phase: cal.phase,
      canRegister: cal.canRegister,
      startAt: cal.startAt,
      endAt: cal.endAt,
      opensAt: cal.opensAt,
      timezone: cal.timezone,
      msToStart: cal.msToStart,
      // Hamma turnir bitta sanada
      sameStart: true,
      tournaments: [...leagues, ...cups],
    };
  }

  // Bitta turnirning holati (liga ham, kubok ham bir xil qoida bo'yicha)
  function tournamentStatus(tournamentId, nowMs) {
    const cal = seasonCalendar(nowMs);
    const country = bundleOfLeague(tournamentId) || (() => {
      const hit = COUNTRIES.find((x) => (x.cups || []).some((k) => k.id === tournamentId));
      return hit ? hit.id : null;
    })();
    return {
      id: tournamentId,
      country,
      phase: cal.phase,
      canRegister: cal.canRegister && !!byId[tournamentId],
      startAt: cal.startAt,
      endAt: cal.endAt,
      msToStart: cal.msToStart,
    };
  }

  const data = {
    season: SEASON.number,
    SEASON,
    seasonCalendar,
    bundleInfo,
    tournamentStatus,
    bundleOfLeague,
    LEAGUES, byId, clubName, CONTINENTS, COUNTRIES, FORMATS, countryById, leaguesOf,
  };
  if (typeof module !== 'undefined') module.exports = data; else root.EFL = data;
})(this);
