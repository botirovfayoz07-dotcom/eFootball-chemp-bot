'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  round: { type: Number, default: 1, min: 1 },
  home: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer', required: true },
  away: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer', required: true },
  scheduledAt: { type: Date, default: null },
  // scheduled -> (pending -> confirmed | disputed) yoki admin tomonidan confirmed
  status: { type: String, enum: ['scheduled', 'pending', 'confirmed', 'disputed'], default: 'scheduled', index: true },
  homeScore: { type: Number, default: null },
  awayScore: { type: Number, default: null },
  // Hisobni kim yubordi (o'yinchi) va kim tasdiqladi
  submittedById: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer', default: null },
  submittedBy: { type: Number, default: null },
  submittedAt: { type: Date, default: null },
  confirmedBy: { type: Number, default: null },
  confirmedAt: { type: Date, default: null },
  // player — o'yinchi kiritsa, admin — admin panel orqali
  resultSource: { type: String, enum: ['player', 'admin'], default: null },
  disputeReason: { type: String, trim: true, maxlength: 300, default: '' },
  disputedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

schema.index({ tournament: 1, round: 1, scheduledAt: 1 });
schema.index({ tournament: 1, status: 1 });

module.exports = mongoose.model('TournamentMatch', schema);
