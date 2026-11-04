const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  telegramId: { type: Number, required: true, index: true },
  coins: { type: Number, required: true },
  amount: { type: Number, required: true },   // UZS
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'reversed'], default: 'pending' },
  imageHash: { type: String, default: undefined }, // chek rasmining sha256 hash'i: bir xil chek ikki marta ishlamasin
  createdAt: { type: Date, default: Date.now },
  doneAt: Date,
});
// sparse: hash yo'q eski yozuvlar indeksga kirmaydi
schema.index({ imageHash: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TopUp', schema);
