const calculateFromPrincipal = (principal, interestRate, totalDays) => {
  const interest = principal * (interestRate / 100);
  const totalAmount = principal + interest;
  const dailyAmount = parseFloat((totalAmount / totalDays).toFixed(2));
  return { interest, totalAmount, dailyAmount };
};

const getPaymentStatus = (paidAmount, expectedAmount) => {
  if (paidAmount === 0) return 'skipped';
  if (paidAmount === expectedAmount) return 'paid';
  if (paidAmount > expectedAmount) return 'overpaid';
  return 'underpaid';
};

const isPaymentLocked = (paymentDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const pDate = new Date(paymentDate);
  pDate.setHours(0, 0, 0, 0);
  return pDate < yesterday;
};

module.exports = { calculateFromPrincipal, getPaymentStatus, isPaymentLocked };
