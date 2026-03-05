/**
 * Shared helpers for splitting couple projection data into per-person values.
 * Used by audit engines and AI context builder.
 */

/**
 * Extract per-person taxable income and spouse age from a projection row.
 * @param {object} row  A single projection row
 * @param {object} scenario  The scenario object
 * @returns {{ primaryTaxable: number, spouseTaxable: number, spouseAge: number }}
 */
export function splitCoupleIncome(row, scenario) {
  const spouseTaxable = (row.spouseEmploymentIncome || 0)
    + (row.spouseCppIncome || 0)
    + (row.spouseOasIncome || 0)
    + (row.spousePensionIncome || 0)
    + (row.spouseRrspWithdrawal || 0);
  const primaryTaxable = (row.totalTaxableIncome || 0) - spouseTaxable;
  const spouseAge = row.age + ((scenario.spouseAge || scenario.currentAge) - scenario.currentAge);
  return { primaryTaxable, spouseTaxable, spouseAge };
}
