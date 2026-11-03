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

## Rasmiy turnirlar (joriy tuzilma)
- **Bosh sahifa:** Rasmiy turnirlar · Shaxsiy turnirlar · **Divizion** (avval "Teamlar jangi"; Divizion hozircha "Tez orada").
- **Rasmiy turnirlar → rejimlar:** Rasmiy turnirlar (avval "Ligalar") · Jahon chempionati · CL · EL · **Konferensiya ligasi** · AFC. Divizion bu yerdan olib tashlandi.
- **Rasmiy turnirlar rejimi:** Europe | Asia | Africa tablari. Yevropaning 12 davlati ochiq (Angliya, Ispaniya, Italiya, Germaniya, Fransiya, Portugaliya, Turkiya, Niderlandiya, Belgiya, Avstriya, Daniya, Shveytsariya), 6 qator × 2 ustun. Asia va Africa davlatlari hozircha yopiq (🔒). Davlatni ochish: `league-data.js` → `COUNTRIES` da `open: true`.
- **Davlat sahifasi:** kuboklar (bosilmaydi) → turnir tanlash karuseli → «Ro'yxatdan o'tish» → klublar → turnir formati. Faqat ro'yxatdan o'tmaganlarga ko'rinadi.
- **Ro'yxatdan o'tgach pastki menyu:** **Ma'lumotlar · Me · Do'kon** (Reyting va Sovrinlar olib tashlandi).
  - **Ma'lumotlar:** tepada kuboklar, undan pastda qaysi ligadaligingiz + liga reytingi (jadval), eng pastda turnir formati va qoidalar.
  - **Me:** profil → **Kolleksiya** (yutilgan kubok / sotib olingan narsalar; hozircha bo'sh) → klublarim (logotiplar). Klub ichida: chapda «Klubdan voz kechaman» (klub ro'yxatdan o'tish ro'yxatiga qaytadi), o'ngda «Auksionga qo'yaman» (narx kiritiladi, lot Do'kon → Auksionga tushadi), pastda «Mening o'yinlarim».
  - **Do'kon → Auksion:** auksionga qo'yilgan klublar ro'yxati. O'z lotini olib qo'yish mumkin; «Sotib olish» valyuta tizimi tayyor bo'lgach ishga tushadi.
- **API (bot.js):** `/api/profile`, `/api/leave`, `/api/auction`, `/api/auction/cancel`, `/api/auctions`. Eski `/api/claim` va "topshiraman" olib tashlandi; `Registration.releasing` o'rniga `auction { price, at }`.
- **Rasmlar:** `webapp/img-map.js` yuklangan `cards/Yevropa/...` fayllarini liga va klublarga bog'laydi (fayl nomi bo'yicha). Rasm topilmasa klub nomining bosh harfi chiqadi.

## Norasmiy turnirlar (videodagi bo'lim)
Bosh sahifadagi "Yopiq turnirlar" kartasi "Norasmiy turnirlar" deb nomlandi va videodagidek to'liq bo'lim qilindi (to'lovsiz). Kod: `unofficial.js` (server), `webapp/unofficial.js` (ilova), modellar `Tournament`, `TMatch`.
- **Tuzish:** nom, o'yinchilar soni (4–64), liga turlari soni, play-off (yo'q / top 4 / 8 / 16), tur davomiyligi (1–7 kun). Bir foydalanuvchi ko'pi bilan 3 ta faol turnir tuza oladi (adminlarga cheklov yo'q).
- **Qo'shilish:** taklif havolasi `t.me/<bot>?start=t_KOD` (ilovada "Ulashish" tugmasi) yoki kodni kiritish. Jamoa nomi ixtiyoriy.
- **Qura:** tashkilotchi vaqt belgilaydi (bot o'zi qura qiladi) yoki "Hozir qura qilish". Har bir o'yinchi turlar soni qadar turli raqib bilan o'ynaydi. Tur muddati — har tur oxirgi kuni 23:59 (Toshkent).
- **Tablar:** Asosiy (sizning o'yiningiz, taklif, raqib/tashkilotchiga yozish, qoidalar), Reyting (Jadval · Setka · Joriy tur · To'p urarlar), Profil (barcha o'yinlarim), Sovrinlar (Oltin butsa, Oltin to'p, kubok), Boshqaruv (faqat tashkilotchi va adminlar).
- **Play-off:** liga tugagach tashkilotchi "Play-offni boshlash" ni bosadi (top N urug'lanib setka tuziladi, har tur tugaganda keyingisi avtomatik yaratiladi, final g'olibi chempion). Play-offda durang yo'q.
- **Katta hisob:** biror tomon 6+ gol urgan bo'lsa, raqib tasdiqlagandan keyin ham hisob tashkilotchi/admin tasdig'ini kutadi (videodagi "Big score").
- **Xona ID:** o'yin kartasidagi 💬 tugmasi — raqibga bot orqali xona ID yuborish yoki unga Telegramda yozish.
- **Admin panel → Turnirlar:** admin barcha turnirlarni ko'radi va istalganini tashkilotchi sifatida boshqara oladi.
- Videodagi ilovaga ichki chat qo'shilmadi: "Chat" o'rniga Telegramdagi shaxsiy yozishma ochiladi.

## O'yin hisobi (tasdiqlash mantig'i)
Me → klub → *Mening o'yinlarim*. Qura o'tkazilgach har bir o'yinchida o'z o'yinlari chiqadi:
1. Biri **Hisob kiritish** ni bosib hisobni yuboradi (o'yin `pending` bo'ladi, raqibga botdan xabar boradi). Raqib tasdiqlamaguncha kiritgan odam hisobni o'zgartira oladi.
2. Raqib **Tasdiqlash** ni bossa — hisob avtomatik reyting jadvaliga o'tadi (`confirmed`).
3. Raqib **Yolg'on** ni bossa — kiritilgan hisob bekor qilinadi (`disputed`, jadvalga o'tmaydi), adminlarga xabar boradi va natijani admin panelda kiritadi.

## Admin panel
`.env` dagi `ADMIN_IDS` dagi foydalanuvchilarga bosh sahifada "Admin panel" tugmasi chiqadi (yoki botda `/admin`).
- **Natijalar** — kutayotgan/bahsli o'yinlar; admin hisobni kiritadi yoki tasdiqlaydi (tasdiqlangan natijani ham o'zgartirish mumkin). Ikkala o'yinchiga xabar boradi.
- **Qura** — har bir liga uchun qura vaqtini belgilash (vaqti kelganda bot o'zi qura qiladi, har daqiqada tekshiradi), "Hozir qura qilish", 1 yoki 2 davra tanlash, hisob kiritilmagan bo'lsa qayta qura.
- **Ishtirokchilar** — ishtirokchini ligadan chiqarish (uning o'yinlari bekor, natijalari jadvaldan olib tashlanadi) va qo'shish (@username yoki Telegram ID; qura o'tgan bo'lsa unga qolganlar bilan o'yinlar qo'shiladi).

Yangi fayllar: `models/Match.js`, `models/LeagueConfig.js`, `fixtures.js` (qura va jadval hisobi), `webapp/admin.js`. Jadval (`pts, w, d, l, gf, ga`) har safar tasdiqlangan o'yinlardan qayta hisoblanadi. Klub "topshirilsa", uning o'yinlari ham yangi egasiga o'tadi.
