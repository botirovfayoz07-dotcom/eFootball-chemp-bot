const mongoose = require('mongoose');

// FA Cup bosqichlari holati. Har bir hujjat = bitta bosqich.
// stage: pl-q → ch-q1 → ch-q2 → r16 → qf → sf → final
//   pl-q    Premier Liga saralash: 20 klub → 10 juftlik
//   ch-q1   Championship saralash 1: 24 → 12
//   ch-q2   Championship saralash 2: 12 → 6
//   r16     10 + 6 = 16 klub → 1/8 final
//   qf, sf, final — pley-off davomi
const schema = new mongoose.Schema({
  cup: { type: String, default: 'fa-cup' },
  season: { type: Number, required: true },
  stage: { type: String, required: true },
  round: { type: Number, required: true },     // Match.round bilan bir xil
  teams: { type: [Number], default: [] },      // shu bosqich ishtirokchilari (Telegram ID)
  winners: { type: [Number], default: [] },    // g'oliblar (keyingi bosqichga)
  drawAt: { type: Date, default: null },       // admin belgilagan qura vaqti
  drawnAt: { type: Date, default: null },      // qura o'tkazilgan vaqt
  startedAt: { type: Date, default: null },    // tur starti (qulf ochiladi)
  deadline: { type: Date, default: null },     // tur dedlayni
  notified: { type: [String], default: [] },   // yuborilgan eslatmalar (h3 | over)
}, { timestamps: true });

schema.index({ season: 1, cup: 1, stage: 1 }, { unique: true });

module.exports = mongoose.model('Cup', schema);
