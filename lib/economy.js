// Coins iqtisodiyoti: kunlik bonus, do'st taklif qilish (referal), admin tuzatishlari va audit log.
// Coins balansiga tegadigan har bir o'zgarish CoinLog ga yoziladi (logCoins orqali).
const mongoose = require('mongoose');
const User = require('../models/User');
const TopUp = require('../models/TopUp');
const CoinLog = require('../models/CoinLog');

const TZ = 'Asia/Tashkent';
const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const tzDay = (d = new Date()) => fmtDay.format(d);                  // 'YYYY-MM-DD' (Toshkent)
const yesterdayDay = () => tzDay(new Date(Date.now() - 864e5));

const REF_BONUS = Number(process.env.REF_BONUS) || 20;               // taklif qilgan odamga, har bir do'st uchun
const REF_MAX = Number(process.env.REF_MAX) || 50;                   // bitta odam necha do'st uchun bonus oladi

// Kunlik bonus: 1-kun 5 Coins, har ketma-ket kun +1, 6-kundan boshlab 10 Coins (maksimum)
const dailyReward = (streak) => Math.min(4 + streak, 10);

// Audit log. Yozib bo'lmasa ham asosiy amal to'xtamaydi, lekin xato konsolga chiqadi.
async function logCoins(telegramId, delta, reason, ref = '', actor = null, note = '') {
  try { await CoinLog.create({ telegramId, delta, reason, ref: String(ref || ''), actor, note }); }
  catch (e) { console.error('CoinLog yozilmadi:', e.message); }
}

// ——— Kunlik bonus ———
function dailyStatus(me) {
  const today = tzDay(), y = yesterdayDay(), last = me?.dailyDay;
  const claimed = last === today;
  const streak = last === today || last === y ? me.dailyStreak || 0 : 0;
  const nextStreak = claimed ? streak : last === y ? streak + 1 : 1;
  return { claimed, streak, next: dailyReward(nextStreak) };
}

async function claimDaily(telegramId) {
  const me = await User.findOne({ telegramId }).lean();
  if (!me) return { ok: false, error: 'notReg' };
  const today = tzDay(), y = yesterdayDay();
  if (me.dailyDay === today) return { ok: false, error: 'claimed', streak: me.dailyStreak || 0 };
  const streak = me.dailyDay === y ? (me.dailyStreak || 0) + 1 : 1;
  const reward = dailyReward(streak);
  // Shartli yangilash: bir vaqtda ikki marta bosilsa ham bir kunda bir marta beriladi
  const usr = await User.findOneAndUpdate(
    { telegramId, dailyDay: me.dailyDay ?? null },
    { $set: { dailyDay: today, dailyStreak: streak }, $inc: { coins: reward } },
    { new: true }
  ).lean();
  if (!usr) return { ok: false, error: 'claimed' };
  await logCoins(telegramId, reward, 'daily', today);
  return { ok: true, reward, streak, coins: usr.coins };
}

// ——— Do'st taklif qilish (referal) ———
// /start ?ref_<id> bilan yangi odam kelganda chaqiriladi: faqat taklifni yozadi, Coins hali berilmaydi
async function captureReferral(newId, payload) {
  const m = /^ref_(\d{1,15})$/.exec(payload || '');
  if (!m) return null;
  const refId = Number(m[1]);
  if (refId === newId) return null;
  if (!(await User.exists({ telegramId: refId }))) return null;
  await User.updateOne({ telegramId: newId, referredBy: null }, { $set: { referredBy: refId } });
  return refId;
}

// Taklif qilingan odam birinchi marta ligaga yozilganda chaqiriladi: taklif qilgan odamga Coins beriladi.
// Bonus faqat liga ro'yxatidan o'tgandan keyin beriladi — shunda faqat /start bosib hisob ochish foydasiz.
async function payReferral(telegramId) {
  const me = await User.findOneAndUpdate(
    { telegramId, referredBy: { $ne: null }, refPaid: { $ne: true } },
    { $set: { refPaid: true } }
  ).lean();
  if (!me) return null;
  const refId = me.referredBy;
  const ok = await User.findOneAndUpdate(
    { telegramId: refId, refCount: { $not: { $gte: REF_MAX } } },
    { $inc: { coins: REF_BONUS, refCount: 1 } },
    { new: true }
  ).lean();
  if (!ok) return null;                       // limitga yetgan — bonus yo'q (do'st baribir ro'yxatda)
  await logCoins(refId, REF_BONUS, 'referral', String(telegramId));
  return { refId, amount: REF_BONUS, invitee: telegramId };
}

function referralInfo(me, telegramId, botUser) {
  return {
    link: botUser ? `https://t.me/${botUser}?start=ref_${telegramId}` : '',
    count: me?.refCount || 0,
    bonus: REF_BONUS,
  };
}

// ——— Admin: Coins ni qo'lda o'zgartirish yoki tasdiqlangan to'lovni qaytarib olish (audit bilan) ———
async function adjustCoins({ telegramId, delta, reason, topupId, actor }) {
  reason = String(reason || '').trim().slice(0, 200);
  let tu = null;
  if (topupId) {
    if (!mongoose.isValidObjectId(topupId)) return { ok: false, error: 'fail' };
    // Faqat tasdiqlangan to'lovni qaytarish mumkin, va u bir marta
    tu = await TopUp.findOneAndUpdate(
      { _id: topupId, status: 'approved' },
      { $set: { status: 'reversed', doneAt: new Date() } },
      { new: true }
    ).lean();
    if (!tu) return { ok: false, error: 'notApproved' };
    telegramId = tu.telegramId;
    delta = -tu.coins;
    if (reason.length < 3) reason = "To'lov qaytarildi";
  } else {
    if (reason.length < 3) return { ok: false, error: 'reason' };
    if (!Number.isInteger(telegramId) || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000000) {
      return { ok: false, error: 'fail' };
    }
  }
  const filter = { telegramId };
  if (delta < 0) filter.coins = { $gte: -delta };          // balans manfiy bo'lib ketmasin
  const usr = await User.findOneAndUpdate(filter, { $inc: { coins: delta } }, { new: true }).lean();
  if (!usr) {
    if (tu) await TopUp.updateOne({ _id: tu._id }, { $set: { status: 'approved' }, $unset: { doneAt: 1 } });
    return { ok: false, error: delta < 0 ? 'noCoins' : 'noUser' };
  }
  await logCoins(telegramId, delta, tu ? 'reversal' : 'admin', tu ? String(tu._id) : '', actor, reason);
  return { ok: true, telegramId, delta, coins: usr.coins, reason };
}

module.exports = {
  tzDay, dailyReward, dailyStatus, claimDaily, logCoins,
  captureReferral, payReferral, referralInfo, adjustCoins,
  REF_BONUS, REF_MAX,
};
