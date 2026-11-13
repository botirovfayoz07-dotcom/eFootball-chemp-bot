const mongoose = require('mongoose');

// Umumiy admin: glava admin qo'shadi. Hamma ligani va klubni boshqaradi,
// lekin statistika, yordamchilar, kubok narxi va boshqa adminlarni boshqara olmaydi.
const schema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  addedBy: { type: Number, default: null },
  addedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('GeneralAdmin', schema);
