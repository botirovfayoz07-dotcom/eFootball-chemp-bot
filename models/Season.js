const mongoose = require('mongoose');

// Mavsum sozlamalari — START SANASI ADMIN PANELDA KIRITILADI.
// Shu hujjatdagi startAt/number hamma liga va kuboklar uchun yagona manba.
// openedAt — mavsum avtomatik start olgan payt (bir marta yoziladi).
const schema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    // Ro'yxat startdan necha kun oldin ochiladi
    openDaysBefore: { type: Number, default: null },
    // Kim o'zgartirgan (admin telegramId)
    updatedBy: { type: Number, default: null },

    openedAt: { type: Date, default: null },
    cupsStartedAt: { type: Date, default: null },
    cups: { type: [String], default: [] },
    checkedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Season', schema);
