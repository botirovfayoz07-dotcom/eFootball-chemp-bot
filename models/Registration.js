const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  league: { type: String, required: true },
  season: { type: Number, required: true },
  telegramId: { type: Number, required: true },
  club: { type: String, required: true },
  // Reyting statistikasi (o'yin natijalari qo'shilganda yangilanadi)
  pts: { type: Number, default: 0 }, w: { type: Number, default: 0 }, d: { type: Number, default: 0 },
  l: { type: Number, default: 0 }, gf: { type: Number, default: 0 }, ga: { type: Number, default: 0 },
  releasing: { type: Boolean, default: false }, // "Klubimni topshiraman" yoqilgan
  createdAt: { type: Date, default: Date.now },
});
// Bitta klubni faqat bitta odam oladi; bitta odam mavsumda faqat bitta ligada bitta klub oladi
schema.index({ league: 1, season: 1, club: 1 }, { unique: true });
schema.index({ season: 1, telegramId: 1 }, { unique: true });
// Ro'yxat/reyting so'rovlari uchun: mavsum bo'yicha liga kesimida tez o'qish
schema.index({ season: 1, league: 1 });
// "Klubini topshirayotganlar" ro'yxati uchun
schema.index({ season: 1, releasing: 1 });

module.exports = mongoose.model('Registration', schema);
