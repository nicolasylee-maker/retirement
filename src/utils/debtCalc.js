/**
 * Back-solve a mortgage balance from a known monthly payment and years remaining.
 * Assumes a fixed 5% annual rate (sufficient for quick-start approximation).
 * Returns 0 for invalid inputs.
 */
export function backSolveMortgageBalance(monthlyPayment, yearsLeft) {
  if (!monthlyPayment || monthlyPayment <= 0 || yearsLeft <= 0) return 0;
  const rate = 0.05;
  const annualPayment = monthlyPayment * 12;
  const factor = Math.pow(1 + rate, yearsLeft);
  return Math.round(annualPayment * (factor - 1) / (rate * factor));
}

/**
 * Calculate the annual payment for a loan using the standard PMT formula.
 * Returns 0 if balance or years are non-positive.
 */
export function calcAnnualPayment(balance, rate, years) {
  if (!balance || balance <= 0 || years <= 0) return 0;
  if (rate === 0) return balance / years;
  return balance * (rate * Math.pow(1 + rate, years)) / (Math.pow(1 + rate, years) - 1);
}

/**
 * Compute monthly debt payments for a scenario, broken out by type.
 */
export function calcTotalMonthlyDebt(scenario) {
  const s = scenario;
  let mortgageAnnual = 0;
  let consumerAnnual = 0;
  let otherAnnual = 0;

  if ((s.mortgageBalance || 0) > 0 && (s.mortgageYearsLeft || 0) > 0) {
    mortgageAnnual = calcAnnualPayment(s.mortgageBalance, s.mortgageRate || 0.05, s.mortgageYearsLeft);
  }
  if ((s.consumerDebt || 0) > 0) {
    const years = Math.max(1, (s.consumerDebtPayoffAge || (s.currentAge + 10)) - s.currentAge);
    consumerAnnual = calcAnnualPayment(s.consumerDebt, s.consumerDebtRate || 0.08, years);
  }
  if ((s.otherDebt || 0) > 0) {
    const years = Math.max(1, (s.otherDebtPayoffAge || 70) - s.currentAge);
    otherAnnual = calcAnnualPayment(s.otherDebt, s.otherDebtRate || 0.05, years);
  }

  const totalAnnual = mortgageAnnual + consumerAnnual + otherAnnual;
  return {
    mortgage: Math.round(mortgageAnnual / 12),
    consumer: Math.round(consumerAnnual / 12),
    other: Math.round(otherAnnual / 12),
    totalMonthly: Math.round(totalAnnual / 12),
    totalAnnual,
  };
}

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
