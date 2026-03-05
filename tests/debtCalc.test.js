import { describe, it, expect } from 'vitest';
import { calcAnnualPayment, calcTotalMonthlyDebt } from '../src/utils/debtCalc.js';

describe('calcAnnualPayment', () => {
  it('returns 0 for zero or negative balance', () => {
    expect(calcAnnualPayment(0, 0.05, 10)).toBe(0);
    expect(calcAnnualPayment(-100, 0.05, 10)).toBe(0);
    expect(calcAnnualPayment(null, 0.05, 10)).toBe(0);
  });

  it('returns 0 for zero or negative years', () => {
    expect(calcAnnualPayment(100000, 0.05, 0)).toBe(0);
    expect(calcAnnualPayment(100000, 0.05, -5)).toBe(0);
  });

  it('handles zero interest rate (simple division)', () => {
    expect(calcAnnualPayment(120000, 0, 10)).toBeCloseTo(12000, 0);
    expect(calcAnnualPayment(60000, 0, 5)).toBeCloseTo(12000, 0);
  });

  it('computes correct PMT for standard mortgage', () => {
    // $300,000 @ 5% over 25 years → annual payment ~$21,284
    const annual = calcAnnualPayment(300000, 0.05, 25);
    expect(annual).toBeCloseTo(21284, -1);
  });

  it('computes correct PMT for consumer debt', () => {
    // $20,000 @ 8% over 5 years → annual payment ~$5,009
    const annual = calcAnnualPayment(20000, 0.08, 5);
    expect(annual).toBeCloseTo(5009, -1);
  });
});

describe('calcTotalMonthlyDebt', () => {
  it('returns all zeros for a scenario with no debt', () => {
    const s = { currentAge: 60, mortgageBalance: 0, consumerDebt: 0, otherDebt: 0 };
    const result = calcTotalMonthlyDebt(s);
    expect(result.mortgage).toBe(0);
    expect(result.consumer).toBe(0);
    expect(result.other).toBe(0);
    expect(result.totalMonthly).toBe(0);
    expect(result.totalAnnual).toBe(0);
  });

  it('computes mortgage payment only', () => {
    const s = {
      currentAge: 60,
      mortgageBalance: 300000,
      mortgageRate: 0.05,
      mortgageYearsLeft: 25,
      consumerDebt: 0,
      otherDebt: 0,
    };
    const result = calcTotalMonthlyDebt(s);
    expect(result.mortgage).toBeGreaterThan(0);
    expect(result.consumer).toBe(0);
    expect(result.other).toBe(0);
    expect(result.totalMonthly).toBe(result.mortgage);
  });

  it('computes all three debt types', () => {
    const s = {
      currentAge: 55,
      mortgageBalance: 200000,
      mortgageRate: 0.05,
      mortgageYearsLeft: 20,
      consumerDebt: 15000,
      consumerDebtRate: 0.08,
      consumerDebtPayoffAge: 65,
      otherDebt: 10000,
      otherDebtRate: 0.05,
      otherDebtPayoffAge: 70,
    };
    const result = calcTotalMonthlyDebt(s);
    expect(result.mortgage).toBeGreaterThan(0);
    expect(result.consumer).toBeGreaterThan(0);
    expect(result.other).toBeGreaterThan(0);
    // Individual amounts are rounded, so totalMonthly (also rounded from the sum of unrounded)
    // may differ by 1-2 from the sum of individually rounded values
    expect(Math.abs(result.totalMonthly - (result.mortgage + result.consumer + result.other))).toBeLessThanOrEqual(2);
  });

  it('uses default rates when not specified', () => {
    const s = {
      currentAge: 60,
      mortgageBalance: 100000,
      mortgageYearsLeft: 10,
      consumerDebt: 0,
      otherDebt: 0,
    };
    // Should use default rate of 0.05
    const result = calcTotalMonthlyDebt(s);
    expect(result.mortgage).toBeGreaterThan(0);
  });
});
