const mongoose = require('mongoose');

const penaltySchema = new mongoose.Schema({
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, default: '', trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Penalty', penaltySchema);
