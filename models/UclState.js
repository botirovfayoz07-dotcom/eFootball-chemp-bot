const mongoose = require('mongoose');

// Chempionlar ligasi holati (mavsumiga bitta hujjat)
//   phase: 'setup' (ishtirokchilar tanlanadi) → 'league' → 'knockout' → 'finished'
const schema = new mongoose.Schema({
  season: { type: Number, required: true, unique: true },
  phase: { type: String, enum: ['setup', 'league', 'knockout', 'finished'], default: 'setup' },
  participants: { type: [Number], default: [] },
  knockoutSize: { type: Number, default: 0 },
  stage: { type: String, default: null },        // hozirgi pley-off bosqichi: qf | sf | final
  champion: { type: Number, default: null },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UclState', schema);
