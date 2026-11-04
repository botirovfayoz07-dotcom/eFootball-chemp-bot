const mongoose = require('mongoose');

// Admin ommaviy xabarlari tarixi (kim, nima, qancha odamga yuborilgani)
const schema = new mongoose.Schema({
  by: { type: Number, required: true },                 // admin Telegram ID
  text: { type: String, required: true },
  league: { type: String, default: null },              // null — hamma, aks holda shu liga o'yinchilari
  lang: { type: String, default: null },                // null — barcha tillar
  status: { type: String, enum: ['running', 'done', 'interrupted'], default: 'running' },
  total: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  blocked: { type: Number, default: 0 },                // botni bloklagan foydalanuvchilar
  createdAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
});

module.exports = mongoose.model('Broadcast', schema);
