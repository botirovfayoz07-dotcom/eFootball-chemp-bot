'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  // Telegram ID bo'lmasa ham admin qo'lda ishtirokchi qo'sha oladi
  telegramId: { type: Number },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, trim: true, maxlength: 64 },
  club: { type: String, trim: true, maxlength: 60, default: '' },
  addedBy: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

schema.index({ tournament: 1, createdAt: 1 });
schema.index(
  { tournament: 1, telegramId: 1 },
  { unique: true, partialFilterExpression: { telegramId: { $type: 'number' } } }
);

module.exports = mongoose.model('TournamentPlayer', schema);
