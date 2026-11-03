const mongoose = require('mongoose');

// Norasmiy turnir o'yini. Holatlar: scheduled → pending (biri kiritdi) → confirmed (raqib tasdiqladi);
// review — katta hisob, tashkilotchi/admin tasdig'ini kutadi; disputed — "Yolg'on", hisob bekor, tashkilotchi/admin kiritadi.
const schema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  stage: { type: String, enum: ['league', 'playoff'], default: 'league' },
  round: { type: Number, required: true },
  slot: { type: Number, default: null }, // play-off: setkadagi o'rin
  home: { type: Number, required: true },
  away: { type: Number, required: true },
  status: { type: String, enum: ['scheduled', 'pending', 'review', 'disputed', 'confirmed', 'cancelled'], default: 'scheduled' },
  hg: { type: Number, default: null },
  ag: { type: Number, default: null },
  reportedBy: { type: Number, default: null },
  claim: { type: { hg: Number, ag: Number, by: Number }, default: null, _id: false },
  confirmedBy: { type: String, enum: ['player', 'manager', null], default: null },
  updatedAt: { type: Date, default: Date.now },
});
schema.index({ tournament: 1, stage: 1, round: 1 });
schema.index({ tournament: 1, home: 1 });
schema.index({ tournament: 1, away: 1 });
schema.index({ tournament: 1, stage: 1, round: 1, slot: 1 }, { unique: true, partialFilterExpression: { stage: 'playoff' } });

module.exports = mongoose.model('TMatch', schema);
