# Rasmlar ro'yxati

Hamma rasm `webapp/cards/` ichida. Fayl nomi aynan shunday bo'lsin, kodni o'zgartirish shart emas.
Rasm qo'yilmasa ilova buzilmaydi. 1-va 2-bo'limdagi 9 ta karta rasmi qo'yilgan. Liga va klub logotiplari (3-4 bo'lim) hali qo'yilmagan — shu paytgacha klub o'rnida bosh harf ko'rinadi.

**Muhim:** rejim rasmlari (`modes/`) ramkasiz va (leagues / world / division uchun) yozuvsiz bo'lishi kerak — ramka va yozuvni ilova o'zi chizadi (3 tilda). Aks holda ramka va yozuv ikki marta chiqadi.

## 1. Bosh sahifa kartalari — `webapp/cards/`
| Fayl | Karta | O'lcham |
|---|---|---|
| official.jpg | Rasmiy turnirlar | 1040×450 |
| private.jpg | Shaxsiy turnirlar | 1040×450 |
| team.jpg | Teamlar jangi (qahramonlar o'ng yarmida) | 1040×570 |

## 2. Rejim kartalari — `webapp/cards/modes/` (1060×444)
leagues.jpg, world.jpg, cl.jpg, el.jpg, afc.jpg, division.jpg
(cl / el / afc rasmining o'zida logo va yozuv bo'ladi; leagues / world / division ustiga yozuv kod orqali chiqadi)

## 3. Liga logotiplari — `webapp/cards/leagues/` (PNG, shaffof fon, ~200×200)
1-ligalar: laliga, premier-league, bundesliga, serie-a, ligue-1, liga-portugal, super-lig, superliga, saudi-pro-league, uae-pro-league, j1-league
2-ligalar: laliga-2, championship, bundesliga-2, serie-b, ligue-2, liga-portugal-2
(hammasi `.png`, masalan `laliga.png`)

## 4. Klub logotiplari — `webapp/cards/clubs/` (PNG, shaffof fon, ~200×200)
Fayl nomi = klub nomining kichik harfli, defisli ko'rinishi (`Real Madrid` → `real-madrid.png`, `Atlético Madrid` → `atletico-madrid.png`). To'liq ro'yxatni `webapp/league-data.js` dan olish mumkin; quyidagi buyruq barcha fayl nomlarini chiqaradi:

    node -e "require('./webapp/league-data').LEAGUES.forEach(l=>l.clubs.forEach(c=>console.log(l.id+'/'+c.id+'.png')))"

Logotip bo'lmasa klub o'rnida bosh harf ko'rinadi.

## 5. Bayroqlar
Davlat bayroqlari hozircha emoji (🇬🇧 🇪🇸 ...) bilan chiqadi, rasm shart emas. Eslatma: Windows kompyuterida emoji bayroqlar harf ko'rinishida chiqadi, telefonda (Telegram) to'g'ri ko'rinadi. Rasm bilan almashtirmoqchi bo'lsangiz — ayting.

Liga logotipi (3-bo'lim) endi davlat sahifasidagi **kubok kartasi** sifatida ham ishlatiladi; rasm bo'lmasa 🏆 belgisi chiqadi.

## 6. Kubok rasmlari — `webapp/cards/kubok/` (PNG, shaffof fon, ~200×200)
Davlat sahifasining tepasida 4 ta kubok yonma-yon turadi (bosilmaydi), tagida nomi va turi yoziladi. Rasm bo'lmasa 🏆 chiqadi.
- **England:** `premier-league.png`, `championship.png`, `fa-cup.png`, `community-shield.png`
- **Spain:** `laliga.png`, `laliga-2.png`, `copa-del-rey.png`, `supercopa.png`
- **Italy:** `serie-a.png`, `serie-b.png`, `coppa-italia.png`, `supercoppa.png`
- **Germany:** `bundesliga.png`, `bundesliga-2.png`, `dfb-pokal.png`, `dfl-supercup.png`
- **France:** `ligue-1.png`, `ligue-2.png`, `coupe-de-france.png`, `trophee-des-champions.png`

Turnir tanlash kartalari (Premier League, Championship) uchun esa 3-bo'limdagi `webapp/cards/leagues/premier-league.png`, `championship.png` ishlatiladi.
