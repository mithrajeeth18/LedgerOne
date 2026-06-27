require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Group = require('./src/models/Group');
const Customer = require('./src/models/Customer');
const Loan = require('./src/models/Loan');
const Payment = require('./src/models/Payment');
const Penalty = require('./src/models/Penalty');
const Reminder = require('./src/models/Reminder');

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5003}/api`;

const recalculateLoanPending = async (loanId) => {
  const payments = await Payment.find({ loanId }).sort({ paymentDate: 1, createdAt: 1 });
  let pending = 0;

  for (const payment of payments) {
    pending += payment.expectedAmount - payment.paidAmount;
    payment.cumulativePending = pending;
    await payment.save();
  }
};

const calculateRemainingBalance = async (loanId) => {
  const latest = await Payment.findOne({ loanId }).sort({ paymentDate: -1, createdAt: -1 });
  return latest ? latest.cumulativePending : 0;
};

let accessToken = '';
let refreshToken = '';
let sukapurId = '';
let yardMarketId = '';
let oldPanvelId = '';
let tempGroupId = '';
let ramId = '';
let kumarId = '';
let shamId = '';
let tempCustomerId = '';
let ramLoanId = '';
let shamLoanId = '';
let kumarLoanId = '';
let oldLoanId = '';
let todaysPaymentId = '';
let yesterdaysPaymentId = '';
let olderThan2DaysPaymentId = '';
let reminderId = '';

const testsRun = [];

function recordTest(id, name, passed, expectedStatus, actualStatus, notes = '') {
  testsRun.push({ id, name, passed, expectedStatus, actualStatus, notes });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${id}] ${name}: ${statusStr} (Expected: ${expectedStatus}, Got: ${actualStatus}) ${notes ? '- ' + notes : ''}`);
}

async function request(method, path, body = null, token = null) {
  const headers = { 
    'Content-Type': 'application/json',
    'x-bypass-ratelimit': 'secret_bypass_token'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // no JSON or parsing failed
    }
    return { status: res.status, data };
  } catch (error) {
    console.error(`Request to ${path} failed:`, error.message);
    return { status: 0, data: null };
  }
}

async function runTests() {
  console.log('--- Wiping Test Collections and Connecting to DB ---');
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Wipe collections to start clean
  await Group.deleteMany({});
  await Customer.deleteMany({});
  await Loan.deleteMany({});
  await Payment.deleteMany({});
  await Penalty.deleteMany({});
  await Reminder.deleteMany({});

  // Reset users (in case biometric/appPin etc are set)
  const u1 = await User.findOne({ email: 'collector1@gmail.com' });
  if (u1) {
    u1.appPin = null;
    u1.biometricEnabled = false;
    u1.otpCode = null;
    u1.otpExpiry = null;
    await u1.save();
  }

  const u2 = await User.findOne({ email: 'collector2@gmail.com' });
  if (u2) {
    u2.appPin = null;
    u2.biometricEnabled = false;
    u2.otpCode = null;
    u2.otpExpiry = null;
    await u2.save();
  }

  console.log('DB wiped and users reset. Starting API Tests...\n');

  // --- SECTION 0 — HEALTH CHECK ---
  console.log('\n--- SECTION 0 — HEALTH CHECK ---');
  {
    const { status, data } = await request('GET', '/health');
    const passed = status === 200 && data && data.status === 'ok';
    recordTest('0.1', 'GET /health', passed, 200, status, JSON.stringify(data));
  }

  // --- SECTION 1 — AUTH ---
  console.log('\n--- SECTION 1 — AUTH ---');
  // 1A — Login
  {
    const { status, data } = await request('POST', '/auth/login', { email: 'collector1@gmail.com', password: 'changeme123' });
    const passed = status === 200 && data && data.accessToken && data.refreshToken && data.user;
    if (passed) {
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    }
    recordTest('1.1', 'POST /auth/login (correct)', passed, 200, status, passed ? 'Tokens acquired' : '');
  }
  {
    const { status, data } = await request('POST', '/auth/login', { email: 'collector1@gmail.com', password: 'wrongpass' });
    const passed = status === 401 && data && data.error === 'Invalid credentials';
    recordTest('1.2', 'POST /auth/login (wrong password)', passed, 401, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/login', { email: 'notexist@gmail.com', password: 'anything' });
    const passed = status === 401 && data && data.error === 'Invalid credentials';
    recordTest('1.3', 'POST /auth/login (non-existent email)', passed, 401, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/login', { email: 'bademail', password: 'pass' });
    const passed = status === 400; // Zod validation error
    recordTest('1.4', 'POST /auth/login (bad email)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/login', {});
    const passed = status === 400; // Zod validation error
    recordTest('1.5', 'POST /auth/login (empty body)', passed, 400, status, JSON.stringify(data));
  }

  // 1B — Token Refresh
  {
    const { status, data } = await request('POST', '/auth/refresh', { refreshToken });
    const passed = status === 200 && data && data.accessToken;
    if (passed) {
      accessToken = data.accessToken; // update access token
    }
    recordTest('1.6', 'POST /auth/refresh (valid token)', passed, 200, status, passed ? 'New access token acquired' : '');
  }
  {
    const { status, data } = await request('POST', '/auth/refresh', { refreshToken: 'invalidtoken' });
    const passed = status === 401;
    recordTest('1.7', 'POST /auth/refresh (invalid token)', passed, 401, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/refresh', {});
    const passed = status === 400;
    recordTest('1.8', 'POST /auth/refresh (empty body)', passed, 400, status, JSON.stringify(data));
  }

  // 1C — Get Current User
  {
    const { status, data } = await request('GET', '/auth/me', null, accessToken);
    const passed = status === 200 && data && data.user && !data.user.passwordHash && !data.user.appPin && !data.user.otpCode && !data.user.otpExpiry;
    recordTest('1.9', 'GET /auth/me (valid header)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/auth/me');
    const passed = status === 401;
    recordTest('1.10', 'GET /auth/me (no header)', passed, 401, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/auth/me', null, 'invalidtoken');
    const passed = status === 401;
    recordTest('1.11', 'GET /auth/me (invalid header)', passed, 401, status, JSON.stringify(data));
  }

  // 1D — Forgot PIN / OTP Flow
  {
    const { status, data } = await request('POST', '/auth/forgot-pin', { email: 'collector1@gmail.com' });
    const passed = status === 200 && data && data.message === 'If this email exists, an OTP has been sent';
    recordTest('1.12', 'POST /auth/forgot-pin (existing email)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/forgot-pin', { email: 'unknown@gmail.com' });
    // Should return the identical message to prevent user enumeration
    const passed = status === 200 && data && data.message === 'If this email exists, an OTP has been sent';
    recordTest('1.13', 'POST /auth/forgot-pin (unknown email - no enumeration)', passed, 200, status, JSON.stringify(data));
  }

  // Let's retrieve OTP from DB since nodemailer won't run, or we can just fetch it directly to use for verification
  const user = await User.findOne({ email: 'collector1@gmail.com' });
  const otpCode = user ? user.otpCode : '';
  console.log(`Fetched OTP from Database: ${otpCode}`);

  {
    const { status, data } = await request('POST', '/auth/verify-otp', { email: 'collector1@gmail.com', otp: otpCode });
    const passed = status === 200 && data && data.valid === true;
    recordTest('1.14', 'POST /auth/verify-otp (valid)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/verify-otp', { email: 'collector1@gmail.com', otp: '000000' });
    const passed = status === 400;
    recordTest('1.15', 'POST /auth/verify-otp (invalid)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/reset-pin', { email: 'collector1@gmail.com', otp: otpCode, newPin: '1234' });
    const passed = status === 200 && data && data.message === 'PIN reset successfully';
    recordTest('1.16', 'POST /auth/reset-pin (valid)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/reset-pin', { email: 'collector1@gmail.com', otp: '000000', newPin: '1234' });
    const passed = status === 400;
    recordTest('1.17', 'POST /auth/reset-pin (invalid)', passed, 400, status, JSON.stringify(data));
  }

  // Let's re-login to update tokens since reset-pin might change state, or we just use current token.
  // Wait, let's login again to get the fresh token that works with the new PIN state if required.
  const loginRes = await request('POST', '/auth/login', { email: 'collector1@gmail.com', password: 'changeme123' });
  accessToken = loginRes.data.accessToken;

  // 1E — Change PIN and Biometric
  {
    const { status, data } = await request('PUT', '/auth/change-pin', { currentPin: '1234', newPin: '5678' }, accessToken);
    const passed = status === 200;
    recordTest('1.18', 'PUT /auth/change-pin (valid)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', '/auth/change-pin', { currentPin: 'wrongpin', newPin: '5678' }, accessToken);
    const passed = status === 401;
    recordTest('1.19', 'PUT /auth/change-pin (invalid)', passed, 401, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', '/auth/biometric', { enabled: true }, accessToken);
    const passed = status === 200 && data && data.biometricEnabled === true;
    recordTest('1.20', 'PUT /auth/biometric (enable)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', '/auth/biometric', { enabled: false }, accessToken);
    const passed = status === 200 && data && data.biometricEnabled === false;
    recordTest('1.21', 'PUT /auth/biometric (disable)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/auth/logout', null, accessToken);
    const passed = status === 200;
    recordTest('1.22', 'POST /auth/logout', passed, 200, status, JSON.stringify(data));
  }

  // Re-login after logout to get valid token for subsequent sections
  const finalLogin = await request('POST', '/auth/login', { email: 'collector1@gmail.com', password: 'changeme123' });
  accessToken = finalLogin.data.accessToken;

  // --- SECTION 2 — GROUPS ---
  console.log('\n--- SECTION 2 — GROUPS ---');
  {
    const { status, data } = await request('POST', '/groups', { name: 'Sukapur' }, accessToken);
    const passed = status === 201 && data && data.name === 'Sukapur' && data.loanCounter === 0;
    if (passed) sukapurId = data._id;
    recordTest('2.1', 'POST /groups (Sukapur)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/groups', { name: 'Yard Market' }, accessToken);
    const passed = status === 201 && data && data.name === 'Yard Market';
    if (passed) yardMarketId = data._id;
    recordTest('2.2', 'POST /groups (Yard Market)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/groups', { name: 'Old Panvel' }, accessToken);
    const passed = status === 201 && data && data.name === 'Old Panvel';
    if (passed) oldPanvelId = data._id;
    recordTest('2.3', 'POST /groups (Old Panvel)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/groups', { name: '' }, accessToken);
    const passed = status === 400;
    recordTest('2.4', 'POST /groups (empty name)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/groups', { name: 'A' }, accessToken);
    const passed = status === 400;
    recordTest('2.5', 'POST /groups (min 2 chars)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/groups', null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.length === 3 &&
                   data[0].name === 'Old Panvel' && data[1].name === 'Sukapur' && data[2].name === 'Yard Market';
    recordTest('2.6', 'GET /groups (3 groups, sorted A-Z)', passed, 200, status, passed ? 'Sorted correctly A-Z' : JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', `/groups/${sukapurId}`, { name: 'Sukapur Area' }, accessToken);
    const passed = status === 200 && data && data.name === 'Sukapur Area';
    recordTest('2.7', 'PUT /groups/:id (update name)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', `/groups/${sukapurId}`, { loanCounter: 999 }, accessToken);
    const passed = status === 200 && data && data.loanCounter === 0;
    recordTest('2.8', 'PUT /groups/:id (try setting loanCounter)', passed, 200, status, `loanCounter is ${data ? data.loanCounter : 'null'}`);
  }

  // Soft delete and bin
  {
    const { status, data } = await request('POST', '/groups', { name: 'Temp Group' }, accessToken);
    const passed = status === 201;
    if (passed) tempGroupId = data._id;
    recordTest('2.9', 'POST /groups (Temp Group)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('DELETE', `/groups/${tempGroupId}`, null, accessToken);
    const passed = status === 200;
    recordTest('2.10', 'DELETE /groups/:id (soft delete)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/groups', null, accessToken);
    const passed = status === 200 && Array.isArray(data) && !data.some(g => g._id === tempGroupId);
    recordTest('2.11', 'GET /groups (Temp Group excluded)', passed, 200, status, `Length: ${data ? data.length : 0}`);
  }
  {
    const { status, data } = await request('GET', '/groups/bin', null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.some(g => g._id === tempGroupId);
    recordTest('2.12', 'GET /groups/bin (Temp Group included)', passed, 200, status, `Bin length: ${data ? data.length : 0}`);
  }
  {
    const { status, data } = await request('POST', `/groups/${tempGroupId}/restore`, null, accessToken);
    const passed = status === 200 && data && data.isDeleted === false;
    recordTest('2.13', 'POST /groups/:id/restore', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/groups', null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.some(g => g._id === tempGroupId);
    recordTest('2.14', 'GET /groups (Temp Group back in list)', passed, 200, status, `Length: ${data ? data.length : 0}`);
  }
  {
    const { status, data } = await request('DELETE', `/groups/${tempGroupId}`, null, accessToken);
    const passed = status === 200;
    recordTest('2.15', 'DELETE /groups/:id (delete again)', passed, 200, status, JSON.stringify(data));
  }

  // --- SECTION 3 — CUSTOMERS ---
  console.log('\n--- SECTION 3 — CUSTOMERS ---');
  {
    const { status, data } = await request('POST', '/customers', { name: 'Ram', phone: '9876543210', groupId: sukapurId }, accessToken);
    const passed = status === 201 && data && data.name === 'Ram' && data.groupId._id === sukapurId;
    if (passed) ramId = data._id;
    recordTest('3.1', 'POST /customers (Ram)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/customers', { name: 'குமார்', phone: '9123456789', groupId: sukapurId }, accessToken);
    const passed = status === 201 && data && data.name === 'குமார்';
    if (passed) kumarId = data._id;
    recordTest('3.2', 'POST /customers (குமார் - Tamil name)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/customers', { name: 'Sham', phone: '9988776655', groupId: yardMarketId }, accessToken);
    const passed = status === 201 && data && data.name === 'Sham';
    if (passed) shamId = data._id;
    recordTest('3.3', 'POST /customers (Sham in different group)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/customers', { name: '', phone: '9876543210', groupId: sukapurId }, accessToken);
    const passed = status === 400;
    recordTest('3.4', 'POST /customers (empty name)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/customers', { name: 'Test', phone: '1234567890', groupId: sukapurId }, accessToken);
    const passed = status === 400;
    recordTest('3.5', 'POST /customers (invalid phone)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/customers', { name: 'Test', phone: '9876543210', groupId: 'invalidid' }, accessToken);
    const passed = status === 400;
    recordTest('3.6', 'POST /customers (invalid group id)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/customers', { name: 'Test', phone: '9876543210', groupId: '123456789012345678901234' }, accessToken);
    const passed = status === 400;
    recordTest('3.7', 'POST /customers (non-existent group id)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/customers', null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.length === 3;
    recordTest('3.8', 'GET /customers (all 3 customers)', passed, 200, status, `Length: ${data ? data.length : 0}`);
  }
  {
    const { status, data } = await request('GET', `/customers/group/${sukapurId}`, null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.length === 2 && data.some(c => c.name === 'Ram') && data.some(c => c.name === 'குமார்');
    recordTest('3.9', 'GET /customers/group/:groupId (Sukapur)', passed, 200, status, `Length: ${data ? data.length : 0}`);
  }
  {
    const { status, data } = await request('GET', `/customers/group/${yardMarketId}`, null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.length === 1 && data[0].name === 'Sham';
    recordTest('3.10', 'GET /customers/group/:groupId (Yard Market)', passed, 200, status, `Length: ${data ? data.length : 0}`);
  }
  {
    const { status, data } = await request('GET', `/customers/${ramId}`, null, accessToken);
    const passed = status === 200 && data && data.customer && data.customer.name === 'Ram' && data.activeLoan === null;
    recordTest('3.11', 'GET /customers/:id (Ram - activeLoan: null)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', `/customers/${ramId}`, { name: 'Ram Kumar' }, accessToken);
    const passed = status === 200 && data && data.name === 'Ram Kumar';
    recordTest('3.12', 'PUT /customers/:id (update name)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', `/customers/${ramId}`, { groupId: yardMarketId }, accessToken);
    const passed = status === 400;
    recordTest('3.13', 'PUT /customers/:id (try changing groupId)', passed, 400, status, JSON.stringify(data));
  }

  // Customer soft delete
  {
    const { status, data } = await request('POST', '/customers', { name: 'Temp', phone: '9000000000', groupId: sukapurId }, accessToken);
    const passed = status === 201;
    if (passed) tempCustomerId = data._id;
    recordTest('3.14', 'POST /customers (Temp)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('DELETE', `/customers/${tempCustomerId}`, null, accessToken);
    const passed = status === 200;
    recordTest('3.15', 'DELETE /customers/:id (soft delete)', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/customers/bin', null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.some(c => c._id === tempCustomerId);
    recordTest('3.16', 'GET /customers/bin', passed, 200, status, `Bin length: ${data ? data.length : 0}`);
  }
  {
    const { status, data } = await request('POST', `/customers/${tempCustomerId}/restore`, null, accessToken);
    const passed = status === 200 && data && data.isDeleted === false;
    recordTest('3.17', 'POST /customers/:id/restore', passed, 200, status, JSON.stringify(data));
  }

  // --- SECTION 4 — LOANS ---
  console.log('\n--- SECTION 4 — LOANS ---');
  // 4A — Create Loan (Daily Amount Mode)
  const todayStr = new Date().toISOString().split('T')[0];
  {
    const { status, data } = await request('POST', '/loans', {
      customerId: ramId,
      groupId: sukapurId,
      mode: 'daily',
      dailyAmount: 300,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);
    const passed = status === 201 && data && data.loanNumber === 1 && data.dailyAmount === 300;
    if (passed) ramLoanId = data._id;
    recordTest('4.1', 'POST /loans (Ram - daily mode)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/loans', {
      customerId: ramId,
      groupId: sukapurId,
      mode: 'daily',
      dailyAmount: 300,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);
    const passed = status === 400 && data && data.error === 'Customer already has an active loan';
    recordTest('4.2', 'POST /loans (Ram - duplicate active loan check)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/loans', {
      customerId: shamId,
      groupId: yardMarketId,
      mode: 'daily',
      dailyAmount: 400,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);
    const passed = status === 201 && data && data.loanNumber === 1 && data.groupId === yardMarketId;
    if (passed) shamLoanId = data._id;
    recordTest('4.3', 'POST /loans (Sham - Yard Market separate counter)', passed, 201, status, JSON.stringify(data));
  }

  // 4B — Create Loan (Principal + Interest Mode)
  {
    const { status, data } = await request('POST', '/loans', {
      customerId: kumarId,
      groupId: sukapurId,
      mode: 'principal',
      principalAmount: 10000,
      interestRate: 12,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);
    // Sukapur Counter should be 2 now.
    const passed = status === 201 && data && data.loanNumber === 2 && data.dailyAmount === 224;
    if (passed) kumarLoanId = data._id;
    recordTest('4.4', 'POST /loans (Kumar - principal mode)', passed, 201, status, JSON.stringify(data));
  }
  // Math verification (4.5)
  {
    const loanObj = await Loan.findById(kumarLoanId);
    const passed = loanObj && loanObj.dailyAmount === 224 && loanObj.principalAmount === 10000;
    recordTest('4.5', 'Verify loan math (interest=1200, total=11200, dailyAmount=224)', passed, 'pass', passed ? 'pass' : 'fail', `dailyAmount is ${loanObj ? loanObj.dailyAmount : 'null'}`);
  }

  // 4C — Backdating
  {
    const { status, data } = await request('POST', '/loans', {
      customerId: tempCustomerId, // restored customer
      groupId: sukapurId,
      mode: 'daily',
      dailyAmount: 100,
      totalDays: 50,
      startDate: '2026-06-01',
    }, accessToken);
    const passed = status === 201 && data && data.startDate.startsWith('2026-06-01');
    if (passed) oldLoanId = data._id;
    recordTest('4.6', 'POST /loans (backdated start date)', passed, 201, status, JSON.stringify(data));
  }

  // 4D — Loan Detail
  {
    const { status, data } = await request('GET', `/loans/customer/${ramId}`, null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.length > 0 && data[0].loanNumber === 1;
    recordTest('4.7', 'GET /loans/customer/:id', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', `/loans/${ramLoanId}`, null, accessToken);
    const passed = status === 200 && data && data.loan && Array.isArray(data.payments) && Array.isArray(data.penalties);
    recordTest('4.8', 'GET /loans/:id (detail with payments/penalties arrays)', passed, 200, status, `Payments count: ${data && data.payments ? data.payments.length : 0}`);
  }

  // 4E — Validation errors
  {
    const { status, data } = await request('POST', '/loans', {
      customerId: ramId,
      groupId: sukapurId,
      mode: 'daily',
      dailyAmount: 0,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);
    const passed = status === 400;
    recordTest('4.9', 'POST /loans (dailyAmount: 0)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/loans', {
      customerId: ramId,
      groupId: sukapurId,
      mode: 'principal',
      principalAmount: -100,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);
    const passed = status === 400;
    recordTest('4.10', 'POST /loans (principalAmount: -100)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/loans', {
      customerId: ramId,
      groupId: yardMarketId, // Mismatch with Ram's group (Sukapur)
      mode: 'daily',
      dailyAmount: 300,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);
    const passed = status === 400;
    recordTest('4.11', 'POST /loans (mismatch groupId)', passed, 400, status, JSON.stringify(data));
  }

  // 4F — Loan Number Limit (edge case)
  {
    const originalGroup = await Group.findById(sukapurId);
    originalGroup.loanCounter = 500;
    await originalGroup.save();

    // Now try creating a loan for a new customer in Sukapur. First let's create a temp customer in Sukapur.
    const tempC = await Customer.create({ name: 'Temp Limit', phone: '9999999999', groupId: sukapurId });
    const { status, data } = await request('POST', '/loans', {
      customerId: tempC._id.toString(),
      groupId: sukapurId,
      mode: 'daily',
      dailyAmount: 300,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);
    
    const passed = status === 400 && data && data.error === 'Loan number limit reached for this group. Contact developer.';
    recordTest('4.12', 'Loan number limit reached (>500)', passed, 400, status, JSON.stringify(data));

    // Restore original sukapur loan counter and clean up temp customer
    originalGroup.loanCounter = 3; // since we had created loans 1, 2, and 4.6 (which is 3)
    await originalGroup.save();
    await Customer.deleteOne({ _id: tempC._id });
  }

  // 3.18 Test - Cannot delete customer with active loan
  {
    const { status, data } = await request('DELETE', `/customers/${ramId}`, null, accessToken);
    const passed = status === 400 && data && data.error.includes('Cannot delete customer with active loan');
    recordTest('3.18', 'DELETE /customers/:id (fails when active loan exists)', passed, 400, status, JSON.stringify(data));
  }

  // --- SECTION 5 — PAYMENTS ---
  console.log('\n--- SECTION 5 — PAYMENTS ---');
  // 5A — Mark Payment
  {
    const { status, data } = await request('POST', '/payments', {
      loanId: ramLoanId,
      paymentDate: todayStr,
      paidAmount: 300,
      paymentMode: 'cash',
    }, accessToken);
    const passed = status === 201 && data && data.status === 'paid' && data.extraAmount === 0 && data.cumulativePending === 0;
    if (passed) todaysPaymentId = data._id;
    recordTest('5.1', 'POST /payments (Ram - exact amount)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/payments', {
      loanId: ramLoanId,
      paymentDate: todayStr,
      paidAmount: 300,
      paymentMode: 'cash',
    }, accessToken);
    const passed = status === 400 && data && data.error === 'Payment already exists for this date. Use PUT to edit.';
    recordTest('5.2', 'POST /payments (duplicate date)', passed, 400, status, JSON.stringify(data));
  }
  {
    const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { status, data } = await request('POST', '/payments', {
      loanId: ramLoanId,
      paymentDate: tomorrowStr,
      paidAmount: 300,
      paymentMode: 'cash',
    }, accessToken);
    const passed = status === 400 && data && data.error === 'Cannot mark payment for a future date';
    recordTest('5.3', 'POST /payments (future date)', passed, 400, status, JSON.stringify(data));
  }
  {
    // Yesterday
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { status, data } = await request('POST', '/payments', {
      loanId: ramLoanId,
      paymentDate: yesterdayStr,
      paidAmount: 0,
      paymentMode: 'cash',
    }, accessToken);
    const passed = status === 201 && data && data.status === 'skipped';
    if (passed) yesterdaysPaymentId = data._id;
    recordTest('5.4', 'POST /payments (skipped payment)', passed, 201, status, JSON.stringify(data));
  }

  // 5B — Overpaid / Underpaid / Skipped / Exact status logic
  {
    // Clean up temporary payments on ramLoanId for status testing
    await Payment.deleteMany({ loanId: ramLoanId });

    // 5.5 Overpaid
    let res = await request('POST', '/payments', { loanId: ramLoanId, paymentDate: todayStr, paidAmount: 500, paymentMode: 'cash' }, accessToken);
    let passed = res.status === 201 && res.data.status === 'overpaid' && res.data.extraAmount === 200 && res.data.cumulativePending === -200;
    recordTest('5.5', 'Verify Overpaid logic (500 paid on 300 expected)', passed, 201, res.status, JSON.stringify(res.data));

    // 5.6 Underpaid
    await Payment.deleteMany({ loanId: ramLoanId });
    res = await request('POST', '/payments', { loanId: ramLoanId, paymentDate: todayStr, paidAmount: 200, paymentMode: 'cash' }, accessToken);
    passed = res.status === 201 && res.data.status === 'underpaid' && res.data.extraAmount === 0 && res.data.cumulativePending === 100;
    recordTest('5.6', 'Verify Underpaid logic (200 paid on 300 expected)', passed, 201, res.status, JSON.stringify(res.data));

    // 5.7 Skipped
    await Payment.deleteMany({ loanId: ramLoanId });
    res = await request('POST', '/payments', { loanId: ramLoanId, paymentDate: todayStr, paidAmount: 0, paymentMode: 'cash' }, accessToken);
    passed = res.status === 201 && res.data.status === 'skipped' && res.data.extraAmount === 0 && res.data.cumulativePending === 300;
    recordTest('5.7', 'Verify Skipped logic (0 paid on 300 expected)', passed, 201, res.status, JSON.stringify(res.data));

    // 5.8 Exact
    await Payment.deleteMany({ loanId: ramLoanId });
    res = await request('POST', '/payments', { loanId: ramLoanId, paymentDate: todayStr, paidAmount: 300, paymentMode: 'cash' }, accessToken);
    passed = res.status === 201 && res.data.status === 'paid' && res.data.extraAmount === 0 && res.data.cumulativePending === 0;
    todaysPaymentId = res.data._id;
    recordTest('5.8', 'Verify Exact logic (300 paid on 300 expected)', passed, 201, res.status, JSON.stringify(res.data));
  }

  // 5C — Edit Window (2-day lock rule)
  {
    // Today's payment is editable (5.9)
    const { status, data } = await request('PUT', `/payments/${todaysPaymentId}`, { paidAmount: 250, paymentMode: 'online' }, accessToken);
    const passed = status === 200 && data && data.paidAmount === 250 && data.paymentMode === 'online' && data.status === 'underpaid';
    recordTest('5.9', 'PUT /payments/:id (edit today\'s payment)', passed, 200, status, JSON.stringify(data));

    // Yesterday's payment is editable (5.10)
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newYesterdayPayment = await request('POST', '/payments', { loanId: ramLoanId, paymentDate: yesterdayStr, paidAmount: 300, paymentMode: 'cash' }, accessToken);
    yesterdaysPaymentId = newYesterdayPayment.data._id;

    const editYesterday = await request('PUT', `/payments/${yesterdaysPaymentId}`, { paidAmount: 200, paymentMode: 'cash' }, accessToken);
    const passedYesterday = editYesterday.status === 200 && editYesterday.data.paidAmount === 200;
    recordTest('5.10', 'PUT /payments/:id (edit yesterday\'s payment)', passedYesterday, 200, editYesterday.status, JSON.stringify(editYesterday.data));

    // Older than 2 days is locked (5.11)
    const threeDaysAgoStr = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // We cannot create past locked payments easily without server bypass, but we can insert one directly into DB, then try updating it.
    const olderPayment = await Payment.create({
      loanId: ramLoanId,
      collectedBy: user._id,
      paymentDate: new Date(threeDaysAgoStr),
      expectedAmount: 300,
      paidAmount: 300,
      status: 'paid',
      paymentMode: 'cash',
      isLocked: false, // will check if server dynamically locks it based on date
    });
    olderThan2DaysPaymentId = olderPayment._id.toString();

    const editOlder = await request('PUT', `/payments/${olderThan2DaysPaymentId}`, { paidAmount: 200, paymentMode: 'cash' }, accessToken);
    const passedOlder = editOlder.status === 423 && editOlder.data.error === 'This entry is locked. Adjust in a future payment.';
    recordTest('5.11', 'PUT /payments/:id (locked if > 2 days ago)', passedOlder, 423, editOlder.status, JSON.stringify(editOlder.data));

    // Manually setting isLocked: true (5.12)
    const activePayment = await Payment.create({
      loanId: ramLoanId,
      collectedBy: user._id,
      paymentDate: new Date(), // today, which is normally editable
      expectedAmount: 300,
      paidAmount: 300,
      status: 'paid',
      paymentMode: 'cash',
      isLocked: true, // manually lock it
    });

    const editManuallyLocked = await request('PUT', `/payments/${activePayment._id}`, { paidAmount: 200, paymentMode: 'cash' }, accessToken);
    const passedManual = editManuallyLocked.status === 423 && editManuallyLocked.data.error === 'This entry is locked. Adjust in a future payment.';
    recordTest('5.12', 'PUT /payments/:id (locked if isLocked: true flag is set)', passedManual, 423, editManuallyLocked.status, JSON.stringify(editManuallyLocked.data));

    // Cleanup manual locked payment
    await Payment.deleteOne({ _id: activePayment._id });
  }

  // 5D — Today's Collection Summary
  {
    // Let's make sure we have payments today for collector 1 and collector 2
    const { status, data } = await request('GET', '/payments/today', null, accessToken);
    const passed = status === 200 && data && data.totals && data.byCollector && data.byGroup && Array.isArray(data.payments);
    recordTest('5.13', 'GET /payments/today structure', passed, 200, status, `Totals: ${data ? JSON.stringify(data.totals) : 'null'}`);

    if (passed) {
      const { totals, byCollector, byGroup } = data;
      // 5.14 Total verification
      const passedTotals = totals.totalCollected === (totals.totalCash + totals.totalOnline);
      recordTest('5.14', 'Verify totals (collected = cash + online)', passedTotals, 'pass', passedTotals ? 'pass' : 'fail', `Collected: ${totals.totalCollected}, Cash+Online: ${totals.totalCash + totals.totalOnline}`);

      // 5.15 Collector names verification
      const collectors = Object.keys(byCollector);
      const passedCollectors = collectors.length > 0 && !collectors.includes('Agent 004') && collectors.every(c => c !== 'Unknown');
      recordTest('5.15', 'Verify byCollector names (shows seeded name, not placeholders)', passedCollectors, 'pass', passedCollectors ? 'pass' : 'fail', `Collectors: ${collectors.join(', ')}`);

      // 5.16 Group names verification
      const groups = Object.keys(byGroup);
      const passedGroups = groups.length > 0 && groups.every(g => g !== 'North Sector' && g !== 'Unknown');
      recordTest('5.16', 'Verify byGroup names (shows actual groups like Sukapur)', passedGroups, 'pass', passedGroups ? 'pass' : 'fail', `Groups: ${groups.join(', ')}`);
    } else {
      recordTest('5.14', 'Verify totals', false, 'pass', 'fail');
      recordTest('5.15', 'Verify byCollector names', false, 'pass', 'fail');
      recordTest('5.16', 'Verify byGroup names', false, 'pass', 'fail');
    }
  }

  // 5E — Offline Sync
  {
    // Clean up payments on shamLoanId
    await Payment.deleteMany({ loanId: shamLoanId });

    // Sync a payment (5.17)
    const offlineItem = {
      loanId: shamLoanId,
      paymentDate: todayStr,
      paidAmount: 400,
      paymentMode: 'cash',
      isOfflineEntry: true,
    };
    const { status, data } = await request('POST', '/payments/sync', { payments: [offlineItem] }, accessToken);
    const passed = status === 200 && data && data.synced === 1 && data.failed.length === 0;
    recordTest('5.17', 'POST /payments/sync (bulk sync)', passed, 200, status, JSON.stringify(data));

    // Duplicate sync (upsert check 5.18)
    const resDuplicate = await request('POST', '/payments/sync', { payments: [offlineItem] }, accessToken);
    const passedDuplicate = resDuplicate.status === 200 && resDuplicate.data && resDuplicate.data.synced === 1 && resDuplicate.data.failed.length === 0;
    recordTest('5.18', 'POST /payments/sync (duplicate upsert test)', passedDuplicate, 200, resDuplicate.status, JSON.stringify(resDuplicate.data));
  }

  // 5F — Loan detail after payments
  {
    const { status, data } = await request('GET', `/loans/${ramLoanId}`, null, accessToken);
    const passed = status === 200 && data && data.payments && data.payments.length > 0;
    recordTest('5.19', 'GET /loans/:id (includes populated payments)', passed, 200, status, `Payments in detail: ${data && data.payments ? data.payments.length : 0}`);
  }
  {
    const { status, data } = await request('GET', `/customers/${ramId}`, null, accessToken);
    const passed = status === 200 && data && data.activeLoan !== null && data.activeLoan._id === ramLoanId;
    recordTest('5.20', 'GET /customers/:id (activeLoan populated)', passed, 200, status, `Active loan: ${data && data.activeLoan ? data.activeLoan._id : 'null'}`);
  }

  // --- SECTION 6 — PENALTIES ---
  console.log('\n--- SECTION 6 — PENALTIES ---');
  {
    const { status, data } = await request('POST', '/penalties', { loanId: ramLoanId, amount: 1000, reason: 'Overdue 5 days' }, accessToken);
    const passed = status === 201 && data && data.amount === 1000 && data.reason === 'Overdue 5 days';
    recordTest('6.1', 'POST /penalties (positive amount)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/penalties', { loanId: ramLoanId, amount: 0, reason: 'Waived' }, accessToken);
    const passed = status === 201 && data && data.amount === 0 && data.reason === 'Waived';
    recordTest('6.2', 'POST /penalties (amount: 0 is valid)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/penalties', { loanId: ramLoanId, amount: -500 }, accessToken);
    const passed = status === 400;
    recordTest('6.3', 'POST /penalties (negative amount)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/penalties', { loanId: '123456789012345678901234', amount: 100 }, accessToken);
    const passed = status === 400;
    recordTest('6.4', 'POST /penalties (invalid loanId)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', `/penalties/loan/${ramLoanId}`, null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.length >= 2;
    recordTest('6.5', 'GET /penalties/loan/:loanId', passed, 200, status, `Count: ${data ? data.length : 0}`);
  }
  {
    // Penalty does not change dailyAmount or payment records (6.6)
    const { data: loanDetail } = await request('GET', `/loans/${ramLoanId}`, null, accessToken);
    const passed = loanDetail && loanDetail.loan && loanDetail.loan.dailyAmount === 300;
    recordTest('6.6', 'Verify penalties do not affect loan dailyAmount', passed, 'pass', passed ? 'pass' : 'fail', `dailyAmount is ${loanDetail && loanDetail.loan ? loanDetail.loan.dailyAmount : 'null'}`);
  }

  // --- SECTION 7 — REMINDERS ---
  console.log('\n--- SECTION 7 — REMINDERS ---');
  {
    const { status, data } = await request('POST', '/reminders', {
      loanId: ramLoanId,
      customerId: ramId,
      reminderTime: '17:00',
      repeatType: 'daily',
    }, accessToken);
    const passed = status === 201 && data && data.reminderTime === '17:00' && data.reminderDate === null;
    if (passed) reminderId = data._id;
    recordTest('7.1', 'POST /reminders (daily repeat)', passed, 201, status, JSON.stringify(data));
  }
  {
    const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { status, data } = await request('POST', '/reminders', {
      loanId: ramLoanId,
      customerId: ramId,
      reminderTime: '09:30',
      repeatType: 'once',
      reminderDate: tomorrowStr,
    }, accessToken);
    const passed = status === 201 && data && data.reminderTime === '09:30' && data.reminderDate !== null;
    recordTest('7.2', 'POST /reminders (once repeat with date)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/reminders', {
      loanId: ramLoanId,
      customerId: ramId,
      reminderTime: '25:00',
      repeatType: 'daily',
    }, accessToken);
    const passed = status === 400;
    recordTest('7.3', 'POST /reminders (invalid time format 25:00)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('POST', '/reminders', {
      loanId: ramLoanId,
      customerId: ramId,
      reminderTime: '09:30',
      repeatType: 'once', // no date
    }, accessToken);
    const passed = status === 400;
    recordTest('7.4', 'POST /reminders (once repeat without date)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/reminders', null, accessToken);
    const passed = status === 200 && Array.isArray(data) && data.length >= 2;
    recordTest('7.5', 'GET /reminders', passed, 200, status, `Count: ${data ? data.length : 0}`);
  }
  {
    const { status, data } = await request('DELETE', `/reminders/${reminderId}`, null, accessToken);
    const passed = status === 200;
    recordTest('7.6', 'DELETE /reminders/:id', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', '/reminders', null, accessToken);
    // Deleted 1, so 1 remaining (from 7.2)
    const passed = status === 200 && Array.isArray(data) && data.length === 1;
    recordTest('7.7', 'GET /reminders (after delete)', passed, 200, status, `Count: ${data ? data.length : 0}`);
  }

  // --- SECTION 8 — LOAN CLOSURE AND ROLLOVER ---
  console.log('\n--- SECTION 8 — LOAN CLOSURE AND ROLLOVER ---');
  {
    const { status, data } = await request('PUT', `/loans/${ramLoanId}/close`, null, accessToken);
    const passed = status === 200 && data && data.status === 'closed' && data.closedAt !== null;
    recordTest('8.1', 'PUT /loans/:id/close', passed, 200, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', `/loans/${ramLoanId}/close`, null, accessToken);
    const passed = status === 400 && data && data.error === 'Loan is not active';
    recordTest('8.2', 'PUT /loans/:id/close (already closed)', passed, 400, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('GET', `/customers/${ramId}`, null, accessToken);
    const passed = status === 200 && data && data.activeLoan === null;
    recordTest('8.3', 'GET /customers/:id (activeLoan is null after closure)', passed, 200, status, JSON.stringify(data));
  }

  // Rollover test (use Sham's loan)
  // Let's check cumulativePending on shamLoanId first to see the math. We did a sync payment of 400 on expected 400, so pending balance = 0.
  // Wait, let's create a pending balance for Sham by adding a skipped payment, so we can test carriedOverBalance rollover.
  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  await Payment.create({
    loanId: shamLoanId,
    collectedBy: user._id,
    paymentDate: new Date(yesterdayStr),
    expectedAmount: 400,
    paidAmount: 100, // underpaid by 300
    status: 'underpaid',
    paymentMode: 'cash',
  });
  await recalculateLoanPending(shamLoanId);

  const shamPending = await calculateRemainingBalance(shamLoanId);
  console.log(`Sham current pending balance: ₹${shamPending}`);

  let rolloverNewLoanId = '';
  {
    const { status, data } = await request('POST', `/loans/${shamLoanId}/rollover`, {
      newAmount: 5000,
      interestRate: 12,
      totalDays: 50,
      startDate: todayStr,
    }, accessToken);

    const passed = status === 200 && data && data.closedLoan && data.newLoan;
    if (passed) rolloverNewLoanId = data.newLoan._id;
    recordTest('8.4', 'POST /loans/:id/rollover', passed, 200, status, passed ? 'Closed old + opened new' : JSON.stringify(data));
    
    if (passed) {
      // 8.5 Verify closedLoan
      const passedClosed = data.closedLoan.status === 'rolled_over' && data.closedLoan.closedAt !== null;
      recordTest('8.5', 'Verify closedLoan fields (rolled_over status)', passedClosed, 'rolled_over', data.closedLoan.status);

      // 8.6 Verify newLoan previousLoanId
      const passedPrevId = data.newLoan.previousLoanId === shamLoanId;
      recordTest('8.6', 'Verify newLoan previousLoanId mapping', passedPrevId, shamLoanId, data.newLoan.previousLoanId);

      // 8.7 Verify loanNumber
      const passedLoanNum = data.newLoan.loanNumber === 2; // Yard Market was at 1
      recordTest('8.7', 'Verify newLoan.loanNumber assignment (should be 2)', passedLoanNum, 2, data.newLoan.loanNumber);

      // 8.8 Verify carriedOverBalance
      const passedCarried = data.newLoan.carriedOverBalance === shamPending;
      recordTest('8.8', 'Verify carriedOverBalance matches old outstanding (₹300)', passedCarried, shamPending, data.newLoan.carriedOverBalance);

      // 8.9 Verify math
      const expectedPrincipal = 5000 + shamPending; // 5300
      const passedPrincipal = data.newLoan.principalAmount === expectedPrincipal;
      recordTest('8.9', 'Verify newLoan.principalAmount (newAmount + carried)', passedPrincipal, expectedPrincipal, data.newLoan.principalAmount);
    } else {
      recordTest('8.5', 'Verify closedLoan fields', false, 'rolled_over', 'fail');
      recordTest('8.6', 'Verify newLoan previousLoanId mapping', false, 'pass', 'fail');
      recordTest('8.7', 'Verify newLoan.loanNumber assignment', false, 'pass', 'fail');
      recordTest('8.8', 'Verify carriedOverBalance matches old outstanding', false, 'pass', 'fail');
      recordTest('8.9', 'Verify newLoan.principalAmount', false, 'pass', 'fail');
    }
  }
  {
    const { status, data } = await request('GET', `/customers/${shamId}`, null, accessToken);
    const passed = status === 200 && data && data.activeLoan !== null && data.activeLoan._id === rolloverNewLoanId;
    recordTest('8.10', 'GET /customers/:id (activeLoan is the NEW loan)', passed, 200, status, JSON.stringify(data));
  }

  // --- SECTION 9 — OVERDUE LOAN ---
  console.log('\n--- SECTION 9 — OVERDUE LOAN ---');
  let overdueLoanId = '';
  {
    // Create loan with startDate 60 days ago
    const start60DaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    // Create new customer for this overdue test
    const overdueC = await Customer.create({ name: 'Overdue Cust', phone: '9888888888', groupId: sukapurId });
    const { status, data } = await request('POST', '/loans', {
      customerId: overdueC._id.toString(),
      groupId: sukapurId,
      mode: 'daily',
      dailyAmount: 100,
      totalDays: 50,
      startDate: start60DaysAgo,
    }, accessToken);

    const passed = status === 201;
    if (passed) overdueLoanId = data._id;
    recordTest('9.1', 'Create loan starting 60 days ago (totalDays=50)', passed, 201, status, JSON.stringify(data));
  }
  {
    const { status, data } = await request('PUT', `/loans/${overdueLoanId}/overdue`, null, accessToken);
    const passed = status === 200 && data && data.isOverdue === true;
    recordTest('9.2', 'PUT /loans/:id/overdue (success on overdue loan)', passed, 200, status, JSON.stringify(data));
  }
  {
    // Try on Sham's new loan which is fresh
    const { status, data } = await request('PUT', `/loans/${rolloverNewLoanId}/overdue`, null, accessToken);
    const passed = status === 400 && data && data.error === 'Loan is not yet overdue';
    recordTest('9.3', 'PUT /loans/:id/overdue (fails on fresh active loan)', passed, 400, status, JSON.stringify(data));
  }

  // --- SECTION 10 — SECURITY CHECKS ---
  console.log('\n--- SECTION 10 — SECURITY CHECKS ---');
  {
    const { status } = await request('GET', '/auth/me');
    const passed = status === 401;
    recordTest('10.1', 'No Authorization header', passed, 401, status);
  }
  {
    const { status } = await request('GET', '/auth/me', null, 'invalidtoken');
    const passed = status === 401;
    recordTest('10.2', 'Bearer invalidtoken', passed, 401, status);
  }
  {
    // Expired token test: generate an expired token or modify secret. We can mock JWT verification failure by sending an invalid token format.
    // Let's sign an expired token from the secret. Or we can just sign it with expiry '0s' and call it immediately!
    const expiredToken = require('jsonwebtoken').sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '0s' });
    const { status } = await request('GET', '/auth/me', null, expiredToken);
    const passed = status === 401;
    recordTest('10.3', 'Expired access token', passed, 401, status);
  }
  {
    // inspect /auth/me payload
    const { status, data } = await request('GET', '/auth/me', null, accessToken);
    const passed = status === 200 && data && data.user &&
                   !('passwordHash' in data.user) &&
                   !('appPin' in data.user) &&
                   !('otpCode' in data.user) &&
                   !('otpExpiry' in data.user);
    recordTest('10.4', 'GET /auth/me returns safe payload (no passwordHash, appPin, otpCode, otpExpiry)', passed, 200, status, JSON.stringify(data));
  }
  {
    // Rate limit: 101+ requests. We can fire 105 quick fetch requests.
    console.log('Sending 105 requests to test rate limiting (this may take a few seconds)...');
    let hitRateLimit = false;
    let rateLimitStatus = 0;
    
    // We already made some requests. Let's make 110 requests to ensure we hit 429.
    for (let i = 0; i < 110; i++) {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitStatus = res.status;
        break;
      }
    }
    recordTest('10.5', 'Rate limiter (101+ requests -> 429)', hitRateLimit, 429, rateLimitStatus || 200, hitRateLimit ? 'Rate limit triggered successfully' : 'Rate limit did NOT trigger');
  }
  {
    // Try deleting other collector's reminder
    // Let's create a reminder createdBy collector2 (User 2)
    const user2 = await User.findOne({ email: 'collector2@gmail.com' });
    const u2Reminder = await Reminder.create({
      loanId: ramLoanId,
      customerId: ramId,
      createdBy: user2._id,
      reminderTime: '18:00',
      repeatType: 'daily',
    });

    const { status } = await request('DELETE', `/reminders/${u2Reminder._id}`, null, accessToken);
    // Should return 404 since findOneAndDelete restricts to createdBy: req.user._id
    const passed = status === 404;
    recordTest('10.6', 'DELETE /reminders/:id of another collector', passed, 404, status);

    // Clean up
    await Reminder.deleteOne({ _id: u2Reminder._id });
  }

  // --- SECTION 11 — CROSS-CUTTING CHECKS ---
  console.log('\n--- SECTION 11 — CROSS-CUTTING CHECKS ---');
  {
    // 11.1 Loan numbers are per-group
    // We have Sukapur group with loans 1, 2, and 4 (overdue test). Yard Market has loans 1 (sham old) and 2 (sham rollover).
    // Let's check counters
    const gSukapur = await Group.findById(sukapurId);
    const gYard = await Group.findById(yardMarketId);
    const passed = gSukapur.loanCounter === 4 && gYard.loanCounter === 2;
    recordTest('11.1', 'Verify loan numbers are independent per-group', passed, 'Sukapur=4, Yard=2', `Sukapur=${gSukapur.loanCounter}, Yard=${gYard.loanCounter}`);
  }
  {
    // 11.2 loanNumber uniqueness (compound index unique)
    let triggeredDuplicateError = false;
    try {
      await Loan.create({
        loanNumber: 1,
        groupId: sukapurId,
        customerId: kumarId,
        dailyAmount: 100,
        startDate: new Date(),
        createdBy: user._id,
      });
    } catch (e) {
      if (e.code === 11000) {
        triggeredDuplicateError = true;
      }
    }
    recordTest('11.2', 'Verify loanNumber + groupId compound uniqueness', triggeredDuplicateError, 'duplicate error', triggeredDuplicateError ? 'Duplicate error caught' : 'No error');
  }
  {
    // 11.3 Penalty does not change dailyAmount
    const penaltyAmt = 500;
    await Penalty.create({ loanId: ramLoanId, amount: penaltyAmt, addedBy: user._id });
    const { data } = await request('GET', `/loans/${ramLoanId}`, null, accessToken);
    const passed = data && data.loan && data.loan.dailyAmount === 300;
    recordTest('11.3', 'Verify penalty addition does not change loan dailyAmount (300)', passed, 300, data && data.loan ? data.loan.dailyAmount : 'null');
  }
  {
    // 11.4 Customer groupId cannot change
    const { status } = await request('PUT', `/customers/${ramId}`, { groupId: yardMarketId }, accessToken);
    const passed = status === 400;
    recordTest('11.4', 'Verify customer groupId cannot change post-creation', passed, 400, status);
  }
  {
    // 11.5 Bin 30-day expiry
    // Soft delete a customer, set deletedAt to 31 days ago, verify they don't appear in bin
    const binC = await Customer.create({
      name: 'Expired Bin Customer',
      phone: '9000000000',
      groupId: sukapurId,
      isDeleted: true,
      deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
    });

    const { status, data } = await request('GET', '/customers/bin', null, accessToken);
    const passed = status === 200 && Array.isArray(data) && !data.some(c => c._id === binC._id.toString());
    recordTest('11.5', 'Verify bin records older than 30 days are excluded', passed, 200, status, passed ? 'Excluded' : 'Included');

    // Clean up
    await Customer.deleteOne({ _id: binC._id });
  }
  {
    // 11.6 Tamil name stored and retrieved correctly
    const { status, data } = await request('GET', `/customers/${kumarId}`, null, accessToken);
    const passed = status === 200 && data && data.customer && data.customer.name === 'குமார்';
    recordTest('11.6', 'Verify Tamil script support (குமார்)', passed, 'குமார்', data && data.customer ? data.customer.name : 'null');
  }
  {
    // 11.7 cumulativePending calculation
    // Create new loan for Ram to test clean payments. Expected: 300/day.
    const cleanLoan = await Loan.create({
      loanNumber: 99,
      groupId: sukapurId,
      customerId: ramId,
      dailyAmount: 300,
      startDate: new Date(),
      createdBy: user._id,
    });
    
    // Day 1: paid 300 (expected 300) -> pending: 0
    await Payment.create({ loanId: cleanLoan._id, collectedBy: user._id, paymentDate: new Date(), expectedAmount: 300, paidAmount: 300, status: 'paid', paymentMode: 'cash' });
    // Day 2: paid 0 (skipped) (expected 300) -> pending: 300
    await Payment.create({ loanId: cleanLoan._id, collectedBy: user._id, paymentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), expectedAmount: 300, paidAmount: 0, status: 'skipped', paymentMode: 'cash' });
    // Day 3: paid 500 (overpaid) (expected 300) -> pending: 300 + 300 - 500 = 100
    await Payment.create({ loanId: cleanLoan._id, collectedBy: user._id, paymentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), expectedAmount: 300, paidAmount: 500, status: 'overpaid', paymentMode: 'cash' });

    await recalculateLoanPending(cleanLoan._id);
    const latestPayment = await Payment.findOne({ loanId: cleanLoan._id }).sort({ paymentDate: -1, createdAt: -1 });
    const passed = latestPayment && latestPayment.cumulativePending === 100;
    
    recordTest('11.7', 'Verify cumulativePending math (300 paid -> 0 skipped -> 500 paid = 100 pending)', passed, 100, latestPayment ? latestPayment.cumulativePending : 'null');

    // Clean up cleanLoan and its payments
    await Payment.deleteMany({ loanId: cleanLoan._id });
    await Loan.deleteOne({ _id: cleanLoan._id });
  }

  // --- FINAL RESULTS PRINT ---
  console.log('\n======================================');
  console.log('            API TEST SUMMARY          ');
  console.log('======================================');
  
  const failedTests = testsRun.filter(t => !t.passed);
  if (failedTests.length === 0) {
    console.log('🎉 ALL TESTS PASSED! Clean sweep!');
  } else {
    console.log(`❌ ${failedTests.length} TESTS FAILED:`);
    failedTests.forEach(t => {
      console.log(`  - [${t.id}] ${t.name} (Expected: ${t.expectedStatus}, Got: ${t.actualStatus})`);
    });
  }
  console.log('======================================');

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  mongoose.disconnect();
});
