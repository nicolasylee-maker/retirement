/**
 * Calculate a debt amortization schedule from current age to payoff age.
 * Returns an array of yearly rows with balance, interest, principal, and payment.
 */
export function calcDebtSchedule(balance, rate, payoffAge, currentAge, label) {
  if (!balance || balance <= 0 || payoffAge <= currentAge) return [];
  const years = payoffAge - currentAge;
  let annual;
  if (rate === 0) {
    annual = balance / years;
  } else {
    annual = balance * (rate * Math.pow(1 + rate, years)) / (Math.pow(1 + rate, years) - 1);
  }
  const rows = [];
  let remaining = balance;
  let totalInterest = 0;
  for (let y = 0; y <= years; y++) {
    const age = currentAge + y;
    if (y === 0) {
      rows.push({ age, balance: Math.round(remaining), interest: 0, principal: 0, payment: 0, totalInterest: 0, label });
      continue;
    }
    const interest = remaining * rate;
    const payment = Math.min(remaining + interest, annual);
    const principal = payment - interest;
    remaining = Math.max(0, remaining - principal);
    totalInterest += interest;
    rows.push({
      age,
      balance: Math.round(remaining),
      interest: Math.round(interest),
      principal: Math.round(principal),
      payment: Math.round(payment),
      totalInterest: Math.round(totalInterest),
      label,
    });
  }
  return rows;
}
