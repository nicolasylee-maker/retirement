import { formatCurrency } from './formatters';

export function toTodaysDollars(futureValue, yearsFromNow, inflationRate) {
  if (yearsFromNow <= 0 || !inflationRate) return futureValue;
  return futureValue / Math.pow(1 + inflationRate, yearsFromNow);
}

/** Full label for tooltip subs: "$1,365/mo in today's dollars" */
export function todaysDollarsLabel(futureValue, displayAge, currentAge, inflationRate, period = 'monthly') {
  const years = displayAge - currentAge;
  if (years <= 0 || !futureValue) return null;
  const todaysValue = toTodaysDollars(futureValue, years, inflationRate);
  const displayValue = period === 'monthly' ? todaysValue / 12 : todaysValue;
  const suffix = period === 'monthly' ? '/mo' : '/yr';
  return `${formatCurrency(Math.round(displayValue))}${suffix} in today's dollars`;
}

/** Compact for chart tooltips: "($1,365/mo today)" */
export function todaysDollarsCompact(futureValue, displayAge, currentAge, inflationRate, period = 'monthly') {
  const years = displayAge - currentAge;
  if (years <= 0 || !futureValue) return null;
  const todaysValue = toTodaysDollars(futureValue, years, inflationRate);
  const displayValue = period === 'monthly' ? todaysValue / 12 : todaysValue;
  const suffix = period === 'monthly' ? '/mo' : '/yr';
  return `(${formatCurrency(Math.round(displayValue))}${suffix} today)`;
}
