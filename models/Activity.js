const mongoose = require('mongoose');

// Kunlik faol foydalanuvchilar: har bir (kun, foydalanuvchi) juftligi bitta marta saqlanadi.
// day — Toshkent vaqti bo'yicha 'YYYY-MM-DD'
const schema = new mongoose.Schema({
  day: { type: String, required: true },
  telegramId: { type: Number, required: true },
  at: { type: Date, default: Date.now },
});
schema.index({ day: 1, telegramId: 1 }, { unique: true });
schema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 }); // 180 kundan keyin o'zi o'chadi

module.exports = mongoose.model('Activity', schema);
