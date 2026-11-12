const mongoose = require('mongoose');

// Chempionlar ligasi (UCL) o'yini. Hisobni faqat admin kiritadi.
//   stage: 'league' | 'qf' | 'sf' | 'final'
//   home / away: Telegram ID (klub egasi)
const schema = new mongoose.Schema({
  season: { type: Number, required: true },
  stage: { type: String, enum: ['league', 'qf', 'sf', 'final'], required: true },
  round: { type: Number, default: 0 },           // lig bosqichi: tur raqami; pley-off: 0
  matchNo: { type: Number, default: null },     // #1, #2 ...
  slot: { type: Number, default: 0 },           // pley-off: juftlik tartibi
  home: { type: Number, required: true },
  away: { type: Number, required: true },
  hg: { type: Number, default: null },
  ag: { type: Number, default: null },
  updatedAt: { type: Date, default: Date.now },
});
schema.index({ season: 1, stage: 1, round: 1, slot: 1 });
schema.index({ season: 1, matchNo: 1 });

module.exports = mongoose.model('UclMatch', schema);
