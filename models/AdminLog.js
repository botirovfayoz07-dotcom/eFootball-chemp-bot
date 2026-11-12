const mongoose = require('mongoose');

// Admin amallari jurnali: kim, qachon, nima qildi
const schema = new mongoose.Schema({
  at: { type: Date, default: Date.now, index: true },
  actor: { type: Number, required: true },   // admin Telegram ID
  action: { type: String, required: true },  // masalan: ucl.result, auction.finalize
  target: { type: String, default: '' },     // o'yin / klub / turnir ID
  data: { type: mongoose.Schema.Types.Mixed, default: null },
});
module.exports = mongoose.model('AdminLog', schema);
