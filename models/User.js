const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: String,
  username: String,
  photoUrl: String,                              // Telegram avatar havolasi (boshqalar profilni ko'rganda chiqadi)
  lang: { type: String, enum: ['uz', 'en', 'ru'], default: 'uz' },
  coins: { type: Number, default: 0 },           // Coins balansi (sariq tanga)
  cosmetics: { type: [String], default: [] },    // sotib olingan kosmetika (ramka / fon) id lari
  equipped: { frame: { type: String, default: null }, bg: { type: String, default: null }, pbg: { type: String, default: null } }, // profilda yoqilgani
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: null },
  blocked: { type: Boolean, default: false },     // botni bloklagan (ommaviy xabar o'tkazib yuboriladi)
  // Kunlik bonus
  dailyDay: { type: String, default: null },     // oxirgi bonus olingan kun ('YYYY-MM-DD', Toshkent)
  dailyStreak: { type: Number, default: 0 },     // ketma-ket kunlar soni
  // Referal (do'st taklif qilish)
  referredBy: { type: Number, default: null },   // kim taklif qilgan (Telegram ID)
  refPaid: { type: Boolean, default: false },    // taklif bonusi to'landimi (taklif qilingan odam ligaga yozilgach)
  refCount: { type: Number, default: 0 },        // taklif qilgan va bonus to'langan do'stlar soni
});
userSchema.index({ lastSeen: 1 });
userSchema.index({ createdAt: 1 });

module.exports = mongoose.model('User', userSchema);
