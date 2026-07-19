/**
 * Seed Script — Group C Import
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Hard-deletes all existing customers / loans / payments in Group C
 * 2. Inserts 30 customers with their loans and opening-balance payment entries
 *    (openingPendingBalance = full amount owed, because they paid nothing)
 * 3. Updates the group's loanCounter to 404
 *
 * Run from the /server directory:
 *   node scripts/seed_group_c.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../src/models/Customer');
const Loan     = require('../src/models/Loan');
const Payment  = require('../src/models/Payment');
const Group    = require('../src/models/Group');
const User     = require('../src/models/User');

// ── Config ───────────────────────────────────────────────────────────────────

const GROUP_ID  = new mongoose.Types.ObjectId('6a3f3d226185cb8d6f416a81');
// Reference date: today when the import is run
const TODAY_STR = '2026-07-19';
const TODAY     = new Date(TODAY_STR);
TODAY.setHours(0, 0, 0, 0);

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysElapsed(startDateStr) {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((TODAY - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// Determine payment status
function paymentStatus(paid, expected) {
  if (expected === 0)  return 'paid';
  if (paid <= 0)       return 'skipped';
  if (paid >= expected) return 'paid';
  return 'underpaid';
}

// ── Raw ledger data ───────────────────────────────────────────────────────────
//
//  phone === null  → placeholder will be auto-assigned
//  TAILOR - BAPITA (8657510775) has 3 loans → same customer, 3 loan records
//
const LEDGER = [
  { loanNo: 356, name: 'POST - PARAWA',          daily: 500,  totalDays: 50, start: '2026-04-15', phone: '7019376017' },
  { loanNo: 365, name: 'FLOWMAR - AJITHAKUMAR',  daily: 1250, totalDays: 50, start: '2026-04-30', phone: '9619420960' },
  { loanNo: 372, name: 'KATLERI - BABAN',         daily: 100,  totalDays: 50, start: '2026-05-07', phone: '9220249089' },
  { loanNo: 374, name: 'MOB - CHAND',             daily: 400,  totalDays: 50, start: '2026-05-10', phone: '8070524106' },
  { loanNo: 375, name: 'TAILOR - BAPITA',         daily: 250,  totalDays: 50, start: '2026-05-10', phone: '8657510775' },
  { loanNo: 377, name: 'FLOWMAR - AJITKUMAR',    daily: 2500, totalDays: 50, start: '2026-05-15', phone: null },
  { loanNo: 378, name: 'GEETA - PAPPU',           daily: 150,  totalDays: 50, start: '2026-05-17', phone: null },
  { loanNo: 380, name: 'SONU - LATHA',            daily: 150,  totalDays: 50, start: '2026-05-17', phone: null },
  { loanNo: 382, name: 'BAPITA - ANITHA',         daily: 250,  totalDays: 50, start: '2026-05-21', phone: '9326119468' },
  { loanNo: 383, name: 'NARIAL - THATHIR',        daily: 1250, totalDays: 50, start: '2026-05-20', phone: '8169259190' },
  { loanNo: 384, name: 'AJITH - KOTAYAN',         daily: 1250, totalDays: 50, start: '2026-05-21', phone: null },
  { loanNo: 385, name: 'SONU - REKA',             daily: 150,  totalDays: 50, start: '2026-06-04', phone: null },
  // Same customer as L375 — second loan for TAILOR - BAPITA
  { loanNo: 386, name: 'TAILOR - BAPITA',         daily: 250,  totalDays: 50, start: '2026-06-06', phone: '8657510775' },
  { loanNo: 387, name: 'FRUIT - BANSI',           daily: 200,  totalDays: 50, start: '2026-06-05', phone: null },
  { loanNo: 389, name: 'TEA - GANESH',            daily: 300,  totalDays: 50, start: '2026-06-06', phone: null },
  { loanNo: 390, name: 'SONU - KALPANA',          daily: 750,  totalDays: 50, start: '2026-06-07', phone: null },
  { loanNo: 391, name: 'SONU - RANJANA',          daily: 250,  totalDays: 50, start: '2026-06-07', phone: null },
  { loanNo: 392, name: 'NANUBA - KIRANA',         daily: 750,  totalDays: 50, start: '2026-06-10', phone: null },
  { loanNo: 393, name: 'FLOWER - RAMESH',         daily: 300,  totalDays: 50, start: '2026-06-10', phone: null },
  { loanNo: 394, name: 'SAPNA - REKA',            daily: 250,  totalDays: 50, start: '2026-06-12', phone: null },
  { loanNo: 395, name: 'TAILOR - JEYA',           daily: 250,  totalDays: 50, start: '2026-06-13', phone: null },
  { loanNo: 396, name: 'SALOON - SANJAY',         daily: 100,  totalDays: 50, start: '2026-06-19', phone: null },
  { loanNo: 397, name: 'TAILOR NO 2 - JEYA',      daily: 250,  totalDays: 50, start: '2026-06-24', phone: null },
  { loanNo: 398, name: 'TEG - GANSHYAM',          daily: 400,  totalDays: 50, start: '2026-06-24', phone: null },
  { loanNo: 399, name: 'PAPPU - GEETA',           daily: 150,  totalDays: 50, start: '2026-06-24', phone: '8097156144' },
  { loanNo: 400, name: 'AJITH - VIPIN',           daily: 750,  totalDays: 50, start: '2026-06-27', phone: null },
  { loanNo: 401, name: 'TIME - PINTO',            daily: 70,   totalDays: 50, start: '2026-06-28', phone: null },
  { loanNo: 402, name: 'PATWA - DILIP',           daily: 250,  totalDays: 50, start: '2026-06-16', phone: null },
  // Third loan for TAILOR - BAPITA
  { loanNo: 403, name: 'TAILOR - BAPITA',         daily: 250,  totalDays: 50, start: '2026-06-30', phone: '8657510775' },
  { loanNo: 404, name: 'FLOWER - DARMENDAR',      daily: 700,  totalDays: 50, start: '2026-07-10', phone: null },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  MongoDB connected');

  // Need a real user ID for createdBy / collectedBy
  const adminUser = await User.findOne({}).lean();
  if (!adminUser) throw new Error('No users found in DB. Cannot proceed.');
  const userId = adminUser._id;
  console.log(`👤  Using user: ${adminUser.name || adminUser.email || userId}`);

  // ── Step 1: Clean existing data in Group C ────────────────────────────────
  console.log('\n🗑️   Cleaning existing Group C data...');

  const existingCustomers = await Customer.find({ groupId: GROUP_ID }).lean();
  const existingCustomerIds = existingCustomers.map(c => c._id);
  const existingLoans = await Loan.find({ groupId: GROUP_ID }).lean();
  const existingLoanIds = existingLoans.map(l => l._id);

  const pDel = await Payment.deleteMany({ loanId: { $in: existingLoanIds } });
  const lDel = await Loan.deleteMany({ groupId: GROUP_ID });
  const cDel = await Customer.deleteMany({ groupId: GROUP_ID });

  console.log(`   Payments deleted : ${pDel.deletedCount}`);
  console.log(`   Loans deleted    : ${lDel.deletedCount}`);
  console.log(`   Customers deleted: ${cDel.deletedCount}`);

  // ── Step 2: Assign placeholder phones ────────────────────────────────────
  let placeholderCounter = 1;
  const finalLedger = LEDGER.map(entry => ({
    ...entry,
    phone: entry.phone ?? `900000${String(placeholderCounter++).padStart(4, '0')}`,
  }));

  // ── Step 3: Deduplicate customers (same phone = same person) ──────────────
  // Build a map: phone → { name, customerId } to detect duplicates
  const customerByPhone = {};   // phone → mongoose Customer doc
  const customerDocs    = [];

  for (const entry of finalLedger) {
    if (!customerByPhone[entry.phone]) {
      // New unique customer
      customerByPhone[entry.phone] = null; // placeholder until inserted
      customerDocs.push({
        name:    entry.name,
        phone:   entry.phone,
        groupId: GROUP_ID,
      });
    }
  }

  // ── Step 4: Insert customers ──────────────────────────────────────────────
  console.log(`\n👥  Inserting ${customerDocs.length} unique customers...`);
  const insertedCustomers = await Customer.insertMany(customerDocs);

  // Map phone → inserted customer _id
  const phoneToCustomerId = {};
  for (const cust of insertedCustomers) {
    phoneToCustomerId[cust.phone] = cust._id;
  }

  // ── Step 5: Build and insert loans + payments ─────────────────────────────
  console.log('💳  Creating loans and opening-balance payment entries...');

  const loanDocs    = [];
  const paymentMeta = []; // parallel array for payment building after loan insert

  for (const entry of finalLedger) {
    const customerId = phoneToCustomerId[entry.phone];
    const elapsed    = daysElapsed(entry.start);
    // Cap at totalDays: they can't owe more than the full loan amount
    const effectiveDays  = Math.min(elapsed, entry.totalDays);
    const pendingBalance = effectiveDays * entry.daily; // paid nothing → full balance pending

    loanDocs.push({
      loanNumber:    entry.loanNo,
      groupId:       GROUP_ID,
      customerId,
      principalAmount: null,
      interestRate:  12,
      totalDays:     entry.totalDays,
      dailyAmount:   entry.daily,
      startDate:     new Date(entry.start),
      createdBy:     userId,
      status:        'active',
    });

    paymentMeta.push({
      effectiveDays,
      dailyAmount:    entry.daily,
      pendingBalance,
      startDate:      entry.start,
    });
  }

  const insertedLoans = await Loan.insertMany(loanDocs);
  console.log(`   Loans created: ${insertedLoans.length}`);

  // ── Step 6: Build opening-balance payment entries ─────────────────────────
  const paymentDocs = [];

  for (let i = 0; i < insertedLoans.length; i++) {
    const loan = insertedLoans[i];
    const meta = paymentMeta[i];

    const expectedAmount = meta.effectiveDays * meta.dailyAmount;
    const paidAmount     = 0; // received none
    const status         = meta.effectiveDays === 0 ? 'paid' : 'skipped';

    paymentDocs.push({
      loanId:           loan._id,
      collectedBy:      userId,
      paymentDate:      TODAY,
      expectedAmount,
      paidAmount,
      status,
      paymentMode:      'cash',
      extraAmount:      0,
      cumulativePending: meta.pendingBalance,
      isLocked:         true,   // opening balance — cannot be edited
      isOfflineEntry:   false,
    });
  }

  const insertedPayments = await Payment.insertMany(paymentDocs);
  console.log(`   Opening-balance entries created: ${insertedPayments.length}`);

  // ── Step 7: Update group loanCounter to max loan number (404) ────────────
  await Group.updateOne(
    { _id: GROUP_ID },
    { $max: { loanCounter: 404 } }
  );
  console.log('   Group loanCounter updated to ≥ 404');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('✅  Import complete!');
  console.log(`   Unique customers : ${insertedCustomers.length}`);
  console.log(`   Total loans      : ${insertedLoans.length}`);
  console.log(`   Payment entries  : ${insertedPayments.length}`);

  // Pretty-print each loan for verification
  console.log('\n── Loan summary ────────────────────────────────────');
  for (let i = 0; i < insertedLoans.length; i++) {
    const l = insertedLoans[i];
    const m = paymentMeta[i];
    console.log(
      `  L#${String(l.loanNumber).padStart(3,'0')}  ${LEDGER[i].name.padEnd(25)}` +
      `  ₹${String(l.dailyAmount).padStart(5)}/day` +
      `  elapsed=${m.effectiveDays} days` +
      `  pending=₹${m.pendingBalance.toLocaleString()}`
    );
  }

  await mongoose.disconnect();
  console.log('\n👋  Disconnected. Done.');
}

main().catch(err => {
  console.error('❌  Script failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
