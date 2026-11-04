const mongoose = require('mongoose');

// Har bir liga uchun qura sozlamalari
const schema = new mongoose.Schema({
  league: { type: String, required: true },
  season: { type: Number, required: true },
  drawAt: { type: Date, default: null },   // qura o'tkaziladigan vaqt (vaqti kelganda avtomatik)
  drawnAt: { type: Date, default: null },  // qura o'tkazilgan vaqt (null — hali o'tkazilmagan)
  closed: { type: Boolean, default: false }, // true — ro'yxatdan o'tish yopiq (admin paneldan boshqariladi)
  roundDays: { type: Number, default: 7 }, // bir tur necha kun (dedlayn har tur oxirgi kuni 23:59 Toshkent)
  rounds: { type: Number, enum: [1, 2], default: 2 }, // 1 — bir davra, 2 — uyda va mehmonda
});
schema.index({ season: 1, league: 1 }, { unique: true });

module.exports = mongoose.model('LeagueConfig', schema);
