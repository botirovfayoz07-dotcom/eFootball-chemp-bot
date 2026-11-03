const mongoose = require('mongoose');

// Liga o'yini (qura natijasida yaratiladi). home/away — Telegram ID lar.
// Holatlar:
//   scheduled — hali hisob kiritilmagan
//   pending   — biri hisob kiritdi, raqib tasdig'ini kutmoqda
//   disputed  — raqib "Yolg'on" dedi: hisob bekor, admin kiritadi
//   confirmed — hisob tasdiqlandi (jadvalga o'tgan)
//   cancelled — ishtirokchi ligadan chiqarilgani uchun bekor qilingan
const schema = new mongoose.Schema({
  league: { type: String, required: true },
  season: { type: Number, required: true },
  round: { type: Number, required: true },
  home: { type: Number, required: true },
  away: { type: Number, required: true },
  status: { type: String, enum: ['scheduled', 'pending', 'disputed', 'confirmed', 'cancelled'], default: 'scheduled' },
  hg: { type: Number, default: null },
  ag: { type: Number, default: null },
  reportedBy: { type: Number, default: null },
  // "Yolg'on" deyilgan hisob — faqat admin ma'lumot uchun ko'radi, jadvalga hisoblanmaydi
  claim: { type: { hg: Number, ag: Number, by: Number }, default: null, _id: false },
  confirmedBy: { type: String, enum: ['player', 'admin', null], default: null },
  updatedAt: { type: Date, default: Date.now },
});
schema.index({ season: 1, league: 1, status: 1, round: 1 });
schema.index({ season: 1, home: 1 });
schema.index({ season: 1, away: 1 });

module.exports = mongoose.model('Match', schema);
