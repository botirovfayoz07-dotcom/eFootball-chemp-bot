# eFootball Telegram Mini App

## Ishga tushirish
1. `cp .env.example .env` va to'ldiring:
   - `BOT_TOKEN` — @BotFather tokeni
   - `MONGO_URI` — MongoDB Atlas ulanish manzili
   - `MINI_APP_URL` — botni qo'yadigan HTTPS domen (masalan `https://sizning-domen.uz`)
   - `PORT` — 3000
   - `ADMIN_IDS` — adminlarning Telegram ID lari, vergul bilan (masalan `123456789,987654321`)
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
/start → til tanlash → Kirish (ilova ichida yuklanish ekrani) → bosh sahifa → Rasmiy turnirlar → **Rasmiy turnirlar** (avvalgi "Ligalar") → qit'a → davlat:
- **Qit'alar:** tepada Europe | Asia | Africa, uchalasi ochiq. Europe tanlangan holda ochiladi.
- **Davlatlar:** har bir qit'ada 12 ta davlat, 6 qator × 2 ustun, bayroq + nom (`league-data.js` → `COUNTRIES`). Hozircha faqat 5 tasi ochiq (Angliya, Ispaniya, Italiya, Germaniya, Fransiya); qolganlari 🔒 (bosilsa "Tez orada"). Davlatni ochish: `open: true` qo'ying. Asia va Africa davlatlarining hammasi hozircha yopiq.
- **Davlat sahifasi (tartib):** davlat nomi → 4 ta kubok (bosilmaydi, tagida nomi/turi; rasm `cards/kubok/`) → **turnir tanlash** karuseli (Angliyada Premier League va Championship, rasm `cards/leagues/`) → «Ro'yxatdan o'tish» → klublar ro'yxati → turnir formati (tanlangan liga + kuboklar qoidalari). Klubni tanlab «Ro'yxatdan o'tish» bosiladi.
- **Turnir formatlari** (`FORMATS` ichida) hozircha faqat Angliya uchun: Premier League, Championship, FA Cup, Community Shield. Boshqa davlatlarda kubok rasmlari chiqadi, format matni keyin qo'shiladi. Kuboklarning o'zi (FA Cup, Community Shield) hali o'ynalmaydi — ular hozircha ma'lumot sifatida ko'rsatiladi.
- **Pastki menyu (Asosiy · Reyting · Profil · Sovrinlar · Do'kon)** faqat ro'yxatdan o'tgandan keyin ochiladi (`league.js` ichidagi `nav` funksiyasi; har doim ko'rsatish uchun `data.mine ?` shartini olib tashlang). Reyting va Profil avvalgidek.
- Liga ↔ davlat bog'lanishi: `COUNTRY_OF` (league-data.js). Superliga, Saudi, UAE va J1 ligalari Osiyo davlatlariga bog'langan; bu davlatlar yopiq bo'lgani uchun ular hozircha ko'rinmaydi.

Liga ichidagi imkoniyatlar:
- 17 ta liga karuseli (11 ta 1-liga + 6 ta 2-liga). Chapga-o'ngga surilganda tepadagi kartada liga nomi, o'yinchilar soni, maksimal va mavsum almashadi.
- Ro'yxatdan o'tmagan foydalanuvchiga tanlangan liganing klublari chiqadi; klub tanlab "Ro'yxatdan o'tish" bosiladi. Band klublar o'chiq turadi, liga to'lsa (TO'LIQ) tugma yopiladi.
- Ro'yxatdan o'tgan foydalanuvchiga klublar o'rniga uning ligasi/klubi haqida xabar chiqadi. Mavsumda faqat bitta ligada bitta klub olish mumkin.
- Profilda "Klubimni topshiraman" almashtirgichi: yoqilsa klub hamma ligalardagi bosh sahifada "Klubini topshirayotganlar" ro'yxatiga chiqadi. Ro'yxatda bo'lmagan foydalanuvchi uni "Olish" bilan oladi (jadval va natijalari bilan), eski egasi ligadan chiqadi va botdan xabar oladi.
- Reyting (1-ligalar / 2-ligalar, har bir liga alohida) va Profil.
- Qo'llanma (botdagi tugma to'g'ridan-to'g'ri Qo'llanmani ochadi).

Liga va klub ro'yxati: `webapp/league-data.js` (brauzer ham, server ham shu faylni ishlatadi). Maksimal o'yinchilar soni videodagi sonlar bo'yicha; klub nomlari qoralama — o'yindagi ro'yxatga qarab tekshiring.

Eslatma: MongoDB'da eski `league+season+telegramId` indeksi qolgan bo'lsa, yangi `season+telegramId` indeksi bilan birga ishlayveradi (xalaqit bermaydi).

## Norasmiy turnirlar
Bosh sahifadagi "Yopiq turnirlar" kartasi nomi "Norasmiy turnirlar" ga almashtirildi (uz/en/ru, `webapp/i18n.js`). Faqat nomi o'zgargan.

## O'yin hisobi (tasdiqlash mantig'i)
Profil → *Mening o'yinlarim*. Qura o'tkazilgach har bir o'yinchida o'z o'yinlari chiqadi:
1. Biri **Hisob kiritish** ni bosib hisobni yuboradi (o'yin `pending` bo'ladi, raqibga botdan xabar boradi). Raqib tasdiqlamaguncha kiritgan odam hisobni o'zgartira oladi.
2. Raqib **Tasdiqlash** ni bossa — hisob avtomatik reyting jadvaliga o'tadi (`confirmed`).
3. Raqib **Yolg'on** ni bossa — kiritilgan hisob bekor qilinadi (`disputed`, jadvalga o'tmaydi), adminlarga xabar boradi va natijani admin panelda kiritadi.

## Admin panel
`.env` dagi `ADMIN_IDS` dagi foydalanuvchilarga bosh sahifada "Admin panel" tugmasi chiqadi (yoki botda `/admin`).
- **Natijalar** — kutayotgan/bahsli o'yinlar; admin hisobni kiritadi yoki tasdiqlaydi (tasdiqlangan natijani ham o'zgartirish mumkin). Ikkala o'yinchiga xabar boradi.
- **Qura** — har bir liga uchun qura vaqtini belgilash (vaqti kelganda bot o'zi qura qiladi, har daqiqada tekshiradi), "Hozir qura qilish", 1 yoki 2 davra tanlash, hisob kiritilmagan bo'lsa qayta qura.
- **Ishtirokchilar** — ishtirokchini ligadan chiqarish (uning o'yinlari bekor, natijalari jadvaldan olib tashlanadi) va qo'shish (@username yoki Telegram ID; qura o'tgan bo'lsa unga qolganlar bilan o'yinlar qo'shiladi).

Yangi fayllar: `models/Match.js`, `models/LeagueConfig.js`, `fixtures.js` (qura va jadval hisobi), `webapp/admin.js`. Jadval (`pts, w, d, l, gf, ga`) har safar tasdiqlangan o'yinlardan qayta hisoblanadi. Klub "topshirilsa", uning o'yinlari ham yangi egasiga o'tadi.
