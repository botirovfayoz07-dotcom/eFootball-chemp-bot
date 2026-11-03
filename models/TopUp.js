const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  telegramId: { type: Number, required: true, index: true },
  coins: { type: Number, required: true },
  amount: { type: Number, required: true },   // UZS
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  doneAt: Date,
});

module.exports = mongoose.model('TopUp', schema);
