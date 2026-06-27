const Group = require('../models/Group');
const Customer = require('../models/Customer');
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

module.exports = { getGroups, createGroup, updateGroup, deleteGroup, getBinGroups, restoreGroup };
