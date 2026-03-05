/**
 * Tests for couple-mode audit and AI context fixes (Issues 1–5).
 * Verifies per-person tax verification, spouse balances in net worth,
 * surplus handling, per-person OAS clawback, and AI context fields.
 */
import { describe, it, expect } from 'vitest';
import { projectScenario } from '../src/engines/projectionEngine.js';
import { createDefaultScenario } from '../src/constants/defaults.js';
import { auditTaxVerification } from '../src/engines/auditTaxDebt.js';
import { auditDashboardSummary } from '../src/engines/auditDashboard.js';
import { auditCppOasVerification } from '../src/engines/auditProjection.js';
import { buildDashboardAiData, buildEstateAiData } from '../src/utils/buildAiData.js';

// -- Couple persona -----------------------------------------------------------

function coupleScenario() {
  return {
    ...createDefaultScenario('TestCouple'),
    currentAge: 57, retirementAge: 62, lifeExpectancy: 92,
    isCouple: true, spouseAge: 54, spouseRetirementAge: 60,
    stillWorking: true, employmentIncome: 180000,
    spouseStillWorking: true, spouseEmploymentIncome: 95000,
    rrspBalance: 420000, tfsaBalance: 145000,
    spouseRrspBalance: 185000, spouseTfsaBalance: 95000,
    nonRegInvestments: 350000, nonRegCostBasis: 210000,
    cppMonthly: 950, cppStartAge: 62, oasMonthly: 713, oasStartAge: 67,
    spouseCppMonthly: 700, spouseCppStartAge: 65,
    spouseOasMonthly: 713, spouseOasStartAge: 65,
    pensionType: 'dc', dcPensionBalance: 210000, liraBalance: 68000,
    spousePensionType: 'none',
    monthlyExpenses: 7800, expenseReductionAtRetirement: 0.15,
    realReturn: 0.045, inflationRate: 0.025,
    mortgageBalance: 165000, mortgageRate: 0.0489, mortgageYearsLeft: 8,
    consumerDebt: 12000, consumerDebtRate: 0.0699, consumerDebtPayoffAge: 65,
    withdrawalOrder: ['nonReg', 'rrsp', 'tfsa', 'other'],
    rrspMeltdownEnabled: true, rrspMeltdownStartAge: 62,
    rrspMeltdownTargetAge: 71, rrspMeltdownAnnual: 40000,
    cashSavings: 85000, otherAssets: 30000,
    realEstateValue: 980000, realEstateIsPrimary: true,
    hasWill: true, primaryBeneficiary: 'spouse',
  };
}

// High-income surplus scenario (income > expenses, zero portfolio withdrawals)
function surplusScenario() {
  return {
    ...createDefaultScenario('SurplusTest'),
    currentAge: 65, retirementAge: 65, lifeExpectancy: 90,
    rrspBalance: 500000, tfsaBalance: 100000,
    nonRegInvestments: 200000, nonRegCostBasis: 120000,
    cppMonthly: 1365, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
    pensionType: 'db', dbPensionAnnual: 40000, dbPensionStartAge: 65,
    monthlyExpenses: 2500, // Low enough that income covers everything
    realReturn: 0.04, inflationRate: 0.025,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0,
  };
}

// -- Issue 1: Tax verification shows per-person for couples -------------------

describe('Issue 1: Couple tax verification', () => {
  it('shows Primary and Spouse labels for couple scenario', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const md = auditTaxVerification(s, proj);
    expect(md).toContain('Primary');
    expect(md).toContain('Spouse');
  });

  it('does not show MISMATCH for couple scenario', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const md = auditTaxVerification(s, proj);
    expect(md).not.toContain('MISMATCH');
  });

  it('keeps single-person format for non-couple scenario', () => {
    const s = surplusScenario();
    const proj = projectScenario(s);
    const md = auditTaxVerification(s, proj);
    expect(md).toContain('Worked Example:');
    expect(md).not.toContain('Primary');
    expect(md).not.toContain('Spouse');
  });
});

// -- Issue 2: Net worth includes spouse balances ------------------------------

describe('Issue 2: Couple net worth includes spouse balances', () => {
  it('shows Spouse RRSP and Spouse TFSA rows for couple', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const md = auditDashboardSummary(s, proj);
    expect(md).toContain('Spouse RRSP');
    expect(md).toContain('Spouse TFSA');
  });

  it('does not show spouse rows for single scenario', () => {
    const s = surplusScenario();
    const proj = projectScenario(s);
    const md = auditDashboardSummary(s, proj);
    expect(md).not.toContain('Spouse RRSP');
    expect(md).not.toContain('Spouse TFSA');
  });
});

// -- Issue 3: Surplus handling ------------------------------------------------

describe('Issue 3: Shortfall shows surplus when no withdrawals', () => {
  it('shows surplus label when income covers expenses', () => {
    const s = surplusScenario();
    const proj = projectScenario(s);
    const md = auditDashboardSummary(s, proj);
    // When totalWd is 0, should show surplus indicator
    const retRow = proj.find(r => r.age === s.retirementAge);
    const totalWd = (retRow?.rrspWithdrawal || 0) + (retRow?.tfsaWithdrawal || 0)
      + (retRow?.nonRegWithdrawal || 0) + (retRow?.otherWithdrawal || 0);
    if (totalWd === 0) {
      expect(md).toContain('surplus');
      expect(md).toContain('N/A');
    }
  });

  it('shows funded-from source when there is a shortfall', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const md = auditDashboardSummary(s, proj);
    // Couple scenario has withdrawals so should show sources
    expect(md).toContain('Funded from');
  });
});

// -- Issue 4: Per-person OAS clawback -----------------------------------------

describe('Issue 4: Couple OAS clawback is per-person', () => {
  it('shows separate Primary and Spouse clawback checks', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const md = auditCppOasVerification(s, proj);
    expect(md).toContain('OAS Clawback Check (Primary)');
    expect(md).toContain('OAS Clawback Check (Spouse)');
  });

  it('shows spouse CPP section for couple', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const md = auditCppOasVerification(s, proj);
    expect(md).toContain('CPP Calculation (Primary)');
    expect(md).toContain('CPP Calculation (Spouse)');
  });

  it('shows spouse OAS section for couple', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const md = auditCppOasVerification(s, proj);
    expect(md).toContain('OAS Calculation (Primary)');
    expect(md).toContain('OAS Calculation (Spouse)');
  });

  it('keeps single clawback check for non-couple', () => {
    const s = surplusScenario();
    const proj = projectScenario(s);
    const md = auditCppOasVerification(s, proj);
    expect(md).toContain('OAS Clawback Check');
    expect(md).not.toContain('OAS Clawback Check (Primary)');
    expect(md).not.toContain('CPP Calculation (Spouse)');
  });
});

// -- Issue 5: AI context has per-person income --------------------------------

describe('Issue 5: AI context per-person income and clawback', () => {
  it('includes primaryIncomeAtRetirement and spouseIncomeAtRetirement for couple', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const data = buildDashboardAiData(s, proj);
    expect(data).toHaveProperty('primaryIncomeAtRetirement');
    expect(data).toHaveProperty('spouseIncomeAtRetirement');
    expect(typeof data.primaryIncomeAtRetirement).toBe('number');
    expect(typeof data.spouseIncomeAtRetirement).toBe('number');
  });

  it('per-person incomes approximately sum to annualIncome', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const data = buildDashboardAiData(s, proj);
    // annualIncome includes non-taxable + withdrawals, so it may be slightly higher
    // but primaryIncome + spouseIncome should be close to totalTaxableIncome
    const retRow = proj.find(r => r.age === s.retirementAge);
    const sumPerPerson = data.primaryIncomeAtRetirement + data.spouseIncomeAtRetirement;
    expect(sumPerPerson).toBeCloseTo(retRow.totalTaxableIncome, -1);
  });

  it('includes OAS clawback amounts for couple (not old triggered flags)', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const data = buildDashboardAiData(s, proj);
    expect(data).toHaveProperty('primaryOasClawbackAmount');
    expect(data).toHaveProperty('spouseOasClawbackAmount');
    expect(data).toHaveProperty('primaryOasAtRetirement');
    expect(data).toHaveProperty('spouseOasAtRetirement');
    expect(typeof data.primaryOasClawbackAmount).toBe('number');
    expect(typeof data.spouseOasClawbackAmount).toBe('number');
    // Old lifetime flags must be gone
    expect(data).not.toHaveProperty('primaryOasClawbackTriggered');
    expect(data).not.toHaveProperty('spouseOasClawbackTriggered');
    expect(data).not.toHaveProperty('oasClawbackTriggered');
  });

  it('includes OAS clawback amount for single (not old triggered flag)', () => {
    const s = surplusScenario();
    const proj = projectScenario(s);
    const data = buildDashboardAiData(s, proj);
    expect(data).toHaveProperty('primaryOasAtRetirement');
    expect(data).toHaveProperty('primaryOasClawbackAmount');
    expect(data).not.toHaveProperty('oasClawbackTriggered');
    expect(data).not.toHaveProperty('spouseOasClawbackAmount');
  });
});

// -- Issue 6: Today's-dollar portfolio values and estate tax breakdown ---------

describe('Issue 6: Today\'s-dollar portfolio values in AI context', () => {
  it('includes portfolioAtRetirementToday and portfolioAtEndToday', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const data = buildDashboardAiData(s, proj);
    expect(data).toHaveProperty('portfolioAtRetirementToday');
    expect(data).toHaveProperty('portfolioAtEndToday');
    expect(typeof data.portfolioAtRetirementToday).toBe('number');
    expect(typeof data.portfolioAtEndToday).toBe('number');
    // Today's dollars should be less than future dollars (positive inflation)
    expect(data.portfolioAtRetirementToday).toBeLessThanOrEqual(data.portfolioAtRetirement);
    expect(data.portfolioAtEndToday).toBeLessThanOrEqual(data.portfolioAtEnd);
  });

  it('today\'s-dollar values are correctly deflated', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const data = buildDashboardAiData(s, proj);
    const yearsToRet = s.retirementAge - s.currentAge;
    const inf = s.inflationRate;
    const expected = Math.round(data.portfolioAtRetirement / Math.pow(1 + inf, yearsToRet));
    expect(data.portfolioAtRetirementToday).toBe(expected);
  });
});

describe('Issue 7: Estate AI context includes tax breakdown', () => {
  it('includes deemedIncomeTax, capitalGainsTax, probateFees', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const data = buildEstateAiData(s, proj);
    expect(data).toHaveProperty('deemedIncomeTax');
    expect(data).toHaveProperty('capitalGainsTax');
    expect(data).toHaveProperty('probateFees');
    expect(data).toHaveProperty('deemedIncomeTaxToday');
    expect(data).toHaveProperty('capitalGainsTaxToday');
    expect(data).toHaveProperty('probateFeesToday');
  });

  it('deemedIncomeTax is 0 with spousal rollover', () => {
    const s = coupleScenario();
    // Couple scenario has primaryBeneficiary: 'spouse' → spousal rollover
    expect(s.primaryBeneficiary).toBe('spouse');
    const proj = projectScenario(s);
    const data = buildEstateAiData(s, proj);
    expect(data.deemedIncomeTax).toBe(0);
  });

  it('tax breakdown sums to approximately totalTax', () => {
    const s = coupleScenario();
    const proj = projectScenario(s);
    const data = buildEstateAiData(s, proj);
    const sum = data.deemedIncomeTax + data.capitalGainsTax + data.probateFees;
    // Each component is independently rounded, so allow ±1 rounding difference
    expect(Math.abs(sum - data.totalTax)).toBeLessThanOrEqual(1);
  });
});
