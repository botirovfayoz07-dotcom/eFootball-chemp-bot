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
