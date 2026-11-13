'use strict';
// Eski auksion xatosi tufayli yo'qolgan coinlarni topish va qaytarish.
// Xato: taklif coini yechilardi, lekin lotga yozilmasdi, shuning uchun oldingi taklifchiga qaytarilmasdi.
//
// Ishlatish (avval quruq rejim — hech narsa o'zgarmaydi):
//   node scripts/refund_lost_bids.js
// Qaytarish:
//   node scripts/refund_lost_bids.js --apply
//
// Qoida: har bir (foydalanuvchi, lot) bo'yicha sarflangan summa qaytariladi, agar:
//   - lot hali auksionda bo'lsa, yoki
//   - lot tugagan bo'lsa-yu, foydalanuvchi shu klubning egasi bo'lmasa (yutqazgan), yoki
//   - lot o'chib ketgan bo'lsa.
// Klubni yutgan (hozirgi egasi) foydalanuvchining coini qaytarilmaydi.
// Har bir qaytarish CoinLog ga 'auction_fix' sifatida yoziladi, shuning uchun qayta ishga tushirish xavfsiz.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const CoinLog = require('../models/CoinLog');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { season } = require('../webapp/league-data');

const apply = process.argv.includes('--apply');

(async () => {
  if (!process.env.MONGO_URI) { console.error('MONGO_URI kerak'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);

  const logs = await CoinLog.find({ reason: { $in: ['auction_bid', 'auction_refund', 'auction_fix'] }, ref: { $ne: '' } }).lean();
  // (foydalanuvchi, lot) bo'yicha sof sarf: manfiy bo'lsa — yo'qolgan
  const net = new Map();
  for (const l of logs) {
    const key = l.telegramId + '|' + l.ref;
    net.set(key, (net.get(key) || 0) + l.delta);
  }
  const lost = [...net.entries()].filter(([, v]) => v < 0).map(([k, v]) => ({ tid: Number(k.split('|')[0]), ref: k.split('|')[1], spent: -v }));

  const ids = [...new Set(lost.map((x) => x.ref))].filter((x) => mongoose.isValidObjectId(x));
  const regs = new Map((await Registration.find({ _id: { $in: ids }, season }).lean()).map((r) => [String(r._id), r]));

  const plan = [];
  for (const x of lost) {
    const r = regs.get(x.ref);
    let status = null;
    if (!r) status = 'lot yo‘q (qaytariladi)';
    else if (r.auction?.price > 0) status = 'auksionda (qaytariladi)';
    else if (r.telegramId === x.tid) status = 'klubni yutgan (qaytarilmaydi)';
    else status = 'tugagan, yutqazgan (qaytariladi)';
    if (status.includes('qaytarilmaydi')) continue;
    plan.push({ ...x, status, club: r ? `${r.league}|${r.club}` : '—' });
  }

  console.log(apply ? 'REJIM: QAYTARISH' : 'REJIM: QURUQ (hech narsa o‘zgarmaydi). Qaytarish uchun --apply');
  console.log('telegramId\tspent\tlot\tholat');
  let total = 0;
  for (const p of plan) {
    total += p.spent;
    console.log(`${p.tid}\t${p.spent}\t${p.club}\t${p.status}`);
  }
  console.log(`Jami: ${plan.length} ta yozuv, ${total} coin`);

  if (apply) {
    for (const p of plan) {
      await User.updateOne({ telegramId: p.tid }, { $inc: { coins: p.spent } });
      await CoinLog.create({ telegramId: p.tid, delta: p.spent, reason: 'auction_fix', ref: p.ref, actor: null, note: 'eski taklif xatosi: qaytarildi' });
    }
    console.log('Qaytarildi.');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
