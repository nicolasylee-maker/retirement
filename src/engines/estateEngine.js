import {
  CAPITAL_GAINS,
  PROBATE,
  INTESTACY,
  PROVINCE_DATA,
} from '../constants/taxTables.js';
import { calcTaxOnDeemedIncome, calcTotalTax } from './taxEngine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate taxable portion of a capital gain.
 * 2025: flat 50% inclusion rate on all gains.
 * (The proposed tiered 66.67% rate was cancelled March 21, 2025.)
 * @param {number} gain  Total capital gain
 * @returns {number} Taxable portion of the gain
 */
function calcTaxableCapitalGain(gain) {
  if (gain <= 0) return 0;
  return gain * CAPITAL_GAINS.inclusionRate;
}

/**
 * Calculate probate fees for any supported province.
 * Dispatches on province JSON probate.type:
 *   "tiered"     — marginal rates per tier (ON, BC, NS, NL)
 *   "flat_tiers" — fixed fee per estate size bracket (AB, PE)
 *   "per_thousand" — flat per-$1K rate on entire estate (SK, NB)
 *   "none"       — $0 (Manitoba eliminated probate fees Nov 2020)
 *
 * @param {number} estateValue  Value of assets going through probate
 * @param {string} [provinceCode]  Province code (defaults to 'ON')
 * @returns {number} Probate fees
 */
export function calcProvincialProbateFees(estateValue, provinceCode = 'ON') {
  if (estateValue <= 0) return 0;

  const provData = PROVINCE_DATA[provinceCode] || PROVINCE_DATA.ON;
  const probate = provData.probate;

  if (!probate || probate.type === 'none') return 0;

  // Per-$1,000 flat rate (SK, NB)
  if (probate.type === 'per_thousand') {
    return estateValue * probate.ratePerThousand / 1000;
  }

  // Flat fee tiers — find the tier that contains the estate value (AB, PE)
  if (probate.type === 'flat_tiers') {
    for (const tier of probate.tiers) {
      const upTo = tier.upTo ?? Infinity;
      if (estateValue <= upTo) {
        if (tier.fee !== null && tier.fee !== undefined) return tier.fee;
        // PE: top tier uses ratePerThousandAbove above aboveThreshold
        if (tier.ratePerThousandAbove !== undefined) {
          const prevFee = probate.tiers[probate.tiers.indexOf(tier) - 1]?.fee ?? 0;
          return prevFee + (estateValue - tier.aboveThreshold) * tier.ratePerThousandAbove / 1000;
        }
        return 0;
      }
    }
    // Estate exceeds all tiers — use last tier's fee
    const last = probate.tiers[probate.tiers.length - 1];
    return last.fee ?? 0;
  }

  // Default: tiered marginal rates per bracket (ON, BC, NS, NL)
  let fee = 0;
  let prevUpTo = 0;
  for (const tier of probate.tiers) {
    if (estateValue <= prevUpTo) break;
    const tierMax = tier.upTo ?? Infinity;
    const inTier = Math.min(estateValue, tierMax) - prevUpTo;
    if (inTier > 0) {
      fee += inTier * tier.ratePerThousand / 1000;
    }
    prevUpTo = tierMax === Infinity ? Infinity : tier.upTo;
  }
  return fee;
}

/**
 * Ontario Estate Administration Tax (probate fees) — kept for backward compat.
 * Delegates to calcProvincialProbateFees('ON').
 * @param {number} estateValue  Value of assets going through probate
 * @returns {number} Probate fees
 */
function calcProbateFees(estateValue) {
  return calcProvincialProbateFees(estateValue, 'ON');
}

/**
 * Determine distribution under intestacy rules for a given province.
 * Uses the province's spousePreferentialShare and spouse fraction fields.
 *
 * @param {number} netEstate   Net estate after taxes and fees
 * @param {boolean} hasSpouse
 * @param {number} [numChildren]
 * @param {object} [intestacyData]  Province intestacy config (defaults to ON)
 * @returns {{ spouse: number, children: number, other: number }}
 */
function calcIntestacyDistribution(netEstate, hasSpouse, numChildren = 0, intestacyData = INTESTACY) {
  if (netEstate <= 0) return { spouse: 0, children: 0, other: 0 };

  if (!hasSpouse) {
    // Everything to children, or other heirs if no children
    return numChildren > 0
      ? { spouse: 0, children: netEstate, other: 0 }
      : { spouse: 0, children: 0, other: netEstate };
  }

  // Spouse gets preferential share (may be $0 for NL/PE which have no pref share)
  const prefShare = Math.min(netEstate, intestacyData.spousePreferentialShare);
  const remainder = netEstate - prefShare;

  if (numChildren === 0 || remainder <= 0) {
    return { spouse: netEstate, children: 0, other: 0 };
  }

  // Province-specific fraction: 1 child vs 2+ children
  const spouseFraction = numChildren === 1
    ? intestacyData.spouseFractionOneChild
    : intestacyData.spouseFractionMultipleChildren;
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
 * @param {object} scenario        The scenario data (scenario.province defaults to 'ON')
 * @param {Array}  projectionData  Output from projectScenario()
 * @param {number} ageAtDeath      Age at death
 * @returns {object} Estate analysis
 */
export function calcEstateImpact(scenario, projectionData, ageAtDeath) {
  // Find the projection row at or closest to death
  const row = projectionData.find(r => r.age === ageAtDeath)
    || projectionData[projectionData.length - 1];

  const s = scenario;
  const province = s.province || 'ON';
  const provData = PROVINCE_DATA[province] || PROVINCE_DATA.ON;
  const spouseRollover = s.primaryBeneficiary === 'spouse';

  // --- Asset values at death ---
  const rrspRrifValue = row.rrspBalance || 0;
  const tfsaValue = row.tfsaBalance || 0;
  const nonRegValue = row.nonRegBalance || 0;
  const otherValue = row.otherBalance || 0;
  const realEstateValue = s.includeRealEstateInEstate ? (s.realEstateValue || 0) : 0;

  // Spouse balances (couple mode only — surviving spouse's own assets)
  const spouseRrspValue = s.isCouple ? (row.spouseRrspBalance || 0) : 0;
  const spouseTfsaValue = s.isCouple ? (row.spouseTfsaBalance || 0) : 0;

  // Debts at death
  const totalDebt = (row.mortgageBalance || 0);

  // Gross estate (household total — includes spouse's surviving assets)
  const grossEstate = rrspRrifValue + tfsaValue + nonRegValue + otherValue
    + spouseRrspValue + spouseTfsaValue + realEstateValue - totalDebt;

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
  const deemedIncomeTax = calcTaxOnDeemedIncome(baseIncome, totalDeemedIncome, ageAtDeath, province);

  // Split tax between RRSP and capital gains for breakdown display
  const rrspTax = rrspRrifDeemed > 0
    ? calcTaxOnDeemedIncome(baseIncome, rrspRrifDeemed, ageAtDeath, province)
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
  const probateFees = calcProvincialProbateFees(probateableAssets, province);

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
  if (spouseRrspValue > 0) {
    breakdown.push({ label: 'Spouse RRSP/RRIF balance', amount: spouseRrspValue });
  }
  if (spouseTfsaValue > 0) {
    breakdown.push({ label: 'Spouse TFSA balance', amount: spouseTfsaValue });
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
  const probateLabel = provData.name
    ? `Probate fees (${provData.name})`
    : 'Probate fees (Ontario EAT)';
  breakdown.push({ label: probateLabel, amount: -probateFees });
  breakdown.push({ label: 'Net to heirs', amount: netToHeirs });

  // --- 9. Distribution ---
  let distribution;
  if (s.hasWill) {
    // With a will, assume primary beneficiary gets everything
    distribution = spouseRollover
      ? { spouse: netToHeirs, children: 0, other: 0 }
      : { spouse: 0, children: netToHeirs, other: 0 };
  } else {
    // Intestacy rules — province-specific
    const numChildren = s.numberOfChildren || 0;
    const intestacyData = provData.intestacy || INTESTACY;
    distribution = calcIntestacyDistribution(netToHeirs, s.isCouple, numChildren, intestacyData);
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
    spouseRrspBalance: Math.round(spouseRrspValue),
    spouseTfsaBalance: Math.round(spouseTfsaValue),
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
