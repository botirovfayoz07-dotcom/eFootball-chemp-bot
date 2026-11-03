'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  format: { type: String, enum: ['league'], default: 'league' },
  status: { type: String, enum: ['draft', 'live', 'finished'], default: 'draft', index: true },
  maxPlayers: { type: Number, default: 8, min: 2, max: 64 },
  createdBy: { type: Number, required: true, index: true },
  startsAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

schema.index({ createdAt: -1 });

module.exports = mongoose.model('Tournament', schema);
