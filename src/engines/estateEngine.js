import {
  CAPITAL_GAINS,
  PROBATE,
  INTESTACY,
} from '../constants/taxTables.js';
import { calcTaxOnDeemedIncome, calcTotalTax } from './taxEngine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate capital gains tax on deemed disposition.
 * Uses tiered inclusion: 50% on first $250K gain, 66.7% above.
 * @param {number} gain  Total capital gain
 * @returns {number} Taxable portion of the gain
 */
function calcTaxableCapitalGain(gain) {
  if (gain <= 0) return 0;
  if (gain <= CAPITAL_GAINS.enhancedThreshold) {
    return gain * CAPITAL_GAINS.inclusionRate;
  }
  const base = CAPITAL_GAINS.enhancedThreshold * CAPITAL_GAINS.inclusionRate;
  const excess = (gain - CAPITAL_GAINS.enhancedThreshold) * CAPITAL_GAINS.enhancedRate;
  return base + excess;
}

/**
 * Ontario Estate Administration Tax (probate fees).
 * $5 per $1,000 on first $50K, $15 per $1,000 above.
 * @param {number} estateValue  Value of assets going through probate
 * @returns {number} Probate fees
 */
function calcProbateFees(estateValue) {
  if (estateValue <= 0) return 0;
  if (estateValue <= PROBATE.firstThreshold) {
    return estateValue * PROBATE.firstRate;
  }
  const first = PROBATE.firstThreshold * PROBATE.firstRate;
  const above = (estateValue - PROBATE.firstThreshold) * PROBATE.aboveRate;
  return first + above;
}

/**
 * Determine distribution under Ontario intestacy rules (SLRA).
 * @param {number} netEstate  Net estate after taxes and fees
 * @param {boolean} hasSpouse
 * @param {number} [numChildren]
 * @returns {{ spouse: number, children: number, other: number }}
 */
function calcIntestacyDistribution(netEstate, hasSpouse, numChildren = 0) {
  if (netEstate <= 0) return { spouse: 0, children: 0, other: 0 };

  if (!hasSpouse) {
    // Everything to children, or other heirs if no children
    return numChildren > 0
      ? { spouse: 0, children: netEstate, other: 0 }
      : { spouse: 0, children: 0, other: netEstate };
  }

  // Spouse gets preferential share
  const prefShare = Math.min(netEstate, INTESTACY.spousePreferentialShare);
  const remainder = netEstate - prefShare;

  if (numChildren === 0 || remainder <= 0) {
    return { spouse: netEstate, children: 0, other: 0 };
  }

  // Spouse gets 1/2 of remainder if 1 child, 1/3 if 2+ children
  const spouseFraction = numChildren === 1 ? 0.5 : 1 / 3;
  const spouseRemainder = remainder * spouseFraction;
  const childrenShare = remainder - spouseRemainder;

  return {
    spouse: Math.round(prefShare + spouseRemainder),
    children: Math.round(childrenShare),
    other: 0,
  };
}

// ---------------------------------------------------------------------------
// Main estate calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the estate tax impact at a given age of death.
 *
 * @param {object} scenario        The scenario data
 * @param {Array}  projectionData  Output from projectScenario()
 * @param {number} ageAtDeath      Age at death
 * @returns {object} Estate analysis
 */
export function calcEstateImpact(scenario, projectionData, ageAtDeath) {
  // Find the projection row at or closest to death
  const row = projectionData.find(r => r.age === ageAtDeath)
    || projectionData[projectionData.length - 1];

  const s = scenario;
  const spouseRollover = s.primaryBeneficiary === 'spouse';

  // --- Asset values at death ---
  const rrspRrifValue = row.rrspBalance || 0;
  const tfsaValue = row.tfsaBalance || 0;
  const nonRegValue = row.nonRegBalance || 0;
  const otherValue = row.otherBalance || 0;
  const realEstateValue = s.includeRealEstateInEstate ? (s.realEstateValue || 0) : 0;

  // Debts at death
  const totalDebt = (row.mortgageBalance || 0);

  // Gross estate
  const grossEstate = rrspRrifValue + tfsaValue + nonRegValue + otherValue + realEstateValue - totalDebt;

  // --- 1. RRSP/RRIF deemed income ---
  let rrspRrifDeemed = 0;
  if (spouseRollover) {
    // Tax-free rollover to surviving spouse
    rrspRrifDeemed = 0;
  } else {
    // Full value is deemed income on final return
    rrspRrifDeemed = rrspRrifValue;
  }

  // --- 2. Capital gains on non-registered ---
  // Cost basis: tracked from projection (proportionally adjusted on each withdrawal),
  // or inferred from scenario input if projection row lacks it
  const costBasis = row.nonRegCostBasis || (s.nonRegCostBasis || 0);
  const nonRegGain = Math.max(0, nonRegValue - costBasis);
  const taxableGain = calcTaxableCapitalGain(nonRegGain);

  // --- 3. Real estate capital gains ---
  let realEstateGain = 0;
  if (realEstateValue > 0 && !s.realEstateIsPrimary) {
    // Non-primary residence: deemed disposition
    const reCostBasis = s.estimatedCostBasis || 0;
    realEstateGain = Math.max(0, realEstateValue - reCostBasis);
  }
  // Primary residence: exempt from capital gains
  const realEstateTaxableGain = calcTaxableCapitalGain(realEstateGain);

  // --- 4. Total deemed income & tax ---
  // Use last year's regular income as the base
  const baseIncome = (row.cppIncome || 0) + (row.oasIncome || 0) + (row.pensionIncome || 0);
  const totalDeemedIncome = rrspRrifDeemed + taxableGain + realEstateTaxableGain;
  const deemedIncomeTax = calcTaxOnDeemedIncome(baseIncome, totalDeemedIncome, ageAtDeath);

  // Split tax between RRSP and capital gains for breakdown display
  const rrspTax = rrspRrifDeemed > 0
    ? calcTaxOnDeemedIncome(baseIncome, rrspRrifDeemed, ageAtDeath)
    : 0;
  const capGainsTax = (taxableGain > 0 || realEstateTaxableGain > 0)
    ? Math.max(0, deemedIncomeTax - rrspTax)
    : 0;

  // --- 5. Probate fees ---
  // Probate applies to assets without named beneficiary or joint ownership
  // TFSA and RRSP with named beneficiary bypass probate
  // Non-reg and real estate typically go through probate
  let probateableAssets = nonRegValue + otherValue + realEstateValue;
  if (!spouseRollover) {
    // If no spouse beneficiary, RRSP may also go through probate
    probateableAssets += rrspRrifValue;
  }
  const probateFees = calcProbateFees(probateableAssets);

  // --- 6. Total estate taxes and fees ---
  const totalEstateTax = deemedIncomeTax + probateFees;

  // --- 7. Net to heirs ---
  const netToHeirs = Math.max(0, grossEstate - totalEstateTax);

  // --- 8. Breakdown ---
  const breakdown = [];
  breakdown.push({ label: 'RRSP/RRIF balance', amount: rrspRrifValue });
  breakdown.push({ label: 'TFSA balance', amount: tfsaValue });
  breakdown.push({ label: 'Non-registered investments', amount: nonRegValue });
  if (otherValue > 0) {
    breakdown.push({ label: 'Other assets', amount: otherValue });
  }
  if (realEstateValue > 0) {
    breakdown.push({ label: 'Real estate', amount: realEstateValue });
  }
  if (totalDebt > 0) {
    breakdown.push({ label: 'Outstanding debts', amount: -totalDebt });
  }
  breakdown.push({ label: 'Gross estate', amount: grossEstate });
  breakdown.push({ label: '---', amount: 0 });
  if (rrspRrifDeemed > 0) {
    breakdown.push({ label: 'RRSP/RRIF deemed income tax', amount: -rrspTax });
  } else if (spouseRollover && rrspRrifValue > 0) {
    breakdown.push({ label: 'RRSP/RRIF (spousal rollover, tax-free)', amount: 0 });
  }
  if (nonRegGain > 0 || realEstateGain > 0) {
    const totalGain = nonRegGain + realEstateGain;
    breakdown.push({ label: `Capital gains tax (gain: ${Math.round(totalGain).toLocaleString()})`, amount: -capGainsTax });
  }
  breakdown.push({ label: 'Probate fees (Ontario EAT)', amount: -probateFees });
  breakdown.push({ label: 'Net to heirs', amount: netToHeirs });

  // --- 9. Distribution ---
  let distribution;
  if (s.hasWill) {
    // With a will, assume primary beneficiary gets everything
    distribution = spouseRollover
      ? { spouse: netToHeirs, children: 0, other: 0 }
      : { spouse: 0, children: netToHeirs, other: 0 };
  } else {
    // Intestacy rules
    const numChildren = s.numberOfChildren || 0;
    distribution = calcIntestacyDistribution(netToHeirs, s.isCouple, numChildren);
  }

  // Track excluded real estate for UI messaging
  const realEstateExcluded = !s.includeRealEstateInEstate && (s.realEstateValue || 0) > 0;

  return {
    ageAtDeath,
    grossEstate: Math.round(grossEstate),
    rrspRrifBalance: Math.round(rrspRrifValue),
    tfsaBalance: Math.round(tfsaValue),
    nonRegBalance: Math.round(nonRegValue),
    otherBalance: Math.round(otherValue),
    realEstateValue: Math.round(realEstateValue),
    realEstateExcluded,
    excludedRealEstateValue: realEstateExcluded ? Math.round(s.realEstateValue) : 0,
    rrspRrifDeemed: Math.round(rrspRrifDeemed),
    deemedIncomeTax: Math.round(rrspTax),
    capitalGainsTax: Math.round(capGainsTax),
    probateFees: Math.round(probateFees),
    totalEstateTax: Math.round(totalEstateTax),
    netToHeirs: Math.round(netToHeirs),
    breakdown,
    distribution,
  };
}
