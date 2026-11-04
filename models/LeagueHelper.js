const mongoose = require('mongoose');

// Yordamchi admin: bitta ligaga biriktirilgan. Shu ligadagi natijalar, qura va ishtirokchilarni boshqaradi.
const schema = new mongoose.Schema({
  telegramId: { type: Number, required: true },
  league: { type: String, required: true },       // liga id (EFL)
  addedBy: { type: Number, default: null },        // qo'shgan katta admin
  addedAt: { type: Date, default: Date.now },
});
schema.index({ telegramId: 1, league: 1 }, { unique: true });

module.exports = mongoose.model('LeagueHelper', schema);
