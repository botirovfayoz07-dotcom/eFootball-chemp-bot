const mongoose = require('mongoose');

// Mavsum "ochilgani"ni bir marta yozib qo'yadigan hujjat.
// Bu — avtomatik startning dalili: mavsum vaqti kelganda ligalar ham,
// FA Cup / Community Shield kabi kuboklar ham qo'lda ochilmasdan ishga tushadi.
const schema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    startAt: Date,
    endAt: Date,
    // Mavsum start olgan payt (avtomatik, idempotent)
    openedAt: { type: Date, default: null },
    // Kuboklar aynan shu paytda avtomatik ochilgan
    cupsStartedAt: { type: Date, default: null },
    cups: { type: [String], default: [] },
    checkedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Season', schema);
