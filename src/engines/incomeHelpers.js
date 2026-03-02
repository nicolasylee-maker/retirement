import {
  CPP_PARAMS, OAS_PARAMS, GIS_PARAMS, GAINS_PARAMS, CAPITAL_GAINS,
} from '../constants/taxTables.js';

/**
 * Flat 50% capital gains inclusion for 2025.
 * The proposed tiered 66.67% rate was cancelled March 21, 2025.
 */
export function calcTaxableCapitalGain(gain) {
  if (gain <= 0) return 0;
  return gain * CAPITAL_GAINS.inclusionRate;
}

/** CPP annual benefit adjusted for start age vs 65. */
export function calcCppBenefit(monthlyAt65, startAge, currentAge) {
  if (currentAge < startAge) return 0;
  const monthsDiff = (startAge - 65) * 12;
  let adjustment;
  if (monthsDiff < 0) {
    // Early: reduce by 0.6% per month
    adjustment = 1 + monthsDiff * CPP_PARAMS.earlyReduction;
  } else {
    // Late: increase by 0.7% per month
    adjustment = 1 + monthsDiff * CPP_PARAMS.lateIncrease;
  }
  return monthlyAt65 * 12 * Math.max(0, adjustment);
}

/** OAS annual benefit adjusted for deferral past 65. */
export function calcOasBenefit(monthlyAt65, startAge, currentAge) {
  if (currentAge < startAge) return 0;
  const yearsDeferred = Math.min(startAge, OAS_PARAMS.maxDeferAge) - OAS_PARAMS.startAge;
  const monthsDeferred = Math.max(0, yearsDeferred) * 12;
  const deferralBonus = monthsDeferred * OAS_PARAMS.deferralBonus;
  return monthlyAt65 * 12 * (1 + deferralBonus);
}

/** GIS benefit: income-tested, only if receiving OAS. */
export function calcGisBenefit(receivingOas, otherIncome) {
  if (!receivingOas) return 0;
  if (otherIncome >= GIS_PARAMS.incomeThreshold) return 0;
  const reduction = otherIncome * GIS_PARAMS.clawbackRate;
  return Math.max(0, GIS_PARAMS.maxAnnual - reduction);
}

/**
 * Ontario GAINS benefit.
 * Returns 0 for any province other than ON — GAINS is an Ontario-only program.
 * @param {number} age
 * @param {number} privateIncome
 * @param {string} [province]  Defaults to 'ON' for backward compat
 */
export function calcGainsBenefit(age, privateIncome, province = 'ON') {
  if (province !== 'ON') return 0;
  if (age < GAINS_PARAMS.minAge) return 0;
  const reduction = Math.max(0, privateIncome - GAINS_PARAMS.singleIncomeThreshold);
  return Math.max(0, GAINS_PARAMS.maxAnnual - reduction * GAINS_PARAMS.clawbackRate);
}
