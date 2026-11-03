const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  openDaysBefore: { type: Number, default: null },
  updatedBy: { type: Number, default: null },
  openedAt: { type: Date, default: null },
  cupsStartedAt: { type: Date, default: null },
  cups: { type: [String], default: [] },
  checkedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Season', schema);