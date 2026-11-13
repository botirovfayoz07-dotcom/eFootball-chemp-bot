const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  league: { type: String, required: true },
  season: { type: Number, required: true },
  telegramId: { type: Number, required: true },
  club: { type: String, required: true },
  // Reyting statistikasi (o'yin natijalari qo'shilganda yangilanadi)
  pts: { type: Number, default: 0 }, w: { type: Number, default: 0 }, d: { type: Number, default: 0 },
  l: { type: Number, default: 0 }, gf: { type: Number, default: 0 }, ga: { type: Number, default: 0 },
  // Auksion: narx, oxirgi taklif (summa va kim qo'ydi). currentBid/bidder default bermaydi — bo'sh bo'lsa, "taklif yo'q" degani
  auction: { price: Number, at: Date, currentBid: Number, bidder: Number, bidAt: Date },
  vacant: { type: Boolean, default: false },   // egasi voz kechgan: klub o'yinlari va natijalari bilan saqlanadi, telegramId — manfiy texnik raqam (yangi egasi kelguncha)
  createdAt: { type: Date, default: Date.now },
});
// Bitta klubni faqat bitta odam oladi; bitta odam mavsumda faqat bitta ligada bitta klub oladi
schema.index({ league: 1, season: 1, club: 1 }, { unique: true });
schema.index({ season: 1, telegramId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', schema);
