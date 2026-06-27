const Loan = require('../models/Loan');
const Penalty = require('../models/Penalty');
const asyncHandler = require('../utils/asyncHandler');
const { penaltySchema } = require('../validators/penalty.validator');

const createPenalty = asyncHandler(async (req, res) => {
  const parsed = penaltySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const loan = await Loan.findById(parsed.data.loanId);
  if (!loan) return res.status(400).json({ error: 'Loan not found' });

  const penalty = await Penalty.create({
    loanId: parsed.data.loanId,
    addedBy: req.user._id,
    amount: parsed.data.amount,
    reason: parsed.data.reason || '',
  });

  res.status(201).json(penalty);
});

const getPenaltiesForLoan = asyncHandler(async (req, res) => {
  const penalties = await Penalty.find({ loanId: req.params.loanId }).sort({ createdAt: 1 });
  res.json(penalties);
});

module.exports = { createPenalty, getPenaltiesForLoan };
