import { describe, it, expect, vi } from 'vitest';
import { calcSustainableWithdrawal } from '../src/engines/withdrawalCalc.js';

// ---------------------------------------------------------------------------
// These tests use the real projectScenario engine (integration-style) since
// withdrawalCalc is a thin binary-search wrapper around it.
// ---------------------------------------------------------------------------

/** Well-funded retiree: large portfolio, moderate CPP/OAS */
const wellFunded = {
  currentAge: 65,
  retirementAge: 65,
  lifeExpectancy: 100,
  rrspBalance: 600000,
  tfsaBalance: 200000,
  nonRegInvestments: 300000,
  cashSavings: 0,
  nonRegCostBasis: 200000,
  otherAssets: 0,
  cppMonthly: 1200,
  cppStartAge: 65,
  oasMonthly: 700,
  oasStartAge: 65,
  pensionType: 'none',
  realReturn: 0.04,
  inflationRate: 0.02,
  monthlyExpenses: 5000,
  mortgageBalance: 0,
  consumerDebt: 0,
  otherDebt: 0,
  gisEligible: false,
  gainsEligible: false,
};

/** Under-funded retiree: tiny portfolio, low government benefits */
const underFunded = {
  currentAge: 65,
  retirementAge: 65,
  lifeExpectancy: 100,
  rrspBalance: 30000,
  tfsaBalance: 10000,
  nonRegInvestments: 5000,
  cashSavings: 0,
  nonRegCostBasis: 5000,
  otherAssets: 0,
  cppMonthly: 400,
  cppStartAge: 65,
  oasMonthly: 700,
  oasStartAge: 65,
  pensionType: 'none',
  realReturn: 0.04,
  inflationRate: 0.02,
  monthlyExpenses: 2000,
  mortgageBalance: 0,
  consumerDebt: 0,
  otherDebt: 0,
  gisEligible: false,
  gainsEligible: false,
};

/** Zero-balance retiree: no savings at all */
const zeroBal = {
  currentAge: 65,
  retirementAge: 65,
  lifeExpectancy: 100,
  rrspBalance: 0,
  tfsaBalance: 0,
  nonRegInvestments: 0,
  cashSavings: 0,
  nonRegCostBasis: 0,
  otherAssets: 0,
  cppMonthly: 0,
  cppStartAge: 65,
  oasMonthly: 0,
  oasStartAge: 65,
  pensionType: 'none',
  realReturn: 0.04,
  inflationRate: 0.02,
  monthlyExpenses: 0,
  mortgageBalance: 0,
  consumerDebt: 0,
  otherDebt: 0,
  gisEligible: false,
  gainsEligible: false,
};

// ---------------------------------------------------------------------------
// 1. Well-funded retiree
// ---------------------------------------------------------------------------
describe('Well-funded retiree', () => {
  it('finds a sustainable monthly withdrawal > $0', () => {
    const { sustainableMonthly } = calcSustainableWithdrawal(wellFunded, 95);
    expect(sustainableMonthly).toBeGreaterThan(0);
  });

  it('sustainable amount is reasonable ($2K–$15K/mo range)', () => {
    const { sustainableMonthly } = calcSustainableWithdrawal(wellFunded, 95);
    expect(sustainableMonthly).toBeGreaterThan(2000);
    expect(sustainableMonthly).toBeLessThan(15000);
  });

  it('returns a projection array', () => {
    const { projection } = calcSustainableWithdrawal(wellFunded, 95);
    expect(Array.isArray(projection)).toBe(true);
    expect(projection.length).toBeGreaterThan(0);
  });

  it('projection covers at least up to target age', () => {
    const { projection } = calcSustainableWithdrawal(wellFunded, 95);
    const lastAge = projection[projection.length - 1].age;
    expect(lastAge).toBeGreaterThanOrEqual(95);
  });

  it('higher target age yields lower sustainable withdrawal', () => {
    const r90 = calcSustainableWithdrawal(wellFunded, 90);
    const r100 = calcSustainableWithdrawal(wellFunded, 100);
    expect(r90.sustainableMonthly).toBeGreaterThan(r100.sustainableMonthly);
  });
});

// ---------------------------------------------------------------------------
// 2. Under-funded retiree
// ---------------------------------------------------------------------------
describe('Under-funded retiree', () => {
  it('finds a sustainable withdrawal that is positive', () => {
    const { sustainableMonthly } = calcSustainableWithdrawal(underFunded, 95);
    expect(sustainableMonthly).toBeGreaterThan(0);
  });

  it('sustainable amount is lower than well-funded retiree', () => {
    const well = calcSustainableWithdrawal(wellFunded, 95);
    const under = calcSustainableWithdrawal(underFunded, 95);
    expect(under.sustainableMonthly).toBeLessThan(well.sustainableMonthly);
  });

  it('sustainable amount is modest (under $5K/mo)', () => {
    const { sustainableMonthly } = calcSustainableWithdrawal(underFunded, 95);
    expect(sustainableMonthly).toBeLessThan(5000);
  });
});

// ---------------------------------------------------------------------------
// 3. Zero-balance retiree
// ---------------------------------------------------------------------------
describe('Zero-balance retiree', () => {
  it('returns $0 sustainable withdrawal', () => {
    const { sustainableMonthly } = calcSustainableWithdrawal(zeroBal, 95);
    expect(sustainableMonthly).toBe(0);
  });

  it('still returns a projection array', () => {
    const { projection } = calcSustainableWithdrawal(zeroBal, 95);
    expect(Array.isArray(projection)).toBe(true);
    expect(projection.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Overrides modify the calculation
// ---------------------------------------------------------------------------
describe('Overrides', () => {
  it('overriding with higher realReturn increases sustainable withdrawal', () => {
    const base = calcSustainableWithdrawal(wellFunded, 95);
    const boosted = calcSustainableWithdrawal(wellFunded, 95, { realReturn: 0.07 });
    expect(boosted.sustainableMonthly).toBeGreaterThan(base.sustainableMonthly);
  });

  it('overriding with negative returns reduces sustainable withdrawal', () => {
    const base = calcSustainableWithdrawal(wellFunded, 95);
    const negReturn = calcSustainableWithdrawal(wellFunded, 95, { realReturn: -0.02 });
    expect(negReturn.sustainableMonthly).toBeLessThan(base.sustainableMonthly);
  });

  it('overriding inflationRate affects the result', () => {
    const low = calcSustainableWithdrawal(wellFunded, 95, { inflationRate: 0.01 });
    const high = calcSustainableWithdrawal(wellFunded, 95, { inflationRate: 0.05 });
    expect(low.sustainableMonthly).toBeGreaterThan(high.sustainableMonthly);
  });
});

// ---------------------------------------------------------------------------
// 5. Default targetAge
// ---------------------------------------------------------------------------
describe('Default target age', () => {
  it('defaults to targetAge 95 when omitted', () => {
    const explicit = calcSustainableWithdrawal(wellFunded, 95);
    const implicit = calcSustainableWithdrawal(wellFunded);
    expect(implicit.sustainableMonthly).toBe(explicit.sustainableMonthly);
  });
});

// ---------------------------------------------------------------------------
// 6. Return value structure
// ---------------------------------------------------------------------------
describe('Return value structure', () => {
  it('returns { sustainableMonthly, projection }', () => {
    const result = calcSustainableWithdrawal(wellFunded, 95);
    expect(result).toHaveProperty('sustainableMonthly');
    expect(result).toHaveProperty('projection');
    expect(typeof result.sustainableMonthly).toBe('number');
    expect(Array.isArray(result.projection)).toBe(true);
  });

  it('sustainableMonthly is an integer (floor rounding)', () => {
    const { sustainableMonthly } = calcSustainableWithdrawal(wellFunded, 95);
    expect(sustainableMonthly).toBe(Math.floor(sustainableMonthly));
  });

  it('projection rows have expected fields', () => {
    const { projection } = calcSustainableWithdrawal(wellFunded, 95);
    const row = projection[0];
    expect(row).toHaveProperty('age');
    expect(row).toHaveProperty('rrspBalance');
    expect(row).toHaveProperty('tfsaBalance');
    expect(row).toHaveProperty('totalPortfolio');
    expect(row).toHaveProperty('surplus');
  });
});

// ---------------------------------------------------------------------------
// 7. Monotonicity / sanity
// ---------------------------------------------------------------------------
describe('Monotonicity sanity checks', () => {
  it('adding more RRSP never reduces sustainable withdrawal', () => {
    const base = calcSustainableWithdrawal(wellFunded, 95);
    const moreRrsp = calcSustainableWithdrawal(
      { ...wellFunded, rrspBalance: 1200000 }, 95,
    );
    expect(moreRrsp.sustainableMonthly).toBeGreaterThanOrEqual(base.sustainableMonthly);
  });

  it('adding more TFSA never reduces sustainable withdrawal', () => {
    const base = calcSustainableWithdrawal(wellFunded, 95);
    const moreTfsa = calcSustainableWithdrawal(
      { ...wellFunded, tfsaBalance: 500000 }, 95,
    );
    expect(moreTfsa.sustainableMonthly).toBeGreaterThanOrEqual(base.sustainableMonthly);
  });

  it('earlier retirement age reduces sustainable withdrawal', () => {
    const retire65 = calcSustainableWithdrawal(wellFunded, 95);
    const retire60 = calcSustainableWithdrawal(
      { ...wellFunded, retirementAge: 60, currentAge: 60 }, 95,
    );
    // More years to fund → lower sustainable amount
    expect(retire60.sustainableMonthly).toBeLessThan(retire65.sustainableMonthly);
  });
});
