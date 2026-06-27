/**
 * Formats a number as Indian Rupee — no decimals.
 * Example: formatCurrency(15000) → "₹15,000"
 * Example: formatCurrency(1500000) → "₹15,00,000"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount == null) return '₹0';

  const absAmount = Math.round(Math.abs(amount));
  const str = absAmount.toString();

  // Indian number system: last 3 digits, then groups of 2
  let result = '';
  if (str.length <= 3) {
    result = str;
  } else {
    const last3 = str.slice(-3);
    const rest = str.slice(0, str.length - 3);
    const groups: string[] = [];
    for (let i = rest.length; i > 0; i -= 2) {
      groups.unshift(rest.slice(Math.max(0, i - 2), i));
    }
    result = groups.join(',') + ',' + last3;
  }

  return `${amount < 0 ? '-' : ''}₹${result}`;
}

/**
 * Formats a raw API amount (may be stored as number) safely.
 */
export function formatCurrencySafe(amount: unknown): string {
  return formatCurrency(Number(amount) || 0);
}
