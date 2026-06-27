/**
 * Calculate total repayable amount given principal and flat interest rate.
 * Formula: Total = Principal + (Principal × Rate / 100)
 */
export function calculateTotalRepayable(principal: number, interestRate: number): number {
  return Math.round(principal + (principal * interestRate) / 100);
}

/**
 * Calculate the daily installment amount.
 */
export function calculateDailyInstallment(
  principal: number,
  interestRate: number,
  termDays: number,
): number {
  const total = calculateTotalRepayable(principal, interestRate);
  return Math.ceil(total / termDays);
}

/**
 * Calculate remaining balance after payments.
 */
export function calculateRemainingBalance(
  totalRepayable: number,
  totalPaid: number,
): number {
  return Math.max(0, totalRepayable - totalPaid);
}

/**
 * Returns the count of expected installments paid so far based on start date.
 */
export function expectedInstallmentsPaid(
  startDate: Date,
  repaymentType: 'daily' | 'weekly' | 'monthly',
): number {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (repaymentType === 'daily') return diffDays;
  if (repaymentType === 'weekly') return Math.floor(diffDays / 7);
  if (repaymentType === 'monthly') return Math.floor(diffDays / 30);
  return diffDays;
}

/**
 * Returns true if the loan is overdue (remaining > 0 and past end date).
 */
export function isLoanOverdue(endDate: Date, remainingBalance: number): boolean {
  return remainingBalance > 0 && new Date() > endDate;
}
