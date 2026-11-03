const mongoose = require('mongoose');

// Chat xabarlari: kind='match' — o'yin raqiblari orasidagi chat (key = o'yin ID si);
// kind='support' — foydalanuvchi bilan adminlar orasidagi «Muammoli holatlar» chati (key = foydalanuvchi Telegram ID si)
const schema = new mongoose.Schema({
  kind: { type: String, enum: ['match', 'support'], required: true },
  key: { type: String, required: true },
  from: { type: Number, required: true },                 // yuboruvchi Telegram ID
  admin: { type: Boolean, default: false },               // support: admin yozgan bo'lsa true
  type: { type: String, enum: ['text', 'room'], default: 'text' },   // room — eFootball xona ID si
  text: { type: String, default: '', maxlength: 1000 },
  fileId: { type: String, default: '' },                  // Telegram file_id (skrinshot)
  readBy: { type: [Number], default: [] },                // o'qigan foydalanuvchilar
  adminRead: { type: Boolean, default: false },           // support: admin o'qiganmi
  at: { type: Date, default: Date.now },
});
schema.index({ kind: 1, key: 1, at: 1 });

module.exports = mongoose.model('ChatMessage', schema);
