const Payment = require('../models/Payment');
const Loan = require('../models/Loan');
const User = require('../models/User');
const Group = require('../models/Group');
const Customer = require('../models/Customer');
const asyncHandler = require('../utils/asyncHandler');
const { getPaymentStatus, isPaymentLocked } = require('../utils/loanCalculator');
const { paymentSchema, updatePaymentSchema, syncPaymentSchema } = require('../validators/payment.validator');

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const isFutureDate = (date) => startOfDay(date) > startOfDay(new Date());

const recalculateLoanPending = async (loanId) => {
  const payments = await Payment.find({ loanId }).sort({ paymentDate: 1, createdAt: 1 });
  let pending = 0;

  for (const payment of payments) {
    pending += payment.expectedAmount - payment.paidAmount;
    payment.cumulativePending = pending;
    await payment.save();
  }
};

const markPayment = asyncHandler(async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { loanId, paidAmount, paymentMode } = parsed.data;
  const paymentDate = startOfDay(parsed.data.paymentDate);

  const loan = await Loan.findOne({ _id: loanId, status: 'active' });
  if (!loan) return res.status(400).json({ error: 'Loan not found or not active' });
  if (isFutureDate(paymentDate)) return res.status(400).json({ error: 'Cannot mark payment for a future date' });

  const duplicate = await Payment.exists({ loanId, paymentDate });
  if (duplicate) return res.status(400).json({ error: 'Payment already exists for this date. Use PUT to edit.' });

  const expectedAmount = loan.dailyAmount;
  const payment = await Payment.create({
    loanId,
    collectedBy: req.user._id,
    paymentDate,
    expectedAmount,
    paidAmount,
    status: getPaymentStatus(paidAmount, expectedAmount),
    paymentMode,
    extraAmount: paidAmount > expectedAmount ? paidAmount - expectedAmount : 0,
    isLocked: isPaymentLocked(paymentDate),
    isOfflineEntry: parsed.data.isOfflineEntry || false,
    syncedAt: parsed.data.isOfflineEntry ? new Date() : null,
  });

  await recalculateLoanPending(loanId);
  const saved = await Payment.findById(payment._id);
  res.status(201).json(saved);
});

const updatePayment = asyncHandler(async (req, res) => {
  const parsed = updatePaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.isLocked || isPaymentLocked(payment.paymentDate)) {
    payment.isLocked = true;
    await payment.save();
    return res.status(423).json({ error: 'This entry is locked. Adjust in a future payment.' });
  }

  payment.paidAmount = parsed.data.paidAmount;
  payment.paymentMode = parsed.data.paymentMode;
  payment.status = getPaymentStatus(payment.paidAmount, payment.expectedAmount);
  payment.extraAmount = payment.paidAmount > payment.expectedAmount ? payment.paidAmount - payment.expectedAmount : 0;
  await payment.save();

  await recalculateLoanPending(payment.loanId);
  const updated = await Payment.findById(payment._id);
  res.json(updated);
});

const getTodayPayments = asyncHandler(async (req, res) => {
  const today = new Date();

  // 1. Fetch active groups
  const activeGroups = await Group.find({ isDeleted: false }).lean();
  const byGroup = {};
  for (const g of activeGroups) {
    byGroup[g.name] = {
      groupId: g._id.toString(),
      groupName: g.name,
      collected: 0,
      expected: 0,
      totalCash: 0,
      totalOnline: 0,
      totalActiveCustomers: 0,
      paidCustomersCount: 0,
    };
  }

  // 2. Fetch active loans to count total active customers & compute total expected collections today
  const activeLoans = await Loan.find({ status: 'active' }).populate('customerId').lean();
  for (const loan of activeLoans) {
    if (!loan.customerId || loan.customerId.isDeleted) continue;
    if (loan.startDate > endOfDay(today)) continue;

    const group = activeGroups.find(g => g._id.toString() === loan.groupId.toString());
    if (group && byGroup[group.name]) {
      byGroup[group.name].totalActiveCustomers += 1;
      byGroup[group.name].expected += loan.dailyAmount;
    }
  }

  // 3. Fetch today's payments
  const payments = await Payment.find({
    paymentDate: { $gte: startOfDay(today), $lte: endOfDay(today) },
  })
    .populate('collectedBy', 'name')
    .populate({
      path: 'loanId',
      populate: [
        { path: 'customerId', select: 'name isDeleted' },
        { path: 'groupId', select: 'name' },
      ],
    });

  // 4. Initialize collectors with all registered users in database
  const allUsers = await User.find().lean();
  const byCollector = {};
  for (const u of allUsers) {
    byCollector[u.name] = {
      count: 0,
      totalCash: 0,
      totalOnline: 0,
      totalAmount: 0,
    };
  }

  const totals = { totalCollected: 0, totalCash: 0, totalOnline: 0 };

  // 5. Aggregate payments into totals, groups, and collectors
  for (const payment of payments) {
    if (!payment.loanId || !payment.loanId.customerId || payment.loanId.customerId.isDeleted) continue;

    const collectorName = payment.collectedBy?.name || 'Unknown';
    const groupName = payment.loanId?.groupId?.name || 'Unknown';

    if (!byCollector[collectorName]) {
      byCollector[collectorName] = { count: 0, totalCash: 0, totalOnline: 0, totalAmount: 0 };
    }
    byCollector[collectorName].count += 1;
    byCollector[collectorName].totalAmount += payment.paidAmount;

    if (byGroup[groupName]) {
      byGroup[groupName].collected += payment.paidAmount;
      byGroup[groupName].paidCustomersCount += 1;
    }

    totals.totalCollected += payment.paidAmount;
    if (payment.paymentMode === 'cash') {
      byCollector[collectorName].totalCash += payment.paidAmount;
      if (byGroup[groupName]) byGroup[groupName].totalCash += payment.paidAmount;
      totals.totalCash += payment.paidAmount;
    } else {
      byCollector[collectorName].totalOnline += payment.paidAmount;
      if (byGroup[groupName]) byGroup[groupName].totalOnline += payment.paidAmount;
      totals.totalOnline += payment.paidAmount;
    }
  }

  res.json({ totals, byCollector, byGroup, payments });
});

const syncPayments = asyncHandler(async (req, res) => {
  const parsed = syncPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const failed = [];
  let synced = 0;

  for (const item of parsed.data.payments) {
    try {
      const loan = await Loan.findOne({ _id: item.loanId, status: 'active' });
      if (!loan) throw new Error('Loan not found or not active');

      const paymentDate = startOfDay(item.paymentDate);
      const expectedAmount = loan.dailyAmount;
      await Payment.findOneAndUpdate(
        { loanId: item.loanId, paymentDate },
        {
          loanId: item.loanId,
          collectedBy: req.user._id,
          paymentDate,
          expectedAmount,
          paidAmount: item.paidAmount,
          status: getPaymentStatus(item.paidAmount, expectedAmount),
          paymentMode: item.paymentMode,
          extraAmount: item.paidAmount > expectedAmount ? item.paidAmount - expectedAmount : 0,
          isLocked: isPaymentLocked(paymentDate),
          isOfflineEntry: true,
          syncedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await recalculateLoanPending(item.loanId);
      synced += 1;
    } catch (err) {
      failed.push({ payment: item, error: err.message });
    }
  }

  res.json({ synced, failed });
});

const getPaymentsForLoan = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ loanId: req.params.loanId }).sort({ paymentDate: 1 });
  res.json(payments);
});

module.exports = { markPayment, updatePayment, getTodayPayments, syncPayments, getPaymentsForLoan };
