const mongoose = require('mongoose');

// Har bir liga kubogining narxi (UZS). Admin paneldan belgilanadi; foydalanuvchilar kubokni shu narxda adminga sotadi.
const schema = new mongoose.Schema({
  league: { type: String, required: true, unique: true },   // kubok id (liga id si bilan bir xil)
  price: { type: Number, required: true, min: 0 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CupPrice', schema);
