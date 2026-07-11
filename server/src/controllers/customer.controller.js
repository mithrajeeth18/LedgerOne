const Customer = require('../models/Customer');
const Group = require('../models/Group');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const { customerSchema, updateCustomerSchema } = require('../validators/customer.validator');

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const populateGroup = { path: 'groupId', select: 'name loanCounter' };

const getCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ isDeleted: false }).populate(populateGroup).sort({ name: 1 }).lean();

  const activeLoans = await Loan.find({ status: 'active' }).lean();
  const loanMap = {};
  for (const loan of activeLoans) {
    const cid = loan.customerId.toString();
    if (!loanMap[cid]) loanMap[cid] = [];
    loanMap[cid].push(loan);
  }

  const enriched = customers.map(c => ({
    ...c,
    activeLoans: loanMap[c._id.toString()] || [],
  }));

  res.json(enriched);
});

const getCustomersByGroup = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ groupId: req.params.groupId, isDeleted: false }).populate(populateGroup).sort({ name: 1 }).lean();

  const customerIds = customers.map(c => c._id);
  const activeLoans = await Loan.find({ customerId: { $in: customerIds }, status: 'active' }).lean();
  const loanMap = {};
  for (const loan of activeLoans) {
    const cid = loan.customerId.toString();
    if (!loanMap[cid]) loanMap[cid] = [];
    loanMap[cid].push(loan);
  }

  const enriched = customers.map(c => ({
    ...c,
    activeLoans: loanMap[c._id.toString()] || [],
  }));

  res.json(enriched);
});

const createCustomer = asyncHandler(async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const group = await Group.findOne({ _id: parsed.data.groupId, isDeleted: false });
  if (!group) return res.status(400).json({ error: 'Group not found' });

  const existingCustomer = await Customer.findOne({
    phone: parsed.data.phone,
    isDeleted: false,
  });
  if (existingCustomer) {
    return res.status(400).json({ error: 'A customer with this phone number is already registered.' });
  }

  const customer = await Customer.create(parsed.data);
  const populated = await customer.populate(populateGroup);
  res.status(201).json(populated);
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false }).populate(populateGroup);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  // Fetch ALL active loans for this customer, sorted oldest-first
  const activeLoans = await Loan.find({ customerId: customer._id, status: 'active' }).sort({ createdAt: 1 });

  // For each loan, fetch its full payment history
  const loansWithPayments = await Promise.all(
    activeLoans.map(async (loan) => {
      const payments = await Payment.find({ loanId: loan._id }).sort({ paymentDate: 1 });
      return { loan, payments };
    })
  );

  res.json({ customer, activeLoans: loansWithPayments });
});

const updateCustomer = asyncHandler(async (req, res) => {
  if (Object.prototype.hasOwnProperty.call(req.body, 'groupId')) {
    return res.status(400).json({ error: 'Group cannot be changed after creation' });
  }

  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    parsed.data,
    { new: true }
  ).populate(populateGroup);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  res.json(customer);
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const activeLoan = await Loan.exists({ customerId: customer._id, status: 'active' });
  if (activeLoan) return res.status(400).json({ error: 'Cannot delete customer with active loan(s). Close all loans first.' });

  customer.isDeleted = true;
  customer.deletedAt = new Date();
  await customer.save();

  res.json({ message: 'Customer deleted' });
});

const getBinCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({
    isDeleted: true,
    deletedAt: { $gte: thirtyDaysAgo() },
  }).populate(populateGroup).sort({ deletedAt: -1 });

  res.json(customers);
});

const restoreCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, isDeleted: true });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  if (!customer.deletedAt || customer.deletedAt < thirtyDaysAgo()) return res.status(400).json({ error: 'Bin expired' });

  customer.isDeleted = false;
  customer.deletedAt = null;
  await customer.save();

  const populated = await customer.populate(populateGroup);
  res.json(populated);
});

module.exports = {
  getCustomers,
  getCustomersByGroup,
  createCustomer,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getBinCustomers,
  restoreCustomer,
};
