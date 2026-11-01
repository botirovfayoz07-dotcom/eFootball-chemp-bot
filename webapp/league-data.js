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

  const byId = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));
  const clubName = (leagueId, clubId) => byId[leagueId]?.clubs.find((c) => c.id === clubId)?.name || clubId;
  const data = { season: 6, LEAGUES, byId, clubName };
  if (typeof module !== 'undefined') module.exports = data; else root.EFL = data;
})(this);
