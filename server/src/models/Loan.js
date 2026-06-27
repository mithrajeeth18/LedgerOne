const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  loanNumber: { type: Number, required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  principalAmount: { type: Number, default: null },
  interestRate: { type: Number, default: 12 },
  totalDays: { type: Number, required: true, default: 50 },
  dailyAmount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'closed', 'rolled_over'], default: 'active' },
  isOverdue: { type: Boolean, default: false },
  previousLoanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', default: null },
  carriedOverBalance: { type: Number, default: 0 },
  closedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

loanSchema.index({ loanNumber: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model('Loan', loanSchema);
