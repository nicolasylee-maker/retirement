/**
 * Monthly savings → RRSP contribution allocation.
 * Pure function, no React imports.
 */
import { RRSP_PARAMS } from '../constants/taxTables.js';

/**
 * Compute RRSP contributions from monthly savings target.
 *
 * @param {object} opts
 * @param {number} opts.targetSavings   Annual savings target (inflation-adjusted)
 * @param {number} opts.employmentIncome Primary employment income this year
 * @param {number} opts.spouseEmploymentIncome Spouse employment income this year
 * @param {number} opts.rrspContribRoom  Primary RRSP contribution room
 * @param {number} opts.spouseRrspContribRoom Spouse RRSP contribution room
 * @param {boolean} opts.isCouple       Whether couple mode
 * @param {boolean} opts.spouseRetired  Whether spouse is retired
 * @returns {{ rrspContrib: number, spouseRrspContrib: number }}
 */
export function allocateRrspContributions({
  targetSavings,
  employmentIncome,
  spouseEmploymentIncome,
  rrspContribRoom,
  spouseRrspContribRoom,
  isCouple,
  spouseRetired,
}) {
  if (targetSavings <= 0) return { rrspContrib: 0, spouseRrspContrib: 0 };

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
    // No employment but still working — single allocation
    rrspContrib = Math.min(targetSavings, RRSP_PARAMS.annualLimit, Math.max(0, rrspContribRoom));
  }

  return { rrspContrib, spouseRrspContrib };
}

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
 * Reduces RRSP contributions if surplus is deeply negative.
 *
 * @param {number} surplus        Current surplus after RRSP outflow
 * @param {number} rrspContrib    Primary RRSP contribution
 * @param {number} spouseRrspContrib Spouse RRSP contribution
 * @param {number} afterTaxIncome After-tax income
 * @param {number} expenses       Annual expenses
 * @param {number} debtPayments   Annual debt payments
 * @returns {{ rrspContrib: number, spouseRrspContrib: number, surplus: number }}
 */
export function applyAffordabilityCap(surplus, rrspContrib, spouseRrspContrib, afterTaxIncome, expenses, debtPayments) {
  if (surplus >= -50 || (rrspContrib <= 0 && spouseRrspContrib <= 0)) {
    return { rrspContrib, spouseRrspContrib, surplus };
  }

  const overSpend = -surplus;
  const curTotal = rrspContrib + spouseRrspContrib;
  const reduction = Math.min(overSpend, curTotal);

  if (curTotal > 0) {
    const keepRatio = Math.max(0, (curTotal - reduction) / curTotal);
    rrspContrib = Math.round(rrspContrib * keepRatio);
    spouseRrspContrib = Math.round(spouseRrspContrib * keepRatio);
    surplus = afterTaxIncome - expenses - debtPayments - rrspContrib - spouseRrspContrib;
  }

  return { rrspContrib, spouseRrspContrib, surplus };
}
