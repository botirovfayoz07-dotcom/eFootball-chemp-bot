const mongoose = require('mongoose');

// Norasmiy turnir (foydalanuvchi o'zi tuzadi): liga bosqichi + ixtiyoriy play-off
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // taklif kodi
  ownerId: { type: Number, required: true },
  maxPlayers: { type: Number, required: true },
  rounds: { type: Number, required: true },        // so'ralgan liga turlari soni
  effRounds: { type: Number, default: 0 },         // qura natijasida haqiqiy turlar soni
  playoff: { type: Number, default: 0 },           // play-off ishtirokchilari (0 — yo'q, 2/4/8/16)
  roundDays: { type: Number, default: 1 },         // bir tur necha kun (muddat har kuni 23:59 Toshkent)
  status: { type: String, enum: ['open', 'league', 'playoff', 'finished'], default: 'open' },
  drawAt: { type: Date, default: null },
  format: { type: String, enum: ['league', 'wc'], default: 'league' }, // league: lig+pley-off; wc: JCH — guruhlar+pley-off
  official: { type: Boolean, default: false },   // rasmiy turnir (admin yaratadi va boshqaradi)
  groups: { type: Number, default: 0 },           // wc: guruhlar soni (2/4/8)
  advance: { type: Number, default: 0 },          // wc: har guruhdan chiqadiganlar (1/2)
  paid: { type: Number, default: 0 },          // yaratish uchun to'langan coin (adminlarda 0)
  startedAt: { type: Date, default: null },
  champion: { type: Number, default: null },
  notified: { type: [String], default: [] },       // yuborilgan eslatmalar (h3:<bosqich>:<tur>)
  players: { type: [{ telegramId: Number, team: { type: String, default: '' }, _id: false }], default: [] },
  createdAt: { type: Date, default: Date.now },
});
schema.index({ ownerId: 1 });
schema.index({ 'players.telegramId': 1 });
schema.index({ status: 1, drawAt: 1 });

module.exports = mongoose.model('Tournament', schema);
