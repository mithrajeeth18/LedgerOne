const Group = require('../models/Group');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const Penalty = require('../models/Penalty');
const asyncHandler = require('../utils/asyncHandler');
const { calculateFromPrincipal } = require('../utils/loanCalculator');
const { loanSchema, rolloverSchema, editLoanSchema } = require('../validators/loan.validator');

const assignLoanNumber = async (groupId) => {
  const updatedGroup = await Group.findOneAndUpdate(
    { _id: groupId, loanCounter: { $lt: 500 }, isDeleted: false },
    { $inc: { loanCounter: 1 } },
    { new: true }
  );

  if (!updatedGroup) return null;
  return updatedGroup.loanCounter;
};

const calculateRemainingBalance = async (loanId) => {
  const latest = await Payment.findOne({ loanId }).sort({ paymentDate: -1, createdAt: -1 });
  return latest ? latest.cumulativePending : 0;
};

const getLoansForCustomer = asyncHandler(async (req, res) => {
  const loans = await Loan.find({ customerId: req.params.customerId }).sort({ createdAt: -1 });
  res.json(loans);
});

const getLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id).populate('customerId').populate('groupId');
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const payments = await Payment.find({ loanId: loan._id }).sort({ paymentDate: 1 });
  const penalties = await Penalty.find({ loanId: loan._id }).sort({ createdAt: 1 });

  res.json({ loan, payments, penalties });
});

const createLoan = asyncHandler(async (req, res) => {
  const parsed = loanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { customerId, groupId, mode, totalDays, startDate } = parsed.data;
  const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
  if (!customer) return res.status(400).json({ error: 'Customer not found' });
  if (customer.groupId.toString() !== groupId) return res.status(400).json({ error: 'Group does not match customer' });




  let principalAmount = null;
  const interestRate = parsed.data.interestRate ?? 12;
  let dailyAmount = parsed.data.dailyAmount;

  if (mode === 'principal') {
    principalAmount = parsed.data.principalAmount;
    dailyAmount = calculateFromPrincipal(principalAmount, interestRate, totalDays).dailyAmount;
  }

  const loanNumber = await assignLoanNumber(groupId);
  if (!loanNumber) return res.status(400).json({ error: 'Loan number limit reached for this group. Contact developer.' });

  const loan = await Loan.create({
    loanNumber,
    groupId,
    customerId,
    principalAmount,
    interestRate,
    totalDays,
    dailyAmount,
    startDate,
    createdBy: req.user._id,
  });

  res.status(201).json(loan);
});

const closeLoan = asyncHandler(async (req, res) => {
  const existingLoan = await Loan.findById(req.params.id);
  if (!existingLoan) return res.status(404).json({ error: 'Loan not found' });
  if (existingLoan.status !== 'active') return res.status(400).json({ error: 'Loan is not active' });

  existingLoan.status = 'closed';
  existingLoan.closedAt = new Date();
  await existingLoan.save();

  res.json(existingLoan);
});

const rolloverLoan = asyncHandler(async (req, res) => {
  const parsed = rolloverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const oldLoan = await Loan.findOne({ _id: req.params.id, status: 'active' });
  if (!oldLoan) return res.status(404).json({ error: 'Active loan not found' });

  const remainingBalance = await calculateRemainingBalance(oldLoan._id);
  const principalAmount = parsed.data.newAmount + remainingBalance;
  const interestRate = parsed.data.interestRate ?? 12;
  const calculated = calculateFromPrincipal(principalAmount, interestRate, parsed.data.totalDays);

  const loanNumber = await assignLoanNumber(oldLoan.groupId);
  if (!loanNumber) return res.status(400).json({ error: 'Loan number limit reached for this group. Contact developer.' });

  oldLoan.status = 'rolled_over';
  oldLoan.closedAt = new Date();
  await oldLoan.save();

  const newLoan = await Loan.create({
    loanNumber,
    groupId: oldLoan.groupId,
    customerId: oldLoan.customerId,
    principalAmount,
    interestRate,
    totalDays: parsed.data.totalDays,
    dailyAmount: calculated.dailyAmount,
    startDate: parsed.data.startDate,
    previousLoanId: oldLoan._id,
    carriedOverBalance: remainingBalance,
    createdBy: req.user._id,
  });

  res.json({ closedLoan: oldLoan, newLoan });
});

const markOverdue = asyncHandler(async (req, res) => {
  const loan = await Loan.findOne({ _id: req.params.id, status: 'active' });
  if (!loan) return res.status(404).json({ error: 'Active loan not found' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(loan.startDate);
  start.setHours(0, 0, 0, 0);
  const daysPassed = Math.floor((today - start) / (24 * 60 * 60 * 1000));

  if (daysPassed <= loan.totalDays) return res.status(400).json({ error: 'Loan is not yet overdue' });

  loan.isOverdue = true;
  await loan.save();
  res.json(loan);
});

const editLoan = asyncHandler(async (req, res) => {
  const parsed = editLoanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const loan = await Loan.findOne({ _id: req.params.id, status: 'active' });
  if (!loan) return res.status(404).json({ error: 'Active loan not found' });

  const { mode, totalDays, startDate } = parsed.data;
  const interestRate = parsed.data.interestRate ?? 12;

  let newDailyAmount;
  let newPrincipalAmount = loan.principalAmount;

  if (mode === 'daily') {
    newDailyAmount = parsed.data.dailyAmount;
    newPrincipalAmount = null;
  } else {
    newPrincipalAmount = parsed.data.principalAmount;
    newDailyAmount = calculateFromPrincipal(newPrincipalAmount, interestRate, totalDays).dailyAmount;
  }

  // Update the loan's core fields
  loan.dailyAmount = newDailyAmount;
  loan.totalDays = totalDays;
  loan.startDate = startDate;
  loan.principalAmount = newPrincipalAmount;
  loan.interestRate = interestRate;
  await loan.save();

  // Recalculate ALL existing payments against the new dailyAmount
  const payments = await Payment.find({ loanId: loan._id }).sort({ paymentDate: 1, createdAt: 1 });
  let cumulativePending = 0;

  for (const payment of payments) {
    payment.expectedAmount = newDailyAmount;
    const diff = payment.paidAmount - payment.expectedAmount;
    if (payment.paidAmount === 0) {
      payment.status = 'skipped';
    } else if (diff === 0) {
      payment.status = 'paid';
    } else if (diff > 0) {
      payment.status = 'overpaid';
      payment.extraAmount = diff;
    } else {
      payment.status = 'underpaid';
      payment.extraAmount = 0;
    }
    cumulativePending += payment.expectedAmount - payment.paidAmount;
    payment.cumulativePending = cumulativePending;
    await payment.save();
  }

  res.json({ loan, paymentsRecalculated: payments.length });
});

module.exports = { getLoansForCustomer, getLoan, createLoan, closeLoan, rolloverLoan, markOverdue, editLoan };
