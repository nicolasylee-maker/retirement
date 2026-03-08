/**
 * Monthly savings → RRSP / TFSA / NonReg contribution allocation (cascade).
 * Pure function, no React imports.
 */
import { RRSP_PARAMS } from '../constants/taxTables.js';

/**
 * Allocate monthly savings across accounts: RRSP first, then TFSA, then NonReg.
 *
 * @param {object} opts
 * @param {number} opts.targetSavings   Annual savings target (inflation-adjusted)
 * @param {number} opts.employmentIncome Primary employment income this year
 * @param {number} opts.spouseEmploymentIncome Spouse employment income this year
 * @param {number} opts.rrspContribRoom  Primary RRSP contribution room
 * @param {number} opts.spouseRrspContribRoom Spouse RRSP contribution room
 * @param {number} opts.tfsaContribRoom  Primary TFSA contribution room
 * @param {number} opts.spouseTfsaContribRoom Spouse TFSA contribution room
 * @param {boolean} opts.isCouple       Whether couple mode
 * @param {boolean} opts.spouseRetired  Whether spouse is retired
 * @returns {{ rrspContrib: number, spouseRrspContrib: number, tfsaContrib: number, spouseTfsaContrib: number, nonRegContrib: number }}
 */
export function allocateSavings({
  targetSavings,
  employmentIncome,
  spouseEmploymentIncome,
  rrspContribRoom,
  spouseRrspContribRoom,
  tfsaContribRoom = 0,
  spouseTfsaContribRoom = 0,
  isCouple,
  spouseRetired,
}) {
  const zero = { rrspContrib: 0, spouseRrspContrib: 0, tfsaContrib: 0, spouseTfsaContrib: 0, nonRegContrib: 0 };
  if (targetSavings <= 0) return zero;

  // --- Step 1: RRSP allocation (existing logic) ---
  let rrspContrib = 0;
  let spouseRrspContrib = 0;
  const totalEmployment = employmentIncome + spouseEmploymentIncome;

  if (totalEmployment > 0) {
    const primaryShare = employmentIncome / totalEmployment;
    const primaryTarget = targetSavings * primaryShare;
    const spouseTarget = targetSavings - primaryTarget;

    rrspContrib = Math.min(primaryTarget, RRSP_PARAMS.annualLimit, Math.max(0, rrspContribRoom));
    if (isCouple && !spouseRetired && spouseEmploymentIncome > 0) {
      spouseRrspContrib = Math.min(spouseTarget, RRSP_PARAMS.annualLimit, Math.max(0, spouseRrspContribRoom));
    }

    // Overflow from capped spouse goes back to primary (up to cap)
    const spouseOverflow = spouseTarget - spouseRrspContrib;
    if (spouseOverflow > 0) {
      const extraPrimary = Math.min(
        spouseOverflow,
        RRSP_PARAMS.annualLimit - rrspContrib,
        Math.max(0, rrspContribRoom - rrspContrib),
      );
      rrspContrib += extraPrimary;
    }
  } else {
    rrspContrib = Math.min(targetSavings, RRSP_PARAMS.annualLimit, Math.max(0, rrspContribRoom));
  }

  // --- Step 2: TFSA cascade (remainder after RRSP) ---
  let remainder = targetSavings - rrspContrib - spouseRrspContrib;
  let tfsaContrib = 0;
  let spouseTfsaContrib = 0;

  if (remainder > 0) {
    if (isCouple && totalEmployment > 0) {
      const primaryShare = employmentIncome / totalEmployment;
      const primaryTfsaTarget = remainder * primaryShare;
      const spouseTfsaTarget = remainder - primaryTfsaTarget;

      tfsaContrib = Math.min(primaryTfsaTarget, Math.max(0, tfsaContribRoom));
      spouseTfsaContrib = Math.min(spouseTfsaTarget, Math.max(0, spouseTfsaContribRoom));

      // Spouse TFSA overflow → primary TFSA (up to remaining room)
      const spouseTfsaOverflow = spouseTfsaTarget - spouseTfsaContrib;
      if (spouseTfsaOverflow > 0) {
        const extra = Math.min(spouseTfsaOverflow, Math.max(0, tfsaContribRoom - tfsaContrib));
        tfsaContrib += extra;
      }

      // Primary TFSA overflow → spouse TFSA (up to remaining room)
      const primaryTfsaOverflow = primaryTfsaTarget - Math.min(primaryTfsaTarget, Math.max(0, tfsaContribRoom));
      if (primaryTfsaOverflow > 0) {
        const extra = Math.min(primaryTfsaOverflow, Math.max(0, spouseTfsaContribRoom - spouseTfsaContrib));
        spouseTfsaContrib += extra;
      }
    } else {
      tfsaContrib = Math.min(remainder, Math.max(0, tfsaContribRoom));
    }
  }

  // --- Step 3: NonReg (unlimited, whatever is left) ---
  const nonRegContrib = Math.max(0, remainder - tfsaContrib - spouseTfsaContrib);

  return { rrspContrib, spouseRrspContrib, tfsaContrib, spouseTfsaContrib, nonRegContrib };
}

// Keep old name as alias for backward compatibility in case any imports exist
export const allocateRrspContributions = allocateSavings;

/**
 * Cap target savings to estimated affordable cash.
 *
 * @param {number} rawTarget   Raw annual savings target
 * @param {number} grossCash   Total gross employment income
 * @param {number} expenses    Annual expenses
 * @param {number} debtPayments Annual debt payments
 * @returns {number} Capped target savings
 */
export function capToAffordable(rawTarget, grossCash, expenses, debtPayments) {
  if (rawTarget <= 0) return 0;
  const roughTax = grossCash * 0.30; // conservative 30% effective tax estimate
  const availableCash = Math.max(0, grossCash - roughTax - expenses - debtPayments);
  return Math.min(rawTarget, availableCash);
}

/**
 * Apply affordability cap after tax computation.
 * Reduces contributions if surplus is deeply negative.
 * Scale back in order: nonReg first, then TFSA, then RRSP.
 *
 * @param {number} surplus        Current surplus after all savings outflows
 * @param {number} rrspContrib    Primary RRSP contribution
 * @param {number} spouseRrspContrib Spouse RRSP contribution
 * @param {number} tfsaContrib    Primary TFSA contribution (from savings)
 * @param {number} spouseTfsaContrib Spouse TFSA contribution (from savings)
 * @param {number} nonRegContrib  NonReg contribution (from savings)
 * @param {number} afterTaxIncome After-tax income
 * @param {number} expenses       Annual expenses
 * @param {number} debtPayments   Annual debt payments
 * @returns {{ rrspContrib: number, spouseRrspContrib: number, tfsaContrib: number, spouseTfsaContrib: number, nonRegContrib: number, surplus: number }}
 */
export function applyAffordabilityCap(surplus, rrspContrib, spouseRrspContrib, tfsaContrib, spouseTfsaContrib, nonRegContrib, afterTaxIncome, expenses, debtPayments) {
  const totalContrib = rrspContrib + spouseRrspContrib + tfsaContrib + spouseTfsaContrib + nonRegContrib;
  if (surplus >= -50 || totalContrib <= 0) {
    return { rrspContrib, spouseRrspContrib, tfsaContrib, spouseTfsaContrib, nonRegContrib, surplus };
  }

  let overSpend = -surplus;

  // Scale back nonReg first
  if (nonRegContrib > 0 && overSpend > 0) {
    const cut = Math.min(overSpend, nonRegContrib);
    nonRegContrib -= cut;
    overSpend -= cut;
  }

  // Then TFSA
  if (overSpend > 0) {
    const totalTfsa = tfsaContrib + spouseTfsaContrib;
    if (totalTfsa > 0) {
      const cut = Math.min(overSpend, totalTfsa);
      const keepRatio = Math.max(0, (totalTfsa - cut) / totalTfsa);
      tfsaContrib = Math.round(tfsaContrib * keepRatio);
      spouseTfsaContrib = Math.round(spouseTfsaContrib * keepRatio);
      overSpend -= cut;
    }
  }

  // Then RRSP
  if (overSpend > 0) {
    const totalRrsp = rrspContrib + spouseRrspContrib;
    if (totalRrsp > 0) {
      const cut = Math.min(overSpend, totalRrsp);
      const keepRatio = Math.max(0, (totalRrsp - cut) / totalRrsp);
      rrspContrib = Math.round(rrspContrib * keepRatio);
      spouseRrspContrib = Math.round(spouseRrspContrib * keepRatio);
    }
  }

  surplus = afterTaxIncome - expenses - debtPayments - rrspContrib - spouseRrspContrib - tfsaContrib - spouseTfsaContrib - nonRegContrib;

  return { rrspContrib, spouseRrspContrib, tfsaContrib, spouseTfsaContrib, nonRegContrib, surplus };
}
