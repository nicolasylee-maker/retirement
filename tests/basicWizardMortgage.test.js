/**
 * Tests for basic wizard mortgage disclosure feature.
 *
 * Covers:
 *  1. backSolveMortgageBalance — new utility function
 *  2. Projection accuracy: mortgage-inclusive expenses vs. disclosed mortgage
 */

import { describe, it, expect } from 'vitest';
import { backSolveMortgageBalance } from '../src/utils/debtCalc.js';
import { projectScenario } from '../src/engines/projectionEngine.js';

// ---------------------------------------------------------------------------
// 1. backSolveMortgageBalance
// ---------------------------------------------------------------------------

describe('backSolveMortgageBalance', () => {
  it('returns 0 for zero or negative monthly payment', () => {
    expect(backSolveMortgageBalance(0, 20)).toBe(0);
    expect(backSolveMortgageBalance(-500, 20)).toBe(0);
    expect(backSolveMortgageBalance(null, 20)).toBe(0);
  });

  it('returns 0 for zero or negative years', () => {
    expect(backSolveMortgageBalance(2000, 0)).toBe(0);
    expect(backSolveMortgageBalance(2000, -5)).toBe(0);
  });

  it('back-solves to a balance that reproduces approximately the same monthly payment', () => {
    // $2,000/mo, 20 years @ 5% → back-solve balance, then re-derive payment
    const monthlyPayment = 2000;
    const years = 20;
    const rate = 0.05;
    const balance = backSolveMortgageBalance(monthlyPayment, years);
    // Re-derive annual payment from solved balance
    const annualPayment = balance * (rate * Math.pow(1 + rate, years)) / (Math.pow(1 + rate, years) - 1);
    const derivedMonthly = annualPayment / 12;
    // Should be within $5/mo of original (rounding only)
    expect(Math.abs(derivedMonthly - monthlyPayment)).toBeLessThan(5);
  });

  it('produces a reasonable balance for a typical Canadian mortgage', () => {
    // $2,640/mo (≈ $400K @ 5%, 20yr) → should back-solve to ~$390–410K
    const balance = backSolveMortgageBalance(2640, 20);
    expect(balance).toBeGreaterThan(380000);
    expect(balance).toBeLessThan(420000);
  });

  it('larger monthly payment → larger balance', () => {
    const small = backSolveMortgageBalance(1500, 15);
    const large = backSolveMortgageBalance(3000, 15);
    expect(large).toBeGreaterThan(small);
  });

  it('more years remaining → larger balance for same payment', () => {
    const short = backSolveMortgageBalance(2000, 10);
    const long  = backSolveMortgageBalance(2000, 25);
    expect(long).toBeGreaterThan(short);
  });
});

// ---------------------------------------------------------------------------
// 2. Projection accuracy — mortgage disclosure effect
// ---------------------------------------------------------------------------

describe('basic wizard mortgage disclosure — projection impact', () => {
  // Baseline scenario: 45yo, retires at 65, life exp 90
  // Monthly expenses entered as $7,000 (includes $2,640/mo mortgage, 20 yrs left)
  const base = {
    currentAge: 45,
    retirementAge: 65,
    lifeExpectancy: 90,
    province: 'ON',
    monthlyExpenses: 7000,
    rrspBalance: 200000,
    tfsaBalance: 50000,
    nonRegInvestments: 0,
    employmentIncome: 90000,
    stillWorking: true,
    cppMonthly: 900,
    oasMonthly: 713,
    realReturn: 0.04,
    tfsaReturn: 0.04,
    nonRegReturn: 0.04,
    inflationRate: 0.025,
    expenseReductionAtRetirement: 0,
  };

  const monthlyMortgagePayment = 2640;
  const mortgageYearsLeft = 20; // paid off exactly at retirement (age 65)

  it('without mortgage disclosure: engine treats $7,000 as permanent retirement spend', () => {
    const rows = projectScenario(base);
    const retirementRow = rows.find(r => r.age === 65);
    // expenses in retirement should be ~$7,000 * 12 * inflationFactor
    // at 2.5% inflation over 20 years: factor ≈ 1.638
    const expectedAnnual = 7000 * 12 * Math.pow(1.025, 20);
    expect(retirementRow.expenses).toBeCloseTo(expectedAnnual, -3);
  });

  it('with mortgage disclosure: retirement expenses drop by the mortgage amount', () => {
    const balance = backSolveMortgageBalance(monthlyMortgagePayment, mortgageYearsLeft);
    const disclosed = {
      ...base,
      mortgageBalance: balance,
      mortgageRate: 0.05,
      mortgageYearsLeft,
      expensesIncludeDebt: true,
    };
    const rows = projectScenario(disclosed);
    const retirementRow = rows.find(r => r.age === 65);
    // After payoff, debtPayments = 0 AND the base expenses exclude the mortgage payment
    // so effective retirement spend ≈ (7000 - 2640) * 12 * inflationFactor
    const expectedAnnual = (7000 - monthlyMortgagePayment) * 12 * Math.pow(1.025, 20);
    expect(retirementRow.expenses).toBeCloseTo(expectedAnnual, -3);
  });

  it('with disclosure: pre-retirement years carry debtPayments on top of adjusted expenses', () => {
    const balance = backSolveMortgageBalance(monthlyMortgagePayment, mortgageYearsLeft);
    const disclosed = {
      ...base,
      mortgageBalance: balance,
      mortgageRate: 0.05,
      mortgageYearsLeft,
      expensesIncludeDebt: true,
    };
    const rows = projectScenario(disclosed);
    // At age 45 (first year), debtPayments should be roughly $2,640 * 12 = ~$31,680
    const firstRow = rows.find(r => r.age === 45);
    expect(firstRow.debtPayments).toBeGreaterThan(28000);
    expect(firstRow.debtPayments).toBeLessThan(36000);
  });

  it('with disclosure: mortgage debt zeroes out at payoff age', () => {
    const balance = backSolveMortgageBalance(monthlyMortgagePayment, mortgageYearsLeft);
    const disclosed = {
      ...base,
      mortgageBalance: balance,
      mortgageRate: 0.05,
      mortgageYearsLeft,
      expensesIncludeDebt: true,
    };
    const rows = projectScenario(disclosed);
    // At payoff age (65) and after, mortgageBalance should be 0
    const atPayoff = rows.find(r => r.age === 65);
    expect(atPayoff.mortgageBalance).toBe(0);
    expect(atPayoff.debtPayments).toBe(0);
  });

  it('disclosure produces a better (higher) portfolio mid-retirement', () => {
    // Use a well-funded scenario so neither plan fully depletes — difference stays visible at age 80
    const richBase = { ...base, rrspBalance: 900000, tfsaBalance: 200000 };

    const rowsUndisclosed = projectScenario(richBase);
    const at80Undisclosed = rowsUndisclosed.find(r => r.age === 80);

    const balance = backSolveMortgageBalance(monthlyMortgagePayment, mortgageYearsLeft);
    const disclosed = {
      ...richBase,
      mortgageBalance: balance,
      mortgageRate: 0.05,
      mortgageYearsLeft,
      expensesIncludeDebt: true,
    };
    const rowsDisclosed = projectScenario(disclosed);
    const at80Disclosed = rowsDisclosed.find(r => r.age === 80);

    // Disclosed plan withdraws ~$31K/yr less in retirement → larger portfolio at 80
    expect(at80Disclosed.totalPortfolio).toBeGreaterThan(at80Undisclosed.totalPortfolio);
  });

  it('mortgage extending into retirement: debtPayments persist past retirement age', () => {
    // 45yo, retires at 60, but mortgage runs 25 years (paid off at 70)
    const balance = backSolveMortgageBalance(2000, 25);
    const s = {
      ...base,
      retirementAge: 60,
      mortgageBalance: balance,
      mortgageRate: 0.05,
      mortgageYearsLeft: 25,
      expensesIncludeDebt: true,
    };
    const rows = projectScenario(s);
    const age62 = rows.find(r => r.age === 62); // 2 yrs into retirement, mortgage still active
    expect(age62.debtPayments).toBeGreaterThan(0);
    const age71 = rows.find(r => r.age === 71); // after payoff
    expect(age71.debtPayments).toBe(0);
  });
});
