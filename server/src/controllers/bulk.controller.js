const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const Group = require('../models/Group');
const asyncHandler = require('../utils/asyncHandler');
const { calculateFromPrincipal, getPaymentStatus } = require('../utils/loanCalculator');
const { bulkImportSchema } = require('../validators/bulk.validator');

// ─── Helpers ────────────────────────────────────────────────────────────────

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * How many whole days have elapsed from startDate up to and including today.
 * Returns at least 0.
 */
const daysElapsed = (startDate) => {
  const start = startOfDay(startDate);
  const today = startOfDay(new Date());
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

// ─── Controller ─────────────────────────────────────────────────────────────

const bulkImport = asyncHandler(async (req, res) => {
  // ── Step 1: Validate entire array before touching the DB ──────────────────
  const parsed = bulkImportSchema.safeParse(req.body);
  if (!parsed.success) {
    // Map zod errors → per-index failures when possible
    const failures = parsed.error.errors.map((e) => {
      const pathStr = e.path.join('.');
      // path example: "customers.2.loan.startDate"
      const indexMatch = pathStr.match(/^customers\.(\d+)\.(.*)/);
      if (indexMatch) {
        return { index: parseInt(indexMatch[1], 10), field: indexMatch[2], message: e.message };
      }
      return { field: pathStr, message: e.message };
    });
    return res.status(400).json({ error: 'Validation failed', failures });
  }

  const { customers } = parsed.data;

  // ── Step 1b: Resolve & validate all groupIds in one query ─────────────────
  const requestedGroupIds = [...new Set(customers.map((c) => c.groupId))];
  const existingGroups = await Group.find({
    _id: { $in: requestedGroupIds },
    isDeleted: false,
  }).lean();

  const groupMap = {}; // groupId string → group doc
  for (const g of existingGroups) {
    groupMap[g._id.toString()] = g;
  }

  const missingGroups = requestedGroupIds.filter((id) => !groupMap[id]);
  if (missingGroups.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      failures: missingGroups.map((id) => ({
        field: 'groupId',
        message: `Group ${id} does not exist or has been deleted`,
      })),
    });
  }

  // ── Step 1c: Check for duplicate phones within the import batch itself ─────
  const batchPhones = customers.map((c) => c.phone);
  const batchDupeSet = new Set();
  const batchDupeFailures = [];
  batchPhones.forEach((phone, index) => {
    if (batchDupeSet.has(phone)) {
      batchDupeFailures.push({ index, field: 'phone', message: `Phone ${phone} appears more than once in this import batch` });
    }
    batchDupeSet.add(phone);
  });
  if (batchDupeFailures.length > 0) {
    return res.status(400).json({ error: 'Validation failed', failures: batchDupeFailures });
  }

  // ── Step 2: Check for existing customers (phone + groupId) ────────────────
  const existingCustomers = await Customer.find({
    phone: { $in: batchPhones },
    isDeleted: false,
  }).lean();

  // Map: "phone::groupId" → existing customer doc
  const existingCustomerMap = {};
  for (const c of existingCustomers) {
    existingCustomerMap[`${c.phone}::${c.groupId.toString()}`] = c;
  }

  const skippedDuplicates = [];
  const toProcess = [];       // { originalIndex, customer } — new customers to create
  const loanOnlyEntries = []; // { originalIndex, customer, existingCustomer } — add loan to existing

  customers.forEach((customer, index) => {
    const key = `${customer.phone}::${customer.groupId}`;
    const existing = existingCustomerMap[key];

    if (existing) {
      if (customer.loan) {
        // Existing customer + loan provided → just create the loan for them
        loanOnlyEntries.push({ originalIndex: index, customer, existingCustomer: existing });
      } else {
        // Existing customer + no loan → nothing to do, skip
        skippedDuplicates.push({
          index,
          phone: customer.phone,
          reason: 'Customer already exists in this group and no loan was provided',
        });
      }
    } else {
      toProcess.push({ originalIndex: index, customer });
    }
  });

  // If nothing new to create at all, return early
  if (toProcess.length === 0 && loanOnlyEntries.length === 0) {
    return res.json({
      message: 'Import complete — all entries were duplicates with no new loans',
      created: { customers: 0, loans: 0, openingBalanceEntries: 0 },
      skipped: { noLoan: 0, duplicates: skippedDuplicates },
      loansAddedToExistingCustomers: 0,
    });
  }

  // ── Step 3: Group customers-with-loans by groupId for loan counter allocation ─
  // Separate: customers with manual loan numbers vs. those needing auto-assigned numbers
  const groupLoanCounts = {}; // groupId → count of customers needing AUTO numbers
  const groupManualNumbers = {}; // groupId → [manual numbers] (for loanCounter bump)

  for (const { customer } of toProcess) {
    if (!customer.loan) continue;
    const gid = customer.groupId;

    if (customer.loan.number !== undefined) {
      // Manual number from physical ledger
      if (!groupManualNumbers[gid]) groupManualNumbers[gid] = [];
      groupManualNumbers[gid].push(customer.loan.number);
    } else {
      // Needs auto-assigned number
      groupLoanCounts[gid] = (groupLoanCounts[gid] || 0) + 1;
    }
  }

  // ── Step 4: Atomically allocate loan counters per group ───────────────────
  // groupId → starting loan number for auto-assigned customers in that group
  const groupAutoStartNumber = {};

  // For groups with auto-assign loans: increment counter by count
  const autoGroupIds = Object.keys(groupLoanCounts);
  for (const gid of autoGroupIds) {
    const count = groupLoanCounts[gid];
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: gid, isDeleted: false, loanCounter: { $lte: 500 - count } },
      { $inc: { loanCounter: count } },
      { new: true }
    );
    if (!updatedGroup) {
      return res.status(400).json({
        error: `Loan number limit reached for group "${groupMap[gid].name}". Cannot assign ${count} more loan numbers.`,
      });
    }
    // Numbers assigned: (newCounter - count + 1) … newCounter
    groupAutoStartNumber[gid] = updatedGroup.loanCounter - count + 1;
  }

  // For groups with ONLY manual loan numbers: ensure loanCounter >= max manual number
  const manualOnlyGroupIds = Object.keys(groupManualNumbers).filter((gid) => !groupLoanCounts[gid]);
  for (const gid of manualOnlyGroupIds) {
    const maxManual = Math.max(...groupManualNumbers[gid]);
    // Update loanCounter to max(current, maxManual) so future auto-assigns don't collide
    await Group.updateOne(
      { _id: gid, loanCounter: { $lt: maxManual } },
      { $set: { loanCounter: maxManual } }
    );
  }

  // For groups with BOTH manual and auto-assign: auto-assign starts AFTER max manual number
  // We already incremented by `count` above; but we also need to ensure we don't collide
  // with manual numbers. Re-check: if the auto-start range overlaps a manual number, fail.
  for (const gid of autoGroupIds) {
    const manuals = groupManualNumbers[gid] || [];
    if (manuals.length === 0) continue;
    const autoStart = groupAutoStartNumber[gid];
    const autoEnd = autoStart + groupLoanCounts[gid] - 1;
    const conflict = manuals.find((n) => n >= autoStart && n <= autoEnd);
    if (conflict) {
      return res.status(400).json({
        error: `Loan number conflict in group "${groupMap[gid].name}": manual number ${conflict} collides with auto-assigned range ${autoStart}–${autoEnd}. Adjust manual numbers or re-order the import.`,
      });
    }
  }

  // ── Step 5–8: Run inside a MongoDB transaction ────────────────────────────
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      // ── 5: Build & insert customer documents ─────────────────────────────
      const customerDocs = toProcess.map(({ customer }) => ({
        name: customer.name,
        phone: customer.phone,
        groupId: customer.groupId,
      }));

      const insertedCustomers = await Customer.insertMany(customerDocs, { session });

      // ── 6: Build & insert loan documents ─────────────────────────────────
      const today = startOfDay(new Date());
      const loanDocs = [];
      const paymentDocs = [];

      // Pointer per group for auto-assign
      const groupAutoPointer = { ...groupAutoStartNumber };

      let loansCreated = 0;
      let noLoanCount = 0;
      let openingEntriesCreated = 0;

      for (let i = 0; i < toProcess.length; i++) {
        const { customer } = toProcess[i];
        const insertedCustomer = insertedCustomers[i];

        if (!customer.loan) {
          noLoanCount++;
          continue;
        }

        const { loan } = customer;
        const gid = customer.groupId;

        // Resolve loan number
        let loanNumber;
        if (loan.number !== undefined) {
          loanNumber = loan.number;
        } else {
          loanNumber = groupAutoPointer[gid];
          groupAutoPointer[gid]++;
        }

        // Resolve daily amount
        const interestRate = loan.interestRate ?? 12;
        let dailyAmount;
        let principalAmount = null;

        if (loan.mode === 'daily') {
          dailyAmount = loan.dailyAmount;
        } else {
          principalAmount = loan.principalAmount;
          dailyAmount = calculateFromPrincipal(principalAmount, interestRate, loan.totalDays).dailyAmount;
        }

        const loanDoc = {
          loanNumber,
          groupId: gid,
          customerId: insertedCustomer._id,
          principalAmount,
          interestRate: loan.mode === 'principal' ? interestRate : 12,
          totalDays: loan.totalDays,
          dailyAmount,
          startDate: loan.startDate,
          createdBy: req.user._id,
          status: 'active',
        };
        loanDocs.push({ loanDoc, loan, insertedCustomer });
        loansCreated++;
      }

      // ── Process loans for EXISTING customers (loanOnlyEntries) ───────────
      for (const { customer, existingCustomer } of loanOnlyEntries) {
        const { loan } = customer;
        const gid = customer.groupId;

        let loanNumber;
        if (loan.number !== undefined) {
          loanNumber = loan.number;
        } else {
          loanNumber = groupAutoPointer[gid];
          groupAutoPointer[gid]++;
        }

        const interestRate = loan.interestRate ?? 12;
        let dailyAmount;
        let principalAmount = null;

        if (loan.mode === 'daily') {
          dailyAmount = loan.dailyAmount;
        } else {
          principalAmount = loan.principalAmount;
          dailyAmount = calculateFromPrincipal(principalAmount, interestRate, loan.totalDays).dailyAmount;
        }

        const loanDoc = {
          loanNumber,
          groupId: gid,
          customerId: existingCustomer._id,
          principalAmount,
          interestRate: loan.mode === 'principal' ? interestRate : 12,
          totalDays: loan.totalDays,
          dailyAmount,
          startDate: loan.startDate,
          createdBy: req.user._id,
          status: 'active',
        };
        loanDocs.push({ loanDoc, loan, insertedCustomer: existingCustomer });
        loansCreated++;
      }

      // Insert all loans (new customers + existing customers)
      const rawLoanDocs = loanDocs.map((l) => l.loanDoc);
      let insertedLoans = [];
      if (rawLoanDocs.length > 0) {
        insertedLoans = await Loan.insertMany(rawLoanDocs, { session });
      }

      // ── 7: Build opening balance payment entries ──────────────────────────
      for (let i = 0; i < loanDocs.length; i++) {
        const { loan, insertedCustomer } = loanDocs[i];
        const insertedLoan = insertedLoans[i];

        const elapsed = daysElapsed(loan.startDate);
        const expectedAmount = parseFloat((elapsed * insertedLoan.dailyAmount).toFixed(2));
        const pendingBalance = loan.openingPendingBalance;
        const paidAmount = parseFloat(Math.max(0, expectedAmount - pendingBalance).toFixed(2));
        const status = getPaymentStatus(paidAmount, expectedAmount);

        paymentDocs.push({
          loanId: insertedLoan._id,
          collectedBy: req.user._id,
          paymentDate: today,
          expectedAmount,
          paidAmount,
          status,
          paymentMode: 'cash',
          extraAmount: paidAmount > expectedAmount ? paidAmount - expectedAmount : 0,
          cumulativePending: pendingBalance,
          isLocked: true,
          isOfflineEntry: false,
        });
        openingEntriesCreated++;
      }

      if (paymentDocs.length > 0) {
        await Payment.insertMany(paymentDocs, { session });
      }

      result = {
        message: 'Import successful',
        created: {
          customers: insertedCustomers.length,
          loans: loansCreated,
          openingBalanceEntries: openingEntriesCreated,
        },
        skipped: {
          noLoan: noLoanCount,
          duplicates: skippedDuplicates,
        },
        loansAddedToExistingCustomers: loanOnlyEntries.length,
      };
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json(result);
});

module.exports = { bulkImport };

