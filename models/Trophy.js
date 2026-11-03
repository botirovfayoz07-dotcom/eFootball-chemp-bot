const mongoose = require('mongoose');

// Foydalanuvchining yutgan kubogi (Me -> Kolleksiya). Do'kon -> Sell orqali adminga sotiladi.
const schema = new mongoose.Schema({
  telegramId: { type: Number, required: true, index: true },
  league: { type: String, required: true },   // kubok id (liga id si bilan bir xil: 'premier-league' ...)
  season: { type: Number, required: true },
  status: { type: String, enum: ['owned', 'selling', 'sold'], default: 'owned' },
  sell: { cardLast4: String, at: Date, paidAt: Date }, // karta raqamining faqat oxirgi 4 raqami saqlanadi
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Trophy', schema);
