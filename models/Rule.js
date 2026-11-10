const mongoose = require('mongoose');

// Umumiy qoidalar: admin bo'limlar (sarlavha + matn) qo'shadi, o'yinchilar o'qiydi
const schema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 80 },
  text: { type: String, default: '', maxlength: 8000 },
  order: { type: Number, default: 0 },
  by: { type: Number, default: null },        // qo'shgan admin (Telegram ID)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
schema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Rule', schema);
