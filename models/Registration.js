const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  league: { type: String, required: true },
  season: { type: Number, required: true },
  telegramId: { type: Number, required: true },
  club: { type: String, required: true },
  // Reyting statistikasi (o'yin natijalari qo'shilganda yangilanadi)
  pts: { type: Number, default: 0 }, w: { type: Number, default: 0 }, d: { type: Number, default: 0 },
  l: { type: Number, default: 0 }, gf: { type: Number, default: 0 }, ga: { type: Number, default: 0 },
  auction: { price: Number, at: Date }, // klub auksionga qo'yilgan bo'lsa narxi
  createdAt: { type: Date, default: Date.now },
});
// Bitta klubni faqat bitta odam oladi; bitta odam mavsumda faqat bitta ligada bitta klub oladi
schema.index({ league: 1, season: 1, club: 1 }, { unique: true });
schema.index({ season: 1, telegramId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', schema);
