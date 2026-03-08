/**
 * TFSA annual contribution limits (CRA) and estimate functions
 * for auto-populating contribution room fields in the wizard.
 */

export const TFSA_ANNUAL_LIMITS = {
  2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000,
  2013: 5500, 2014: 5500,
  2015: 10000,
  2016: 5500, 2017: 5500, 2018: 5500,
  2019: 6000, 2020: 6000, 2021: 6000, 2022: 6000,
  2023: 6500,
  2024: 7000, 2025: 7000, 2026: 7000,
};

/**
 * Estimate TFSA contribution room based on age, year, and current balance.
 * Assumes the person has been eligible since they turned 18 (or 2009, whichever is later)
 * and has never withdrawn (withdrawals restore room the following year).
 *
 * @param {number} currentAge
 * @param {number} currentYear
 * @param {number} tfsaBalance - current TFSA balance
 * @returns {number} estimated remaining room (clamped to >= 0)
 */
export function estimateTfsaRoom(currentAge, currentYear, tfsaBalance) {
  const eligibleFrom = Math.max(2009, currentYear - currentAge + 18);
  let cumulative = 0;
  for (let y = eligibleFrom; y <= currentYear; y++) {
    cumulative += TFSA_ANNUAL_LIMITS[y] || 7000;
  }
  return Math.max(0, cumulative - (tfsaBalance || 0));
}

/**
 * Cumulative TFSA lifetime limit for a person of given age in given year.
 * Useful for UI display (e.g. "Estimated: $109K lifetime limit").
 */
export function cumulativeTfsaLimit(currentAge, currentYear) {
  const eligibleFrom = Math.max(2009, currentYear - currentAge + 18);
  let cumulative = 0;
  for (let y = eligibleFrom; y <= currentYear; y++) {
    cumulative += TFSA_ANNUAL_LIMITS[y] || 7000;
  }
  return cumulative;
}

/**
 * Rough estimate of RRSP contribution room.
 * This is inherently inaccurate — actual room depends on full income history,
 * pension adjustments, and past contributions. Use as a starting point only.
 *
 * @param {number} currentAge
 * @param {number} employmentIncome - current annual gross income
 * @param {number} rrspBalance - current RRSP balance
 * @param {number} dcPensionBalance - DC pension balance (reduces room)
 * @param {number} liraBalance - LIRA balance (reduces room)
 * @returns {number} rough estimated RRSP room
 */
export function estimateRrspRoom(currentAge, employmentIncome, rrspBalance, dcPensionBalance = 0, liraBalance = 0) {
  const workingYears = Math.max(0, Math.min(currentAge - 18, 35));
  const annualRoom = Math.min((employmentIncome || 0) * 0.18, 32490);
  const totalRegistered = (rrspBalance || 0) + (dcPensionBalance || 0) + (liraBalance || 0);
  return Math.max(0, Math.round(workingYears * annualRoom - totalRegistered));
}
