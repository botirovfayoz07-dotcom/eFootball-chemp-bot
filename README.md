# eFootball Telegram Mini App

## Ishga tushirish
1. `cp .env.example .env` va to'ldiring (`.env.example` ichida barcha o'zgaruvchilar bor, qiymatlarsiz):
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

## Do'kon: Coins, kosmetika, Sell
- To'lov kartasi **faqat `.env` da** saqlanadi (`PAY_CARD`, `PAY_HOLDER`). Kodda karta raqami yo'q. `PAY_CARD` bo'lmasa Coins to'lovi o'chiriladi va serverda ogohlantirish chiqadi.
- **Coins** (sariq tanga): paketlar va narxlar `webapp/shop-data.js` ichida (`PACKS`). Foydalanuvchi paketni tanlaydi, kartaga o'tkazadi va chek rasmini yuboradi → rasm adminlarga botda keladi (✅ Tasdiqlash / ❌ Rad etish) → tasdiqlansa Coins balansga qo'shiladi.
- **Kosmetika:** avatar ramkalari va profil fonlari (`FRAMES`, `BACKGROUNDS`), Coins evaziga. Ko'rish oynasida ‹ › bilan almashtiriladi; sotib olingach profilda yoqiladi, Me → Kolleksiyada ko'rinadi.
- **Sell:** Me → Kolleksiyadagi kubok Do'kon → Sell bo'limida sotiladi. «Sotish» → foydalanuvchi karta raqamini kiritadi → adminga yetib boradi (bazada faqat oxirgi 4 raqam saqlanadi) → foydalanuvchiga «24 soat ichida pulni tashlab beramiz» deyiladi. Admin pulni o'tkazgach botdagi «To'lab berildi» tugmasini bosadi → kubok foydalanuvchi ro'yxatidan chiqariladi. «Rad etish» bosilsa kubok qaytadi.
- **Kubok berish:** Admin panel → Ishtirokchilar → ligani tanlab, g'olib qatoridagi «🏆 Kubok» tugmasi (bir mavsumda bitta ligadan bitta kubok).
- **Kubok rasmlari:** `webapp/cards/kubok/` dagi yuklangan fayllar `webapp/img-map.js` (`CUP_FILES`) orqali kubok id larga ulangan.
- **API (bot.js):** `/api/shop`, `/api/shop/topup`, `/api/shop/buy`, `/api/shop/equip`, `/api/shop/sell`, `/api/admin/league/:id/award`. Modellar: `User` (coins, cosmetics, equipped), `Trophy`, `TopUp`.

## Boshqa ishtirokchi profili va futbolchi fonlari
- **Profilni ko'rish:** Ma'lumotlar → reyting jadvalidagi qatorni bosganda o'sha ishtirokchining profili ochiladi: kolleksiya (kuboklar, kosmetika), klublari va tanlagan ramka/foni. Telegram ID oshkor qilinmaydi (`/api/profile/view` klub bo'yicha egasini topadi).
- **Futbolchi fonlari** (Neymar Jr, Ronaldo, Messi, Shevchenko, Gullit, Ramos — 800 Coins): Do'kon → Kosmetika → "Futbolchi fonlari". Rasmlar `webapp/cards/players/<id>.jpg` (yoki `.png`) ga qo'yiladi: `neymar`, `ronaldo`, `messi`, `shevchenko`, `gullit`, `ramos`. Rasm qo'yilmaguncha fon o'rnida gradient ko'rinadi. Narxlar `webapp/shop-data.js` da.


## Dedlaynlar va avto-yutuq (lib/deadlines.js)
- **Tur davomiyligi:** admin panel → Qura → «Tur davomiyligi (kun)». Har tur oxirgi kuni 23:59 (Toshkent) tugaydi. Qura o'tgan, lekin dedlaynsiz ligalar uchun «⏰ Dedlaynsiz o'yinlarga dedlayn berish» tugmasi bor (tugallanmagan turlar hozirdan ketma-ket sanaladi).
- **Bildirishnomalar (o'yinchi tilida):** «Tur boshlandi» (2-turdan), dedlaynga 3 soat qolganda eslatma (hisob kiritilmagan o'yinda ikkala o'yinchiga; raqib hisob kiritgan bo'lsa — tasdiqlashi kerak bo'lgan tomonga), dedlayn o'tganda ogohlantirish. «Raqib hisob kiritdi» xabari avvaldan bor edi.
- **Avto-natija:** dedlayn + muhlat (`AUTO_GRACE_HOURS`, standart 12 soat) o'tgach, hisob **kiritilmagan** o'yinda: faqat bir tomon o'yin chatiga yozgan bo'lsa — unga 3:0 texnik g'alaba; hech kim yozmagan bo'lsa — o'yin bekor (jadvalga hisoblanmaydi); ikkala tomon ham yozgan bo'lsa — bahsli, admin hal qiladi.
- **O'zi hal qilinmaydigan holatlar:** raqib tasdig'i kutilayotgan (pending) va bahsli o'yinlar, FA Cup — adminga xabar boradi. Avto-natija admin panelda «🤖» belgisi bilan ko'rinadi, «Natijalar → Tasdiqlangan» orqali o'zgartirsa bo'ladi.
- **Norasmiy turnirlar:** dedlaynga 3 soat qolganda eslatma. FA Cup: 3 soatlik eslatma va dedlayn o'tganda adminga xabar.
- Dedlaynsiz (eski) o'yinlarga avto-natija qo'llanmaydi.

## Xavfsizlik, kunlik bonus va do'st taklifi
### .env sozlamalari
Namuna: `.env.example`. Asosiy o'zgaruvchilar: `BOT_TOKEN`, `MONGO_URI`, `MINI_APP_URL`, `ADMIN_IDS`, `PAY_CARD`, `PAY_HOLDER`. Qo'shimcha: `TRUST_PROXY=1` (server Render/Railway/Nginx orqasida bo'lsa — aks holda IP bo'yicha limit noto'g'ri ishlaydi), `REF_BONUS` (standart 20), `REF_MAX` (standart 50).

### Chek firibgarligi
- Har bir chek rasmining sha256 hash'i `TopUp.imageHash` da saqlanadi. Bir xil rasm ikkinchi marta yuborilsa — `duplicate` xatosi qaytadi. Hash unique indeks bilan himoyalangan, shuning uchun parallel so'rovlar ham o'tmaydi.
- Chekning rasmi o'zgartirilsa (boshqa siqish, skrinshot), hash boshqa chiqadi. Bu to'liq himoya emas: admin baribir chekni ko'zi bilan tekshiradi.

### Coins audit logi (`CoinLog`)
Coins balansiga tegadigan har bir o'zgarish yoziladi: `topup` (chek tasdiqlandi), `buy` (kosmetika), `daily`, `referral`, `admin` (qo'lda), `reversal` (tasdiqlangan to'lov qaytarildi). Har bir yozuvda sana, miqdor, sabab, bog'liq ID va admin ID bor.
- `GET /api/admin/coins/log?telegramId=123` — tarix (oxirgi 200 ta)
- `POST /api/admin/coins/adjust` — `{telegramId, delta, reason}` yoki `{topupId, reason?}` (tasdiqlangan to'lovni qaytarish). Sabab majburiy. O'yinchiga xabar yuboriladi. Balans manfiy bo'lmaydi.
Admin panelda bu uchun hozircha tugma yo'q; API orqali ishlaydi.

### Rate limit (express-rate-limit)
- Umumiy `/api`: daqiqada 600 so'rov
- Chek yuborish: 10 daqiqada 5 ta
- Do'kon, sotish, kunlik bonus: daqiqada 20 ta
- Chat, hisob kiritish, yordam: daqiqada 40 ta
Kalit: Telegram ID (initData imzosi tekshirilgan), aks holda IP. Limitdan o'tilsa `429` va `tooMany` xatosi qaytadi.

### Xatoliklar monitoringi
Server xatolari (API, bot, kutilmagan xatolar) adminlarga Telegramda yuboriladi. Bir xil xato 10 daqiqada bir marta keladi (spam bo'lmasin).

### Bazani zaxiralash (kodsiz, MongoDB Atlas'da)
1. Atlas → Cluster → **Backup** bo'limiga kiring. M0 (bepul) klasterda avtomatik backup yo'q: M2/M5 yoki boshqa pullik tarifga o'tish kerak, yoki `mongodump` ni kuniga bir marta cron orqali ishga tushiring.
2. Pullik tarifda **Continuous Backup** yoki kunlik snapshot'ni yoqing va saqlash muddatini belgilang (kamida 7 kun).
3. Tiklashni bir marta test qiling: test klasterga snapshot'dan tiklab, `users` va `topups` soni mos kelishini tekshiring.

### Kunlik bonus
- O'yinchi Do'kon → Coins bo'limida **Olish** tugmasini bosadi. Kuniga bir marta, Toshkent vaqti bo'yicha.
- Miqdor: 1-kun 5 Coins, har ketma-ket kun +1, 6-kundan boshlab 10 Coins. Bir kun o'tkazib yuborilsa seriya 1 dan boshlanadi.

### Do'st taklif qilish (referal)
- Har bir o'yinchida havola: `https://t.me/<bot>?start=ref_<telegram_id>` (Do'kon → Coins → Do'stlarni taklif qilish).
- Do'st havola orqali botga kirganda taklif yoziladi, lekin Coins darhol berilmaydi. Bonus **do'st birinchi marta ligaga yozilgandan keyin** beriladi. Shunda faqat bot hisoblarini ochish foydali emas.
- Taklif qilgan odamga +`REF_BONUS` Coins, va xabar yuboriladi. Bitta odam uchun `REF_MAX` tagacha bonus beriladi.
- O'zini o'zi taklif qilish mumkin emas. Bir kishi ikki marta bonus ololmaydi (`refPaid` bayrog'i).

## Avtomatik to'lov: Payme va Click
Do'kon → Coins → paket → **Payme orqali to'lash** yoki **Click orqali to'lash**. O'yinchi to'lov sahifasiga o'tadi, to'lovdan keyin Coins o'zi qo'shiladi (admin tasdig'i kerak emas). Qo'lda chek yuborish varianti ham qoladi.

### Merchant kabinetidagi sozlamalar
- **Payme Business** (merchant.paycom.uz): kassa ID si → `PAYME_MERCHANT_ID`, kalit → `PAYME_KEY`. Callback (Merchant API) manzili: `https://<domen>/payme`. Sinov uchun `PAYME_CHECKOUT_URL=https://checkout.test.paycom.uz` va sinov kassasi.
- **Click** (merchant kabinet): `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`. Prepare URL: `https://<domen>/click/prepare`, Complete URL: `https://<domen>/click/complete`.

### Qanday ishlaydi
- Payme: `CheckPerformTransaction` → `CreateTransaction` → `PerformTransaction` (Coins shu yerda qo'shiladi). Bajarilgan to'lov `CancelTransaction` bilan qaytarilishi mumkin, faqat Coins sarflanmagan bo'lsa. 12 soat ichida to'lanmagan tranzaksiya avtomatik bekor bo'ladi.
- Click: `prepare` → `complete` (Coins shu yerda qo'shiladi). Imzo MD5 bilan tekshiriladi.
- Ikkala holatda ham summa buyurtma summasiga qat'iy mos kelishi tekshiriladi, bir to'lov ikki marta Coins bermaydi, har bir o'zgarish `CoinLog` ga yoziladi.

### Muhim
- Payme login `Paycom` deb olingan (`PAYME_LOGIN`). Merchant kabinetda boshqacha bo'lsa, shuni yozing.
- Click'da xato kodlari va so'rov formati hujjatlar bo'yicha tekshirilgan, lekin **haqiqiy to'lov sinovdan o'tkazilishi kerak**: avval sinov kassasida 1 ta kichik to'lov qiling va `CoinLog` da yozuv borligini tekshiring.



## Ichki eslatmalar
- Sirlar (`BOT_TOKEN`, `MONGO_URI`, to'lov kalitlari) faqat `.env` da. `.env` ni zip yoki repoga qo'shmang.
- `scripts/` — yordamchi/test skriptlar (ishlab chiqarishda kerak emas).
- Ko'p instansli deploy polling bilan ishlamaydi (Telegram 409). Bitta instans ishlating yoki webhook'ga o'ting.
- Auksion pullari: bid, qaytarish va bekor qilish `CoinLog` ga yoziladi. Auksion yakunida sotuvchiga coin berilmaydi (qaror kerak).
