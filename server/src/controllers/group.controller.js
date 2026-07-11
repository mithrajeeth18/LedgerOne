const Group = require('../models/Group');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { groupSchema } = require('../validators/group.validator');

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const getGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ isDeleted: false }).sort({ name: 1 });
  res.json(groups);
});

const createGroup = asyncHandler(async (req, res) => {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const group = await Group.create({
    name: parsed.data.name,
    loanCounter: 0,
    createdBy: req.user._id,
  });

  res.status(201).json(group);
});

const updateGroup = asyncHandler(async (req, res) => {
  if (!Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    const group = await Group.findOne({ _id: req.params.id, isDeleted: false });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    return res.json(group);
  }

  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const group = await Group.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { name: parsed.data.name },
    { new: true }
  );
  if (!group) return res.status(404).json({ error: 'Group not found' });

  res.json(group);
});

const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.id, isDeleted: false });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const activeCustomer = await Customer.exists({ groupId: group._id, isDeleted: false });
  if (activeCustomer) return res.status(400).json({ error: 'Cannot delete group with active customers' });

  group.isDeleted = true;
  group.deletedAt = new Date();
  await group.save();

  res.json({ message: 'Group deleted' });
});

const getBinGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({
    isDeleted: true,
    deletedAt: { $gte: thirtyDaysAgo() },
  }).sort({ deletedAt: -1 });

  res.json(groups);
});

const restoreGroup = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.id, isDeleted: true });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.deletedAt || group.deletedAt < thirtyDaysAgo()) return res.status(400).json({ error: 'Bin expired' });

  group.isDeleted = false;
  group.deletedAt = null;
  await group.save();

  res.json(group);
});

// ─── Dashboard: aggregation — customers + ALL active loans + today payments ───
const getGroupDashboard = asyncHandler(async (req, res) => {
  const groupId = new mongoose.Types.ObjectId(req.params.id);

  const group = await Group.findOne({ _id: groupId, isDeleted: false }).lean();
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const customers = await Customer.aggregate([
    // Step 1: only customers in this group that are not deleted
    { $match: { groupId, isDeleted: false } },

    // Step 2: join ALL active loans (no $limit)
    {
      $lookup: {
        from: 'loans',
        let: { customerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$customerId', '$$customerId'] },
              status: 'active',
            },
          },
          { $sort: { createdAt: 1 } },
          { $project: { _id: 1, loanNumber: 1, dailyAmount: 1, startDate: 1 } },
        ],
        as: 'activeLoans',
      },
    },

    // Step 3: compute total daily amount across all active loans
    {
      $addFields: {
        totalDailyAmount: { $sum: '$activeLoans.dailyAmount' },
        activeLoanIds: '$activeLoans._id',
      },
    },

    // Step 4: join today's payments for ALL active loan IDs
    {
      $lookup: {
        from: 'payments',
        let: { loanIds: '$activeLoanIds' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$loanId', '$$loanIds'] },
                  { $gte: ['$paymentDate', todayStart] },
                  { $lte: ['$paymentDate', todayEnd] },
                ],
              },
            },
          },
          { $project: { _id: 1, loanId: 1, status: 1, paidAmount: 1 } },
        ],
        as: 'todayPayments',
      },
    },

    // Step 5: sum total paid today across all loans
    {
      $addFields: {
        todayTotalPaid: { $sum: '$todayPayments.paidAmount' },
      },
    },

    // Step 6: shape final output (drop internal helper fields)
    {
      $project: {
        _id: 1,
        name: 1,
        phone: 1,
        activeLoans: 1,
        totalDailyAmount: 1,
        todayPayments: 1,
        todayTotalPaid: 1,
      },
    },
  ]);

  res.json({ group: { _id: group._id, name: group.name }, customers });
});


module.exports = { getGroups, createGroup, updateGroup, deleteGroup, getBinGroups, restoreGroup, getGroupDashboard };
