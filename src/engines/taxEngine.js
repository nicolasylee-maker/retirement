import {
  FEDERAL_BRACKETS,
  ONTARIO_BRACKETS,
  ONTARIO_SURTAX,
  FEDERAL_CREDITS,
  ONTARIO_CREDITS,
  OAS_PARAMS,
  RRIF_MIN_RATES,
  PROVINCE_DATA,
} from '../constants/taxTables.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Apply marginal brackets to taxable income.
 * Returns gross tax before credits.
 */
function applyBrackets(income, brackets) {
  if (income <= 0) return 0;
  let tax = 0;
  for (const { min, max, rate } of brackets) {
    if (income <= min) break;
    const taxable = Math.min(income, max) - min;
    tax += taxable * rate;
  }
  return tax;
}

/**
 * Compute clawed-back age amount.
 * Full amount is reduced by clawbackRate for every dollar above the threshold.
 * If threshold is null (e.g. NS 2025 — no clawback), full amount is returned.
 */
function clawbackAgeAmount(income, fullAmount, threshold, rate) {
  const reduction = Math.max(0, income - (threshold ?? 0)) * (rate ?? 0);
  return Math.max(0, fullAmount - reduction);
}

// ---------------------------------------------------------------------------
// Federal Tax
// ---------------------------------------------------------------------------

/**
 * Calculate federal income tax.
 * @param {number} income  Taxable income
 * @param {object} [opts]  { age, hasPensionIncome }
 * @returns {number} Federal tax payable (>= 0)
 */
export function calcFederalTax(income, opts = {}) {
  if (income <= 0) return 0;

  const { age = 0, hasPensionIncome = false } = opts;
  const fc = FEDERAL_CREDITS;

  // Gross tax from brackets
  let tax = applyBrackets(income, FEDERAL_BRACKETS);

  // --- Non-refundable credits (reduce tax, floor at 0) ---

  // Basic personal amount
  let totalCreditable = fc.basicPersonal;

  // Age amount (65+)
  if (age >= 65) {
    const ageAmt = clawbackAgeAmount(
      income,
      fc.ageAmount,
      fc.ageIncomeThreshold,
      fc.ageClawbackRate,
    );
    totalCreditable += ageAmt;
  }

  // Pension income amount
  if (hasPensionIncome) {
    totalCreditable += fc.pensionCredit;
  }

  tax -= totalCreditable * fc.creditRate;

  return Math.max(0, tax);
}

// ---------------------------------------------------------------------------
// Provincial Tax
// ---------------------------------------------------------------------------

/**
 * Calculate provincial income tax for any supported province.
 * Handles surtax (ON only as of 2025 — PEI eliminated theirs in 2024).
 * NS special case: ageClawbackRate=0 → full age amount regardless of income.
 *
 * @param {string} province  Province code (ON, BC, AB, SK, MB, NB, NS, NL, PE)
 * @param {number} income    Taxable income
 * @param {object} [opts]    { age, hasPensionIncome }
 * @returns {number} Provincial tax payable (>= 0)
 */
export function calcProvincialTax(province, income, opts = {}) {
  if (income <= 0) return 0;

  const { age = 0, hasPensionIncome = false } = opts;
  const provData = PROVINCE_DATA[province] || PROVINCE_DATA.ON;
  const pc = provData.credits;

  // Gross tax from province brackets
  let basicTax = applyBrackets(income, provData.brackets);

  // --- Non-refundable credits ---
  let totalCreditable = pc.basicPersonal;

  if (age >= 65) {
    const ageAmt = clawbackAgeAmount(
      income,
      pc.ageAmount,
      pc.ageIncomeThreshold,  // null for NS (no clawback)
      pc.ageClawbackRate,
    );
    totalCreditable += ageAmt;
  }

  if (hasPensionIncome) {
    totalCreditable += pc.pensionCredit;
  }

  basicTax -= totalCreditable * pc.creditRate;
  basicTax = Math.max(0, basicTax);

  // --- Surtax (ON only as of 2025; skip if surtax is null) ---
  const st = provData.surtax;
  let surtax = 0;
  if (st) {
    if (basicTax > st.threshold1) {
      surtax += (basicTax - st.threshold1) * st.rate1;
    }
    if (basicTax > st.threshold2) {
      surtax += (basicTax - st.threshold2) * st.rate2;
    }
  }

  return basicTax + surtax;
}

/**
 * Calculate Ontario income tax including surtax.
 * Kept for backward compatibility — delegates to calcProvincialTax('ON').
 * @param {number} income  Taxable income
 * @param {object} [opts]  { age, hasPensionIncome }
 * @returns {number} Ontario tax payable (>= 0)
 */
export function calcOntarioTax(income, opts = {}) {
  return calcProvincialTax('ON', income, opts);
}

// ---------------------------------------------------------------------------
// Combined Tax
// ---------------------------------------------------------------------------

/**
 * Calculate combined federal + provincial tax.
 * @param {number} income            Taxable income
 * @param {number} [age]             Taxpayer age (for age-related credits)
 * @param {boolean} [hasPensionIncome]  Whether eligible pension income is received
 * @param {string} [province]        Province code (defaults to 'ON')
 * @returns {number} Total tax payable
 */
export function calcTotalTax(income, age = 0, hasPensionIncome = false, province = 'ON') {
  const opts = { age, hasPensionIncome };
  return calcFederalTax(income, opts) + calcProvincialTax(province, income, opts);
}

// ---------------------------------------------------------------------------
// OAS Clawback
// ---------------------------------------------------------------------------

/**
 * Calculate the OAS clawback (recovery tax).
 * 15% of net income above the clawback threshold.
 * Capped at the maximum OAS benefit.
 * @param {number} netIncome  Net income for OAS purposes
 * @returns {number} Amount of OAS clawed back
 */
export function calcOasClawback(netIncome) {
  if (netIncome <= OAS_PARAMS.clawbackStart) return 0;
  const clawback = (netIncome - OAS_PARAMS.clawbackStart) * OAS_PARAMS.clawbackRate;
  return Math.min(clawback, OAS_PARAMS.maxAnnual);
}

// ---------------------------------------------------------------------------
// RRIF Minimum Withdrawal
// ---------------------------------------------------------------------------

/**
 * Calculate RRIF minimum withdrawal for a given age and balance.
 * Uses the prescribed RRIF_MIN_RATES table for 71+.
 * For ages under 71, uses 1 / (90 - age).
 * @param {number} balance  RRIF/RRSP balance at start of year
 * @param {number} age      Age at start of year
 * @returns {number} Minimum withdrawal amount
 */
export function calcRrifMinimum(balance, age) {
  if (balance <= 0 || age < 0) return 0;

  let rate;
  if (age >= 95) {
    rate = RRIF_MIN_RATES[95];
  } else if (age >= 71) {
    rate = RRIF_MIN_RATES[age];
  } else {
    // Under 71: 1 / (90 - age), but guard against division by zero
    const divisor = 90 - age;
    rate = divisor > 0 ? 1 / divisor : 1;
  }

  return balance * rate;
}

// ---------------------------------------------------------------------------
// Marginal Rate (useful for estate & what-if)
// ---------------------------------------------------------------------------

/**
 * Calculate the combined marginal tax rate at a given income level.
 * @param {number} income      Taxable income
 * @param {string} [province]  Province code (defaults to 'ON')
 * @returns {number} Marginal rate as a decimal
 */
export function calcMarginalRate(income, province = 'ON') {
  if (income <= 0) return 0;

  const provData = PROVINCE_DATA[province] || PROVINCE_DATA.ON;

  // Federal marginal rate
  let fedRate = 0;
  for (const bracket of FEDERAL_BRACKETS) {
    if (income > bracket.min) fedRate = bracket.rate;
  }

  // Provincial marginal rate (before surtax)
  let provRate = 0;
  for (const bracket of provData.brackets) {
    if (income > bracket.min) provRate = bracket.rate;
  }

  // Surtax multiplier (applicable where province has surtax)
  let surtaxMultiplier = 1;
  const st = provData.surtax;
  if (st) {
    const basicProvTax = applyBrackets(income, provData.brackets);
    if (basicProvTax > st.threshold2) {
      surtaxMultiplier = 1 + st.rate1 + st.rate2;
    } else if (basicProvTax > st.threshold1) {
      surtaxMultiplier = 1 + st.rate1;
    }
  }

  return fedRate + provRate * surtaxMultiplier;
}

// ---------------------------------------------------------------------------
// Tax on deemed income (for estate calculations)
// ---------------------------------------------------------------------------

/**
 * Calculate tax on an additional lump of deemed income added to existing income.
 * Useful for estate deemed-disposition scenarios.
 * @param {number} existingIncome  Income already present
 * @param {number} deemedIncome    Additional deemed income
 * @param {number} [age]           Age at death
 * @param {string} [province]      Province code (defaults to 'ON')
 * @returns {number} Incremental tax on the deemed income
 */
export function calcTaxOnDeemedIncome(existingIncome, deemedIncome, age = 0, province = 'ON') {
  if (deemedIncome <= 0) return 0;
  const totalIncome = existingIncome + deemedIncome;
  const opts = { age, hasPensionIncome: false };
  const taxOnTotal = calcFederalTax(totalIncome, opts) + calcProvincialTax(province, totalIncome, opts);
  const taxOnBase = calcFederalTax(existingIncome, opts) + calcProvincialTax(province, existingIncome, opts);
  return Math.max(0, taxOnTotal - taxOnBase);
}
