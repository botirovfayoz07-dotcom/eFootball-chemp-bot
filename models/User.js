const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: String,
  username: String,
  lang: { type: String, enum: ['uz', 'en', 'ru'], default: 'uz' },
  coins: { type: Number, default: 0 },           // Coins balansi (sariq tanga)
  cosmetics: { type: [String], default: [] },    // sotib olingan kosmetika (ramka / fon) id lari
  equipped: { frame: { type: String, default: null }, bg: { type: String, default: null } }, // profilda yoqilgani
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
