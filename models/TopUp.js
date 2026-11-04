const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  telegramId: { type: Number, required: true, index: true },
  coins: { type: Number, required: true },
  amount: { type: Number, required: true },   // UZS
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'reversed'], default: 'pending' },
  provider: { type: String, enum: ['manual', 'payme', 'click'], default: 'manual' },  // manual = chek rasmi, qolganlari = avtomatik
  imageHash: { type: String, default: undefined }, // chek rasmining sha256 hash'i: bir xil chek ikki marta ishlamasin
  // Avtomatik to'lov (Payme / Click) holati
  providerTxId: { type: String, default: null },        // Payme tranzaksiya id yoki Click click_trans_id
  providerPrepareId: { type: Number, default: null },   // Click merchant_prepare_id
  providerState: { type: Number, default: null },       // Payme: 1 yaratilgan, 2 bajarilgan, -1/-2 bekor
  providerCreateTime: { type: Number, default: null },  // ms
  providerPerformTime: { type: Number, default: null },
  providerCancelTime: { type: Number, default: null },
  providerReason: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  doneAt: Date,
});
// sparse: hash yo'q eski yozuvlar indeksga kirmaydi
schema.index({ imageHash: 1 }, { unique: true, sparse: true });
schema.index({ provider: 1, providerTxId: 1 });

module.exports = mongoose.model('TopUp', schema);
