window.ADMIN = '@botiroff_06';
window.GUIDE_ORDER = [['start','🚀'],['play','🎮'],['leagues','🏆'],['cups','⭐'],['division','📅'],['world','🌍'],['quick','⚡'],['private','🎟️'],['team','🛡️'],['dispute','⚖️']];
const S = (items) => ({ label: 'steps', type: 'steps', items });
const K = (items, label = 'know') => ({ label, type: 'bullets', items });
window.GUIDE = {
uz: {
  ui: { title: "Qo'llanma", all: "Barcha bo'limlar", contact: 'Adminga yozish', steps: 'Qanday qilinadi', know: "Bilib qo'ying", who: 'Kim qatnashadi', format: 'Format', rules: "O'yin qoidalari",
    intro: "Bot eFootball bo'yicha onlayn turnirlar o'tkazadi: ro'yxatdan o'tasiz, raqibingiz bilan eFootball'da o'ynaysiz va natijani shu yerga kiritasiz. Jadval, reyting va sovrinlar o'zi hisoblanadi. Kerakli bo'limni tanlang." },
  topics: {
    start: { title: 'Boshlash', sub: "Kanal, til va bo'limlar", intro: "Botdan foydalanish uchun bir necha daqiqa kifoya.", sections: [
      S([`Bot so'ragan **kanalga a'zo bo'ling** — a'zo bo'lmasangiz ilova ochilmaydi. Yangiliklar va e'lonlar shu kanalda.`,
         `Botda **/start** bosib tilni tanlang (o'zbek, rus, ingliz), so'ng **«Kirish»** tugmasi ilovani ochadi.`,
         `Bo'limni tanlang: **Rasmiy turnirlar** (Ligalar, kuboklar, Divizion, Jahon chempionati), **Shaxsiy turnirlar** yoki **Teamlar jangi**.`,
         `Turnirga ro'yxatdan o'ting va bot xabarlarini kuting: raqib, xona ID va deadline haqida eslatmalar keladi.`]),
      K([`Barcha vaqtlar **Toshkent vaqti** bo'yicha.`, `Bot xabarlarini o'chirmang — raqibingiz yozgani va natija kiritgani haqida shu yerdan bilasiz.`,
         `Telegram profilingizda **@username** bo'lsin: raqiblar siz bilan tezroq bog'lanadi.`, `Shoshilmasangiz — ⚡ **Tezkor o'yin**: ro'yxatsiz, hozirning o'zida raqib topib o'ynaysiz.`])] },
    play: { title: "O'yin qanday o'tadi", sub: 'Raqib, xona ID, natija, tasdiq', intro: "Barcha turnirlarda har bir o'yin bir xil tartibda o'tadi.", sections: [
      S([`Raqibingizni toping: o'yin kartasi **«Joriy o'yinlarim»** yoki **Profil** bo'limida, bot ham xabar yuboradi.`,
         `💬 **Chat** orqali vaqt kelishing. Kelishuvni bot chatida yozing — nizo bo'lsa yozishmalar dalil bo'ladi.`,
         `eFootball'da do'stona xona oching va **xona ID**'sini o'yin kartasidagi tugma orqali yuboring — u raqibga darhol boradi.`,
         `O'ynang va **yakun ekranini skrinshot** qilib qo'ying.`,
         `Natijani kiriting: **o'zingizning hisobingiz birinchi** yoziladi. Raqib tasdiqlaydi yoki rad etadi.`,
         `Rad etilsa — chatda kelishing. Kelisha olmasangiz, skrinshot yoki video bilan adminga murojaat qiling.`]),
      K([`O'yin **8 daqiqa**.`, `Ikkitalik himoyani yoqish **mumkin emas**.`, `O'yinchilar holati **«Excellent»** bo'lsin.`, `Qo'shimcha vaqt va penalti **yo'q**.`,
         `Deadline o'tgach: kiritilgan, lekin tasdiqlanmagan natija **avtomatik tasdiqlanadi**, umuman o'ynalmagan o'yin **0:0 durang** bo'ladi.`], 'rules')] },
    leagues: { title: 'Ligalar', sub: 'Klub tanlash, turlar, ochko', intro: "Ligalar — asosiy rejim: har kim bitta klub bilan o'ynaydi, hamma bitta jadvalda, har kim har kim bilan uy va mehmonda uchrashadi.", sections: [
      S([`**Rasmiy turnirlar → Ligalar**. Ochiq ligani tanlang: ligalar navbat bilan ochiladi — oldingisi to'lmaguncha keyingisi yopiq.`,
         `Bo'sh klublardan birini tanlang. Yangi mavsumda o'tgan mavsumni **oxirigacha o'ynaganlar birinchi** tanlaydi, yangilar biroz keyin, o'yinni tashlab ketganlar eng oxirida.`,
         `Liga to'lgach qur'a tashlanadi va turlar boshlanadi: har kuni **23:30** da **2 ta** yangi tur ochiladi.`,
         `Natijani tur ochilgandan **1 soat 45 daqiqa** o'tgach kiritish mumkin — o'ynalmagan o'yinga oldindan natija yozilmasligi uchun.`]),
      K([`G'alaba — **3** ochko, durang — **1**, mag'lubiyat — **0**. Teng bo'lsa: gol farqi, so'ng urilgan gollar.`, `Liga odatda **20** kishilik (LaLiga 2 — 22).`,
         `Ligadagi o'ringiz Chempionlar ligasi, Yevropa ligasi va Osiyo Chempionlar ligasiga yo'llanmani belgilaydi.`,
         `Sovrinlar: liga kubogi, **Oltin to'p** (g'olib) va **Oltin butsa** (eng ko'p gol urgan). Oltin to'p va butsa faqat **1-ligalar** orasida aniqlanadi — 2-ligalarda (LaLiga 2, Championship, 2. Bundesliga, Serie B, Ligue 2, Liga Portugal 2) faqat liga kubogi.`])] },
    cups: { title: 'Kuboklar: ChL, YeL, OChL', sub: 'Kim qatnashadi va format', intro: "Liga mavsumi yakunida eng yaxshilar kuboklarga yo'llanma oladi. Yo'llanma odamga beriladi — keyingi mavsumda klub almashsangiz ham kubokda qolasiz.", sections: [
      { label: 'who', type: 'steps', items: [`**Chempionlar ligasi** — 7 ta Yevropa ligasining har biridan 1–5-o'rinlar va eng yaxshi 6-o'rin: jami **36** kishi.`,
         `**Yevropa ligasi** — o'sha ligalardan 6–10-o'rinlar (ChL'ga o'tgan 6-o'rindan tashqari) va eng yaxshi 2 ta 11-o'rin: jami **36** kishi.`,
         `**Osiyo Chempionlar ligasi** — Superliga, Saudi Pro Liga, UAE Pro Liga va J1 Liga'ning 1–8-o'rinlari: jami **32** kishi.`] },
      K([`Liga bosqichi: hamma bitta jadvalda, har kim **8** ta turli raqib bilan o'ynaydi. Kuniga **1** tur, deadline **23:30**.`,
         `**1–8**-o'rinlar to'g'ridan 1/8 finalga chiqadi, **9–24**-o'rinlar pley-off raundida juftlashadi (9–24, 10–23 ...).`, `So'ng 1/8 final, chorak final, yarim final va final.`], 'format')] },
    division: { title: 'Divizion', sub: "Har kungi ro'yxat va tasodifiy raqib", intro: "Divizion — kundalik rejim: har kuni ro'yxatdan o'tasiz va bot sizga tasodifiy raqib beradi. Ballar mavsum reytingida yig'iladi.", sections: [
      S([`Har kuni **17:00–20:00** oralig'ida Divizionda ro'yxatdan o'ting (17:00 da bot eslatadi).`, `**20:00** da qur'a: raqibingiz Profil bo'limida va bot xabarida chiqadi.`,
         `Ertasi kuni **16:00** gacha o'ynab, natijani kiriting — raqib tasdiqlaydi.`, `Vaqtida o'ynalmagan o'yin **0:0 durang** bo'ladi.`]),
      K([`G'alaba **+15**, durang **+10**, mag'lubiyat **−10** ball.`, `Har kimning boshlang'ich balli **1500**.`,
         `Ishtirokchilar toq bo'lsa, bittasi raqibsiz qoladi va **baraban** aylantiradi: 5, 10 yoki 15 ball (aylantirmasa — 5).`, `Mavsum yakunida reytingdagi **TOP-48** Jahon chempionatiga yo'llanma oladi.`])] },
    world: { title: 'Jahon chempionati', sub: '48 terma jamoa, guruhlar va pley-off', intro: "Jahon chempionati — 48 ta terma jamoa: 12 guruh, har guruhda 4 kishi.", sections: [
      S([`Ro'yxatdan o'tish huquqi **Divizion mavsumi TOP-48**'iga beriladi (har mavsum yangilanadi).`, `Terma jamoangizni tanlang — u guruhingizni belgilaydi.`,
         `Guruh bosqichi: **3** tur, kuniga **1** tur, deadline **23:30**.`, `Pley-offga **32** kishi chiqadi: guruh g'oliblari, ikkinchi o'rinlar va **8** ta eng yaxshi uchinchi o'rin. So'ng 1/16 finaldan finalgacha.`]),
      K([`Eng yaxshi uchinchi o'rinlar ochko, so'ng gol farqi, so'ng urilgan gollar bo'yicha saralanadi.`])] },
    quick: { title: "Tezkor o'yin", sub: "Kutmasdan hozir o'ynash", intro: "Tezkor o'yin — ro'yxat va deadline'siz, hozirning o'zida o'ynash. Alohida reytingi bor.", sections: [
      S([`Bo'lim tanlash yoki Ligalar bosh sahifasidagi ⚡ tugmani bosing.`, `**«Raqib qidirish»** — qidirayotgan boshqa o'yinchi bilan darhol juftlanasiz.`,
         `**3 daqiqa** ichida eFootball'da xona ochib, xona ID'sini yuboring — aks holda o'yin bekor bo'ladi. ID'ni raqib ham yuborishi mumkin.`,
         `Xona ID'dan keyin **40 daqiqa** ichida natijani kiriting. Raqib **10 daqiqada** javob bermasa — avtomatik tasdiqlanadi.`]),
      K([`Ball gol farqiga bog'liq: g'alaba **+10** va har gol farqi uchun **+2** (ko'pi bilan +20), mag'lubiyat **−5** va har gol uchun **−2** (ko'pi bilan −15), durang **+3**.`,
         `Boshlang'ich reyting **1000**.`, `Bir raqib bilan kuniga **3** ta o'yin reytingga kiradi.`])] },
    private: { title: 'Shaxsiy turnirlar', sub: "O'z turniringizni tuzing", intro: "Shaxsiy turnir — do'stlaringiz, guruhingiz yoki jamoangiz uchun o'zingiz tuzadigan turnir.", sections: [
      S([`**Shaxsiy turnirlar** → **«+ Yangi turnir yaratish»**.`, `Formatni tanlang: Liga, Chempionlar ligasi, Yevropa ligasi, Jahon chempionati yoki Erkin format (4 kishilik guruhlar + pley-off).`,
         `Necha kishilik bo'lishini tanlang. Narx (agar belgilangan bo'lsa) yaratish oynasida ko'rinadi.`, `**Taklif havolasini** do'stlaringizga yuboring — bosgan kishi turnirga qo'shiladi.`,
         `Joylar to'lgach **«Turnirni boshlash»**. Jadval, pley-off va chempion o'zi aniqlanadi.`]),
      K([`Turnir qoidalarini faqat **tashkilotchi** o'zgartiradi (Asosiy sahifada).`, `Tashkilotchi tur muddatini belgilaydi, kelishmovchiliklarni hal qiladi va yordamchi admin tayinlay oladi.`])] },
    team: { title: 'Teamlar jangi', sub: "Jamoa bo'lib 1v1 bellashish", intro: "Teamlar jangi — jamoa bo'lib o'ynash: ikki team bahsda o'yinchilar 1v1 o'ynaydi, ko'p g'alaba olgan team yutadi.", sections: [
      S([`Team ochish uchun liga adminidan **liga havolasini** oling. Do'stingiz teamga qo'shilish uchun sardordan **taklif havolasini** so'rang.`, `Sardor **asosiy tarkibni** tuzadi; tarkib hajmini liga belgilaydi.`,
         `Tur ochilganda (kuniga **1** tur, deadline **23:30**) tarkib o'yinchilari raqib teamdan 1v1 juftlanadi — raqibingiz **«Jang»** tabida.`, `Natijani **yakun ekrani skrinshoti** bilan kiriting — skrinshotsiz natija qabul qilinmaydi.`]),
      K([`Bahs uchun ochko: g'alaba — **3**, durang — **1**. Teng bo'lsa: 1v1 g'alabalar farqi, so'ng gol farqi.`, `Tarkibi yetmagan team **texnik mag'lubiyat** oladi.`,
         `Sardor uchun: taklif havolasini **Teamim** → **«Havolani olish»**dan oling. Havolani yangilasangiz, eskisi ishlamay qoladi.`])] },
    dispute: { title: "Nizo va halol o'yin", sub: 'Rad etish, dalil, shikoyat', intro: "Nizolar kam bo'lishi uchun hamma narsani bot ichida qiling.", sections: [
      S([`Kelishuv va xona ID — faqat **bot chatida**. Telegramdagi shaxsiy yozishma dalil bo'lmaydi.`, `Har o'yindan keyin **yakun ekranini skrinshot** qiling.`,
         `Raqib noto'g'ri natija kiritsa — **«Rad etish»**ni bosing va chatda kelishing.`, `Kelishilmasa — skrinshot yoki video bilan **adminga** murojaat qiling. Mas'ul adminlar har rejimning Profil sahifasida.`,
         `Teamlar jangida raqib o'rniga boshqa odam kirsa — o'ynamang va **«🚩 Boshqa odam o'ynadi»**ni bosing. Admin skrinshot va chatni ko'rib qaror qiladi: asossiz, qayta o'ynash yoki texnik mag'lubiyat.`]),
      K([`Tasdiqlangan natijani faqat admin o'zgartira oladi.`, `Raqibingizga hurmat bilan munosabatda bo'ling — haqoratli so'zlar filtrlanadi.`])] },
  },
},
// en/ru: interfeys va sarlavhalar tarjima qilingan; mavzu matnlari hozircha o'zbekchadan olinadi (fallback)
en: {
  ui: { title: 'Guide', all: 'All sections', contact: 'Message the admin', steps: 'How it works', know: 'Good to know', who: 'Who takes part', format: 'Format', rules: 'Game rules',
    intro: 'The bot runs online eFootball tournaments: you sign up, play your opponent in eFootball and enter the result here. Tables, ratings and prizes are calculated automatically. Choose a section.' },
  topics: {
    start: { title: 'Getting started', sub: 'Channel, language and sections' }, play: { title: 'How a game works', sub: 'Opponent, room ID, result, confirmation' },
    leagues: { title: 'Leagues', sub: 'Picking a club, rounds, points' }, cups: { title: 'Cups: CL, EL, ACL', sub: 'Who takes part and format' },
    division: { title: 'Division', sub: 'Daily sign-up and random opponent' }, world: { title: 'World Cup', sub: '48 national teams, groups and play-offs' },
    quick: { title: 'Quick match', sub: 'Play right now, no waiting' }, private: { title: 'Private tournaments', sub: 'Create your own tournament' },
    team: { title: 'Team battle', sub: 'Play as a team, 1v1 duels' }, dispute: { title: 'Disputes and fair play', sub: 'Rejecting, evidence, complaints' },
  },
},
ru: {
  ui: { title: 'Руководство', all: 'Все разделы', contact: 'Написать админу', steps: 'Как это делается', know: 'Важно знать', who: 'Кто участвует', format: 'Формат', rules: 'Правила игры',
    intro: 'Бот проводит онлайн-турниры по eFootball: вы регистрируетесь, играете с соперником в eFootball и вводите результат здесь. Таблицы, рейтинг и призы считаются автоматически. Выберите нужный раздел.' },
  topics: {
    start: { title: 'Начало работы', sub: 'Канал, язык и разделы' }, play: { title: 'Как проходит игра', sub: 'Соперник, ID комнаты, результат, подтверждение' },
    leagues: { title: 'Лиги', sub: 'Выбор клуба, туры, очки' }, cups: { title: 'Кубки: ЛЧ, ЛЕ, ЛЧА', sub: 'Кто участвует и формат' },
    division: { title: 'Дивизион', sub: 'Ежедневная запись и случайный соперник' }, world: { title: 'Чемпионат мира', sub: '48 сборных, группы и плей-офф' },
    quick: { title: 'Быстрая игра', sub: 'Играть сразу, без ожидания' }, private: { title: 'Закрытые турниры', sub: 'Создайте свой турнир' },
    team: { title: 'Битва команд', sub: 'Играйте командой, дуэли 1v1' }, dispute: { title: 'Споры и честная игра', sub: 'Отклонение, доказательства, жалобы' },
  },
},
};
