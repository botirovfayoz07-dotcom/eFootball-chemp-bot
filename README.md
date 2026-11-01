# eFootball Telegram Mini App

## Ishga tushirish
1. `cp .env.example .env` va to'ldiring:
   - `BOT_TOKEN` — @BotFather tokeni
   - `MONGO_URI` — MongoDB Atlas ulanish manzili
   - `MINI_APP_URL` — botni qo'yadigan HTTPS domen (masalan `https://sizning-domen.uz`)
   - `PORT` — 3000
2. `npm install`
3. `npm start`

Bot mini app fayllarini (`webapp/`) o'zi beradi, shuning uchun `MINI_APP_URL` shu server turgan HTTPS domen bo'lishi kerak.
Mahalliy sinov uchun: `ngrok http 3000` va chiqqan https manzilni `MINI_APP_URL` ga qo'ying.

## Rasmlar (o'zingiz qo'yasiz)
- `webapp/cards/official.jpg`, `private.jpg`, `team.jpg` — bosh sahifa kartalari
- `webapp/cards/modes/` — `leagues.jpg`, `world.jpg`, `cl.jpg`, `el.jpg`, `afc.jpg`, `division.jpg`
- `webapp/cards/leagues/` — liga logotiplari (`laliga.png`, `premier-league.png`, ...)
- `webapp/cards/clubs/` — klub logotiplari (`barcelona.png`, `real-madrid.png`, ...)

Rasm qo'yilmasa, ilova buzilmaydi: gradient yoki bo'sh joy ko'rinadi.

## Hozir ishlaydigan qismlar
/start → til tanlash → Kirish (ilova ichida yuklanish ekrani) → bosh sahifa → Rasmiy turnirlar → Ligalar:
- 17 ta liga karuseli (11 ta 1-liga + 6 ta 2-liga). Chapga-o'ngga surilganda tepadagi kartada liga nomi, o'yinchilar soni, maksimal va mavsum almashadi.
- Ro'yxatdan o'tmagan foydalanuvchiga tanlangan liganing klublari chiqadi; klub tanlab "Ro'yxatdan o'tish" bosiladi. Band klublar o'chiq turadi, liga to'lsa (TO'LIQ) tugma yopiladi.
- Ro'yxatdan o'tgan foydalanuvchiga klublar o'rniga uning ligasi/klubi haqida xabar chiqadi. Mavsumda faqat bitta ligada bitta klub olish mumkin.
- Profilda "Klubimni topshiraman" almashtirgichi: yoqilsa klub hamma ligalardagi bosh sahifada "Klubini topshirayotganlar" ro'yxatiga chiqadi. Ro'yxatda bo'lmagan foydalanuvchi uni "Olish" bilan oladi (jadval va natijalari bilan), eski egasi ligadan chiqadi va botdan xabar oladi.
- Reyting (1-ligalar / 2-ligalar, har bir liga alohida) va Profil.
- Qo'llanma (botdagi tugma to'g'ridan-to'g'ri Qo'llanmani ochadi).

Liga va klub ro'yxati: `webapp/league-data.js` (brauzer ham, server ham shu faylni ishlatadi). Maksimal o'yinchilar soni videodagi sonlar bo'yicha; klub nomlari qoralama — o'yindagi ro'yxatga qarab tekshiring.

Eslatma: MongoDB'da eski `league+season+telegramId` indeksi qolgan bo'lsa, yangi `season+telegramId` indeksi bilan birga ishlayveradi (xalaqit bermaydi).
