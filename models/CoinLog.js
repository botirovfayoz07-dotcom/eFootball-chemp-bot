const mongoose = require('mongoose');

// Coins audit logi: balansga tegadigan HAR BIR o'zgarish shu yerga yoziladi (qo'shildi, sarflandi, qaytarildi)
const schema = new mongoose.Schema({
  telegramId: { type: Number, required: true, index: true },
  delta: { type: Number, required: true },            // + qo'shildi, - ayirildi
  reason: { type: String, required: true },           // topup | buy | daily | referral | admin | reversal
  ref: { type: String, default: '' },                 // bog'liq narsa: chek id, mahsulot id, do'st id, sana...
  actor: { type: Number, default: null },             // admin bajargan bo'lsa, uning Telegram ID si
  note: { type: String, default: '' },                // admin sababi
  at: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('CoinLog', schema);
