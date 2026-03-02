import {
  CPP_PARAMS, OAS_PARAMS, GIS_PARAMS, GAINS_PARAMS, CAPITAL_GAINS,
} from '../constants/taxTables.js';

/** Tiered capital gains inclusion: 50% on first $250K, 66.7% above. */
export function calcTaxableCapitalGain(gain) {
  if (gain <= 0) return 0;
  if (gain <= CAPITAL_GAINS.enhancedThreshold) {
    return gain * CAPITAL_GAINS.inclusionRate;
  }
  const base = CAPITAL_GAINS.enhancedThreshold * CAPITAL_GAINS.inclusionRate;
  const excess = (gain - CAPITAL_GAINS.enhancedThreshold) * CAPITAL_GAINS.enhancedRate;
  return base + excess;
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

/** Ontario GAINS benefit. */
export function calcGainsBenefit(age, privateIncome) {
  if (age < GAINS_PARAMS.minAge) return 0;
  const reduction = Math.max(0, privateIncome - GAINS_PARAMS.singleIncomeThreshold);
  return Math.max(0, GAINS_PARAMS.maxAnnual - reduction * GAINS_PARAMS.clawbackRate);
}
