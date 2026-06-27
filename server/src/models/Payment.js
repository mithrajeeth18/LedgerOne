const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentDate: { type: Date, required: true },
  expectedAmount: { type: Number, required: true },
  paidAmount: { type: Number, required: true, default: 0 },
  status: {
    type: String,
    enum: ['paid', 'underpaid', 'skipped', 'overpaid'],
    required: true,
  },
  paymentMode: { type: String, enum: ['cash', 'online'], required: true },
  extraAmount: { type: Number, default: 0 },
  cumulativePending: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  isOfflineEntry: { type: Boolean, default: false },
  syncedAt: { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ loanId: 1, paymentDate: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
