# eFOOTBALL — Liquid Glass dizayn tizimi

> Mini App'ning butun vizual qatlami qayta yozildi: `webapp/style.css` (to'liq yangi),
> `webapp/index.html` (fon qatlamlari + splash), `webapp/liquid.js` (yangi, interaksiya).

---

## 1. G'oya

Apple'ning **Liquid Glass** tili: shisha yuzalar orqasida rangli, sekin harakatlanuvchi
muhit bo'lishi shart — shisha shu ranglarni "sindirib" ko'rsatadi. Shuning uchun tuzilma
uch qavatli:

| qavat | element | vazifa |
|---|---|---|
| `-2` | `.lg-bg i` (4 ta orb) | rang manbai, sekin suzadi |
| `-1` | `.lg-noise` | 5% grain — shishaga "material" hissi beradi |
| `0+` | kontent | shisha panellar |

**Muhim:** `body`ning foni shaffof (`transparent`), fon esa `html`da. Aks holda manfiy
z-index'li qavatlar body fonidan keyin bo'yalib, ko'rinmay qoladi.

---

## 2. Tokenlar (`:root`)

```css
--bg-0      #04060e    sahifa tubi
--ink       #f2f6ff    asosiy matn
--ink-2     #a7b4d0    ikkinchi darajali matn
--ink-3     #6f7d9c    izohlar, label
--cy/--vi/--mi/--am/--rd   aksentlar (cyan, violet, mint, amber, red)

--blur      20px       katta yuzalar uchun blur
--satur     180%       shisha "to'yinganligi"

--r-xl 30  --r-lg 24  --r-md 18  --r-sm 14  --r-xs 11

--sh-1 / --sh-2   yumshoq soyalar
--in-hi / --in-lo ichki yorug'lik (shisha qirrasi)
--ease / --spring harakat egri chiziqlari
--acc-grad        asosiy CTA gradienti
```

**Rangni o'zgartirmoqchi bo'lsangiz** — faqat shu blokni tahrirlang, qolgan hamma joy
tokenlardan foydalanadi.

---

## 3. Shisha retsepti

Har qanday panel uch xususiyatdan iborat:

1. **To'ldirish** — `var(--lg-fill)` / `--lg-fill-soft` / `--lg-fill-deep`
   (ichida `--mx/--my` orqali boshqariladigan yorug'lik dog'i bor).
2. **Blur** — `backdrop-filter: blur(...) saturate(...)`.
3. **Qirra (rim)** — `::after` + `mask-composite`, 1px gradient ramka.

Yangi komponent qo'shish:

```css
.my-panel {
  position: relative;
  border-radius: var(--r-lg);
  border: 1px solid rgba(255,255,255,.12);
  background: var(--lg-fill-soft);
  box-shadow: var(--sh-1), var(--in-hi);
  -webkit-backdrop-filter: blur(13px) saturate(160%);
  backdrop-filter: blur(13px) saturate(160%);
}
.my-panel::after { /* rim qoidasini nusxalang */ }
```

---

## 4. Blur byudjeti (mobil GPU)

Telegram ichidagi WebView'larda `backdrop-filter` qimmat. Ikki pog'ona:

* **20px** — `.topbar`, `.p-hero`, `.l-hero`, `.pf-card`, `.p-sheet`, `.l-nav`, `.toast`
* **13px** — `.guide`, `.g-item`, `.g-card`, `.p-card`, `.lc`, `.flag`

Ro'yxat elementlariga 20px+ bermang: 10 ta karta × katta blur = scroll'da FPS tushadi.

---

## 5. Interaksiya

`liquid.js` ikkita narsa qiladi:

* `pointermove` — kursоr/barmoq ostidagi elementga `--mx / --my` yozadi → shishadagi
  yorug'lik siljiydi (rAF bilan cheklangan, layout thrash yo'q).
* `pointerdown` — `.lg-ripple` to'lqinini qo'shadi (0.62s, avtomatik o'chadi).

`prefers-reduced-motion: reduce` bo'lsa ikkalasi ham o'chadi.
JS ishlamasa ham dizayn buzilmaydi — barcha effektlar CSS'dagi standart qiymatlarga tayanadi.

---

## 6. Klasslar xaritasi (o'zgarmagan)

Barcha eski klass nomlari **saqlab qolindi**, shuning uchun `league.js`, `private.js`,
`rating.js`, `profile.js`, `guide.js` ga tegilmadi. Faqat `app.js`da Telegram header
rangi yangilandi (`#070a14` → `#04060e`).

Qo'shilgan yangi klasslar: `.lg-bg`, `.lg-noise`, `.lg-ripple`, `.glass`, `.n-det`.

---

## 7. Mavsum kalendari — bitta start, avtomatik kuboklar

**Qoida:** bitta davlatning barcha turnirlari **bitta vaqtda** boshlanadi.
Angliya uchun bu to'rt turnir birga: `premier-league` + `championship` + `fa-cup` + `community-shield`.
Hech biri alohida ochilmaydi.

### Manba — `webapp/league-data.js`

```js
const SEASON = {
  number: 6,
  startAt: '2026-12-19T18:00:00+05:00',  // SEASON_START env bilan ham beriladi
  endAt:   '2027-06-06T21:00:00+05:00',  // SEASON_END
  openDaysBefore: 60,                    // ro'yxat startdan 60 kun oldin ochiladi
  timezone: 'Asia/Tashkent',
};
```

> Hozirgi holat: ro'yxat **ochiq** (start 2026-12-19). Sanani o'zgartirsangiz —
> `SEASON_START` env yoki shu konstant. Agar `startAt` o'tib ketsa, ro'yxat
> avtomatik yopiladi va hamma turnir `live` bo'ladi.

Bu fayl ham brauzerda, ham serverda ishlaydi — shuning uchun kalendar **bitta manbadan** keladi.

### Fazalar

| faza | qachon | nima bo'ladi |
|---|---|---|
| `soon` | `start - openDaysBefore` gacha | ro'yxat yopiq, countdown ko'rinadi |
| `registration` | `openDaysBefore` kun oldin → start | faqat shu oynada ro'yxatdan o'tish mumkin |
| `live` | start → end | ligalar **va** kuboklar bir vaqtda live |
| `finished` | end dan keyin | mavsum yakunlangan |

### Avtomatik start qanday ishlaydi

1. `lib/season.js` — sof hisob: `calendar()`, `registrationGate()`, `bundle()`, `status()`.
2. `POST /api/leagues/:id/register` — faza `registration` bo'lmasa `409 { error:'notopen' | 'closed' }`.
   Bitta tekshiruv ligaga ham, kubokka ham tegishli, chunki start bitta.
3. `bot.js` → `startSeasonWatcher()` — har daqiqada kalendarni tekshiradi.
   Vaqt kelganda `Season` hujjatiga `openedAt` + `cupsStartedAt` yoziladi.
   Yozuv **idempotent** (`openedAt: null` sharti bilan), shuning uchun server qayta
   ishga tushsa ham dublikat bo'lmaydi.
4. `EFL.bundleInfo(country)` — UI uchun paket: qaysi turnirlar bor, qaysilari `auto`.

### UI

Davlat sahifasida `.se-card` bloki (Mavsum paneli) chiqadi:

* start sanasi + real vaqtda **countdown** (`#lTimer`, `setInterval`);
* holat badge'i (`TEZ ORADA / RO'YXATDAN O'TISH / DAVOM ETMOQDA / YAKUNLANDI`);
* to'rt turnir ro'yxati — `fa-cup` va `community-shield` yonida **"avtomatik"** belgisi.

Ro'yxatdan o'tish tugmasi faza yopiq bo'lsa avtomatik `disabled` bo'ladi.

### Testlar

```bash
npm test          # tournament + season
npm run test:season
```

`test/season.test.js` tekshiradi: fazalar ketma-ketligi, gate xato kodlari,
"Angliya to'rt turniri bitta startda" qoidasi, va har bir ochiq davlat uchun
barcha turnirlarning start sanasi bir xilligi.

---

## 8. Bu safar bajarilgan maslahatlar

| # | Tavsiya | Holat |
|---|---|---|
| 1 | `cards/team.jpg` yo'q | ✅ `cards/team.svg` (vektor poster) qo'shildi |
| 2 | Lazy loading | ✅ `loading="lazy" decoding="async"` — liga, reyting, profil |
| 3 | HapticFeedback | ✅ `app.js`da global `pointerdown` (90ms throttle) |
| 4 | Rate limit | ✅ `bot.js` — POST uchun IP bo'yicha 40/min |
| 5 | Xavfsizlik sarlavhalari | ✅ nosniff / referrer / permissions (paketsiz) |
| 6 | `express.json` limiti | ✅ 64kb |
| 7 | Mongo indekslar | ✅ `{ season, league }`, `{ season, releasing }` |
| 8 | Keshlash | ✅ rasmlar 30 kun, html/js/css `no-cache` |
| 9 | `npm run dev` | ✅ `node --watch` + `npm run check` |
| 10 | Testlar | ✅ `test/season.test.js` |

## 9. Navbatdagi qadamlar

1. **WebP'ga o'tkazish** — `webapp/cards/` ichida 2 300+ PNG. `sharp` bilan 2x o'lchamga
   keltirish eng katta tezlik yutug'i (buni hozir qilolmadim: bu muhitda shell ishlamaydi).
2. **"Teamlar jangi" bo'limi** — `app.js`da hali `toast(soon)`.
3. **FA Cup / Community Shield to'liq bracket** — hozir ular avtomatik *ochiladi*, lekin
   pley-off daraxti generatori yo'q (`lib/tournament.js`da faqat round-robin bor).
   Keyingi qadam: `knockout()` + kubok ishtirokchilarini liga jadvalidan tanlash
   (FORMATS bo'yicha: Championship 24 → 6, Premier 20 → 10).
4. **Light mode** — Telegram `themeParams` orqali oq shisha varianti.
5. **CSS bo'lish** — `style.css` 2 300 qator; `tokens.css` / `base.css` / `league.css` /
   `private.css` (build kerak emas, `<link>` bilan).
6. **Skeleton** liga va reyting sahifalari uchun.
7. **PWA / service worker** — sekin tarmoqda qobiqni keshlash.

