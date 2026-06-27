const Reminder = require('../models/Reminder');
const asyncHandler = require('../utils/asyncHandler');
const { reminderSchema } = require('../validators/reminder.validator');

const createReminder = asyncHandler(async (req, res) => {
  const parsed = reminderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const reminder = await Reminder.create({
    loanId: parsed.data.loanId,
    customerId: parsed.data.customerId,
    createdBy: req.user._id,
    reminderTime: parsed.data.reminderTime,
    repeatType: parsed.data.repeatType,
    reminderDate: parsed.data.repeatType === 'once' ? parsed.data.reminderDate : null,
  });

  res.status(201).json(reminder);
});

const getReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ createdBy: req.user._id, isActive: true })
    .populate('customerId', 'name')
    .populate('loanId', 'loanNumber')
    .sort({ createdAt: -1 });

  res.json(reminders);
});

const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

  res.json({ message: 'Reminder deleted' });
});

module.exports = { createReminder, getReminders, deleteReminder };
