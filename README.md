# eFootball Telegram Mini App

## Ishga tushirish
1. `cp .env.example .env` va to'ldiring:
   - `BOT_TOKEN` — @BotFather tokeni
   - `MONGO_URI` — MongoDB Atlas ulanish manzili
   - `MINI_APP_URL` — botni qo'yadigan HTTPS domen (masalan `https://sizning-domen.uz`)
   - `PORT` — 3000
   - `ADMIN_IDS` — global adminlarning Telegram ID'lari, vergul bilan (masalan `123456789,987654321`)
2. `npm install`
3. `npm start`

Adminlar botda **/admin** buyrug'i bilan ham panelni ochishi mumkin. Turnir yaratgan foydalanuvchi avtomatik o'sha turnirning tashkilotchisi bo'ladi va unga ham admin panel ko'rinadi.

Bot mini app fayllarini (`webapp/`) o'zi beradi, shuning uchun `MINI_APP_URL` shu server turgan HTTPS domen bo'lishi kerak.
Mahalliy sinov uchun: `ngrok http 3000` va chiqqan https manzilni `MINI_APP_URL` ga qo'ying.

## Norasmiy turnirlar va admin panel

Bosh sahifadagi **Norasmiy turnirlar** kartasi `#private` bo'limini ochadi. Eski «Yopiq turnirlar» nomi hamma joyda **«Norasmiy turnirlar»**ga almashtirilgan (uz/en/ru).

### Turnir yaratish
- **+ Yangi turnir** → nom va ishtirokchilar soni (2–32).
- Turnirni yaratgan foydalanuvchi avtomatik ishtirokchi va tashkilotchi bo'ladi.
- `ADMIN_IDS` dagi global adminlar istalgan turnirni boshqara oladi.
- Ro'yxatda turnir holati, ishtirokchilar soni, o'yinlar soni va admin uchun tasdiq kutayotgan natijalar soni ko'rinadi.

### Admin panel
Turnir sahifasidagi **🛡 Admin** tabida:
1. **Natijalar** — raqib tasdiqlamagan (`pending`) yoki bekor qilingan (`disputed`) natijalar. Admin tasdiqlaydi, boshqa hisob kiritadi yoki rad etadi.
2. **Qur'a va vaqtlar** — bir davrali qur'a (har kim har kim bilan bir marta), turlar orasidagi interval, har bir o'yin vaqtini qo'lda o'zgartirish, qo'lda o'yin qo'shish.
3. **Ishtirokchilar** — @username yoki Telegram ID bo'yicha qo'shish; topilmasa ismni qo'lda yozish; o'yindan chiqarish (u bilan bog'liq o'yinlar ham o'chadi).
4. **Sozlamalar** — turnir nomi, turnirni tugatish / qayta ochish.

### Natija kiritish logikasi
1. O'yinchi o'z o'yini kartasida **Natija kiritish**ni bosadi va hisobni yuboradi → holat `pending`.
2. Raqib **Tasdiqlash**ni bossa → holat `confirmed`, hisob **avtomatik jadvalga** tushadi.
3. Raqib **Yolg'on**ni bossa → kiritilgan hisob bekor qilinadi (`disputed`), jadval o'zgarmaydi va admin panelda «Hisob kiritish» paydo bo'ladi.
4. Admin kiritgan/tasdiqlagan natija darhol jadvalga tushadi (`resultSource: admin`).
5. Faqat `confirmed` o'yinlar jadvalda hisoblanadi. O'z hisobini o'zi tasdiqlash taqiqlangan.

Natijalar haqida raqibga Telegram xabari yuboriladi; nizo bo'lsa tashkilotchi va global adminlarga ham xabar boradi.

### Sinov
```bash
npm test                 # qur'a/jadval sof logikasi
node test/api.e2e.js     # to'liq API oqimi (lokal MongoDB kerak)
```

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
