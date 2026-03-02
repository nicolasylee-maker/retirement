import { describe, it, expect } from 'vitest';
import { projectScenario } from '../src/engines/projectionEngine.js';
import { createDefaultScenario } from '../src/constants/defaults.js';

// -- Persona factories -------------------------------------------------------

function margaret() {
  return {
    ...createDefaultScenario('Margaret'),
    currentAge: 65, retirementAge: 65, lifeExpectancy: 90,
    rrspBalance: 300000, tfsaBalance: 80000,
    nonRegInvestments: 50000, nonRegCostBasis: 30000,
    cppMonthly: 1000, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
    pensionType: 'db', dbPensionAnnual: 24000, dbPensionStartAge: 65, dbPensionIndexed: false,
    monthlyExpenses: 4500, realReturn: 0.04, inflationRate: 0.025,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0,
  };
}

function frank() {
  return {
    ...createDefaultScenario('Frank'),
    currentAge: 63, retirementAge: 65, lifeExpectancy: 85,
    rrspBalance: 0, tfsaBalance: 10000,
    nonRegInvestments: 60000, nonRegCostBasis: 40000,
    cppMonthly: 600, cppStartAge: 60, oasMonthly: 500, oasStartAge: 65,
    pensionType: 'none', monthlyExpenses: 3000, realReturn: 0.04, inflationRate: 0.025,
    mortgageBalance: 50000, mortgageRate: 0.05, mortgageYearsLeft: 10,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0,
  };
}

function rajesh() {
  return {
    ...createDefaultScenario('Rajesh'),
    currentAge: 55, retirementAge: 60, lifeExpectancy: 90,
    rrspBalance: 800000, tfsaBalance: 200000,
    nonRegInvestments: 300000, nonRegCostBasis: 150000,
    cppMonthly: 1200, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
    monthlyExpenses: 7000, realReturn: 0.04, inflationRate: 0.025,
    rrspMeltdownEnabled: true, rrspMeltdownStartAge: 55, rrspMeltdownTargetAge: 71, rrspMeltdownAnnual: 40000,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0,
  };
}

// Helper: build a minimal zero-growth scenario (uses 0.001 to avoid falsy-zero fallback)
function minimal(overrides) {
  return {
    ...createDefaultScenario('Test'),
    currentAge: 65, retirementAge: 65, lifeExpectancy: 66,
    rrspBalance: 0, tfsaBalance: 0, nonRegInvestments: 0, nonRegCostBasis: 1,
    otherAssets: 0, cppMonthly: 0, oasMonthly: 0, pensionType: 'none',
    monthlyExpenses: 1000, inflationRate: 0.001, realReturn: 0.001,
    tfsaReturn: 0.001, nonRegReturn: 0.001,
    expenseReductionAtRetirement: 0, cashSavings: 0,
    withdrawalOrder: ['tfsa', 'nonReg', 'rrsp', 'other'],
    ...overrides,
  };
}

// -- 1. Result array length --------------------------------------------------

describe('result array length', () => {
  it('Margaret: 26 rows', () => expect(projectScenario(margaret())).toHaveLength(26));
  it('Frank: 23 rows', () => expect(projectScenario(frank())).toHaveLength(23));
  it('Rajesh: 36 rows', () => expect(projectScenario(rajesh())).toHaveLength(36));
});

// -- 2. First-year basics ----------------------------------------------------

describe('first-year basics', () => {
  it('Margaret starts at age 65 in current year', () => {
    const r = projectScenario(margaret());
    expect(r[0].age).toBe(65);
    expect(r[0].year).toBe(new Date().getFullYear());
  });
  it('ages increment by 1 each row', () => {
    projectScenario(margaret()).forEach((row, i) => expect(row.age).toBe(65 + i));
  });
});

// -- 3. RRSP -> RRIF conversion at 72 ----------------------------------------

describe('RRIF conversion at 72', () => {
  it('Margaret: forced RRIF minimum at age 72', () => {
    const r = projectScenario(margaret());
    const at72 = r.find(y => y.age === 72);
    expect(at72.rrspWithdrawal).toBeGreaterThan(0);
    // Approximate pre-withdrawal balance * 5.40% RRIF rate
    expect(at72.rrspWithdrawal).toBeGreaterThanOrEqual(
      Math.floor(at72.rrspBalance / 1.04 * 0.054) - 1
    );
  });
  it('Frank (no RRSP): zero RRSP withdrawal throughout', () => {
    projectScenario(frank()).forEach(row => expect(row.rrspWithdrawal).toBe(0));
  });
});

// -- 4. CPP timing -----------------------------------------------------------

describe('CPP timing', () => {
  it('Rajesh: CPP = 0 before age 65', () => {
    projectScenario(rajesh()).filter(y => y.age < 65).forEach(r => expect(r.cppIncome).toBe(0));
  });
  it('Rajesh: CPP > 0 at age 65', () => {
    expect(projectScenario(rajesh()).find(y => y.age === 65).cppIncome).toBeGreaterThan(0);
  });
  it('Frank: CPP at 60 means 36% early reduction', () => {
    const r = projectScenario(frank());
    expect(r[0].cppIncome).toBe(Math.round(600 * 12 * (1 - 60 * 0.006)));
  });
});

// -- 5. OAS timing and clawback ----------------------------------------------

describe('OAS timing and clawback', () => {
  it('Rajesh: no OAS before 65', () => {
    projectScenario(rajesh()).filter(y => y.age < 65).forEach(r => expect(r.oasIncome).toBe(0));
  });
  it('Margaret: OAS present at 65', () => {
    expect(projectScenario(margaret())[0].oasIncome).toBeGreaterThan(0);
  });
  it('OAS clawback at high income', () => {
    const s = { ...margaret(), dbPensionAnnual: 80000,
      rrspMeltdownEnabled: true, rrspMeltdownStartAge: 65, rrspMeltdownAnnual: 30000, rrspMeltdownTargetAge: 71 };
    // Income > 90997 clawback threshold => OAS reduced below gross
    expect(projectScenario(s)[0].oasIncome).toBeLessThan(713 * 12);
  });
});

// -- 6. Withdrawal order -----------------------------------------------------

describe('withdrawal order', () => {
  it('default: TFSA before non-reg before RRSP', () => {
    const s = minimal({
      tfsaBalance: 5000, nonRegInvestments: 5000, nonRegCostBasis: 5000,
      rrspBalance: 100000, inflationRate: 0.001, realReturn: 0.001,
    });
    const first = projectScenario(s)[0];
    expect(first.tfsaWithdrawal).toBe(5000);
    expect(first.nonRegWithdrawal).toBe(5000);
    expect(first.rrspWithdrawal).toBeGreaterThanOrEqual(2000);
  });
  it('reversed: RRSP drawn first', () => {
    const s = minimal({
      tfsaBalance: 50000, nonRegInvestments: 50000, nonRegCostBasis: 50000,
      rrspBalance: 50000, otherAssets: 50000, inflationRate: 0.001, realReturn: 0.001,
      withdrawalOrder: ['rrsp', 'other', 'nonReg', 'tfsa'],
    });
    const first = projectScenario(s)[0];
    expect(first.rrspWithdrawal).toBe(12000);
    expect(first.tfsaWithdrawal).toBe(0);
    expect(first.nonRegWithdrawal).toBe(0);
  });
});

// -- 7. Portfolio growth -----------------------------------------------------

describe('portfolio growth', () => {
  it('idle TFSA grows by tfsaReturn each year', () => {
    // Income exactly covers expenses (no surplus) so TFSA only grows from returns
    const s = {
      ...createDefaultScenario('Growth'), currentAge: 65, retirementAge: 65, lifeExpectancy: 67,
      tfsaBalance: 100000, rrspBalance: 0, nonRegInvestments: 0, cashSavings: 0, otherAssets: 0,
      cppMonthly: 500, oasMonthly: 0, pensionType: 'none',
      monthlyExpenses: 500, inflationRate: 0, realReturn: 0.04, expenseReductionAtRetirement: 0,
    };
    const r = projectScenario(s);
    expect(r[0].tfsaBalance).toBe(104000);
    expect(r[1].tfsaBalance).toBe(108160);
  });
});

// -- 8. Non-reg cost basis proportional tracking -----------------------------

describe('non-reg cost basis proportional tracking', () => {
  it('cost basis scales down proportionally on withdrawal', () => {
    const s = minimal({
      nonRegInvestments: 100000, nonRegCostBasis: 60000,
      monthlyExpenses: 2000,
      withdrawalOrder: ['nonReg', 'tfsa', 'rrsp', 'other'],
    });
    const r = projectScenario(s);
    // $24000 withdrawn from $100000. Cost basis: 60000 * 76000/100000 = 45600
    expect(r[0].nonRegCostBasis).toBe(Math.round(60000 * 76000 / 100000));
    expect(r[0].nonRegBalance).toBe(Math.round(76000 * 1.001));
  });
});

// -- 9. Capital gains inclusion (2025: flat 50%) ------------------------------
// Note: The proposed tiered 66.67% rate was cancelled March 21, 2025.

describe('capital gains inclusion (2025: flat 50%)', () => {
  it('small gain uses 50% inclusion', () => {
    // Non-reg exactly covers expenses so it's fully depleted; TFSA covers tax gross-up
    const s = minimal({
      nonRegInvestments: 120000, nonRegCostBasis: 48000,
      tfsaBalance: 50000,
      monthlyExpenses: 10000,
      withdrawalOrder: ['nonReg', 'tfsa', 'rrsp', 'other'],
    });
    const r = projectScenario(s);
    // Withdraw $120K from non-reg (depleted). Gain ratio 0.6 => gain $72K. 50% inclusion => $36K
    expect(r[0].totalTaxableIncome).toBe(Math.round(72000 * 0.5));
  });
  it('large gain (>$250K) still uses flat 50% inclusion (no tiered rate)', () => {
    // Non-reg exactly covers expenses so it's fully depleted; TFSA covers tax gross-up
    const s = minimal({
      nonRegInvestments: 360000, nonRegCostBasis: 1,
      tfsaBalance: 200000,
      monthlyExpenses: 30000,
      withdrawalOrder: ['nonReg', 'tfsa', 'rrsp', 'other'],
    });
    const r = projectScenario(s);
    const gainRatio = (360000 - 1) / 360000;
    const totalGain = 360000 * gainRatio;
    // Flat 50% on all gains — tiered 66.67% above $250K was cancelled March 21, 2025
    const taxable = totalGain * 0.5;
    expect(r[0].totalTaxableIncome).toBe(Math.round(taxable));
  });
});

// -- 10. RRSP meltdown -------------------------------------------------------

describe('RRSP meltdown', () => {
  it('Rajesh: meltdown >= $40K before target age', () => {
    expect(projectScenario(rajesh()).find(y => y.age === 55).rrspWithdrawal)
      .toBeGreaterThanOrEqual(40000);
  });
  it('Rajesh: meltdown active at 70, RRIF-only at 71', () => {
    const r = projectScenario(rajesh());
    expect(r.find(y => y.age === 70).rrspWithdrawal).toBeGreaterThanOrEqual(40000);
    const at71 = r.find(y => y.age === 71);
    const rrifMin = Math.round((at71.rrspBalance / 1.04) * 0.0528);
    expect(at71.rrspWithdrawal).toBeGreaterThanOrEqual(rrifMin - 1);
  });
  it('meltdown respects startAge — no meltdown before startAge', () => {
    const s = minimal({
      currentAge: 55, retirementAge: 60, lifeExpectancy: 75,
      rrspBalance: 500000,
      rrspMeltdownEnabled: true, rrspMeltdownStartAge: 60, rrspMeltdownTargetAge: 71,
      rrspMeltdownAnnual: 30000,
    });
    const r = projectScenario(s);
    // Before startAge: no meltdown withdrawal (only RRIF min if applicable, but < 72 so none)
    r.filter(y => y.age < 60).forEach(row => {
      expect(row.rrspWithdrawal).toBe(0);
    });
    // At startAge: meltdown kicks in
    expect(r.find(y => y.age === 60).rrspWithdrawal).toBeGreaterThanOrEqual(12000);
  });
});

// -- 11. Mortgage paydown ----------------------------------------------------

describe('mortgage paydown', () => {
  it('Frank: mortgage decreases and zeroes by year 10', () => {
    const r = projectScenario(frank());
    expect(r[0].mortgageBalance).toBeLessThan(50000);
    expect(r[0].debtPayments).toBeGreaterThan(0);
    const at73 = r.find(y => y.age === 73);
    expect(at73.mortgageBalance).toBe(0);
    expect(at73.debtPayments).toBe(0);
  });
  it('Margaret: zero debt throughout', () => {
    projectScenario(margaret()).forEach(row => {
      expect(row.mortgageBalance).toBe(0);
      expect(row.debtPayments).toBe(0);
    });
  });
});

// -- 12. Tax computation -----------------------------------------------------

describe('tax computation', () => {
  it('TFSA-only income yields zero tax', () => {
    const s = minimal({ tfsaBalance: 500000 });
    const r = projectScenario(s);
    expect(r[0].totalTaxableIncome).toBe(0);
    expect(r[0].totalTax).toBe(0);
  });
  it('Margaret: tax > 0 from CPP + OAS + pension', () => {
    const r = projectScenario(margaret());
    expect(r[0].totalTax).toBeGreaterThan(0);
    expect(r[0].totalTaxableIncome).toBeGreaterThan(0);
  });
});

// -- 13. Surplus identity ----------------------------------------------------

describe('surplus calculation', () => {
  it('surplus + deposits = afterTaxIncome - expenses - debtPayments (within rounding)', () => {
    for (const persona of [margaret(), frank(), rajesh()]) {
      projectScenario(persona).forEach(row => {
        const expected = row.afterTaxIncome - row.expenses - row.debtPayments;
        const actualPlusDeposits = row.surplus + (row.tfsaDeposit || 0) + (row.nonRegDeposit || 0);
        expect(Math.abs(actualPlusDeposits - expected)).toBeLessThanOrEqual(1);
      });
    }
  });
});

// -- 14. Net worth -----------------------------------------------------------

describe('net worth', () => {
  it('includes real estate minus all debts', () => {
    const s = { ...frank(), realEstateValue: 400000, otherDebt: 3000 };
    const first = projectScenario(s)[0];
    // netWorth = totalPortfolio + realEstate - mortgage - otherDebt (otherDebt never amortized)
    const expected = first.totalPortfolio + 400000 - first.mortgageBalance - 3000;
    expect(Math.abs(first.netWorth - expected)).toBeLessThanOrEqual(1);
  });
  it('Margaret (no real estate, no debts): net worth = portfolio', () => {
    projectScenario(margaret()).forEach(row => expect(row.netWorth).toBe(row.totalPortfolio));
  });
});

// -- 15. TFSA surplus transfer ------------------------------------------------

describe('TFSA surplus transfer', () => {
  it('surplus deposits into TFSA up to contribution room', () => {
    // High income, low expenses → large surplus, TFSA room limits deposit to $7000
    const s = minimal({
      tfsaBalance: 0, rrspBalance: 0, nonRegInvestments: 0,
      cppMonthly: 1500, oasMonthly: 713,
      monthlyExpenses: 500, inflationRate: 0, realReturn: 0,
      tfsaReturn: 0, nonRegReturn: 0,
    });
    const r = projectScenario(s);
    expect(r[0].tfsaDeposit).toBe(7000);
    expect(r[0].tfsaContributionRoom).toBe(0);
  });

  it('surplus overflows to non-reg when TFSA room exhausted', () => {
    // Large surplus exceeds $7K TFSA room → rest goes to non-reg
    const s = minimal({
      tfsaBalance: 0, rrspBalance: 0, nonRegInvestments: 0,
      cppMonthly: 1500, oasMonthly: 713,
      monthlyExpenses: 500, inflationRate: 0,
    });
    const r = projectScenario(s);
    expect(r[0].tfsaDeposit).toBe(7000);
    expect(r[0].nonRegDeposit).toBeGreaterThan(0);
    // Non-reg balance = deposit * (1 + return) — deposit creates cost basis
    expect(r[0].nonRegBalance).toBeGreaterThanOrEqual(r[0].nonRegDeposit);
    expect(r[0].nonRegCostBasis).toBeGreaterThanOrEqual(r[0].nonRegDeposit);
  });

  it('no transfer when no surplus', () => {
    // Expenses exceed income → shortfall, no surplus to deposit
    const s = minimal({
      tfsaBalance: 50000, rrspBalance: 0, nonRegInvestments: 0,
      cppMonthly: 0, oasMonthly: 0,
      monthlyExpenses: 2000, inflationRate: 0, realReturn: 0, tfsaReturn: 0,
    });
    const r = projectScenario(s);
    expect(r[0].tfsaDeposit).toBe(0);
    expect(r[0].nonRegDeposit).toBe(0);
  });

  it('RRIF minimum surplus deposits to TFSA at age 85', () => {
    // At 85, RRIF min is 8.51% — if that exceeds expenses, surplus goes to TFSA
    const s = minimal({
      currentAge: 85, retirementAge: 85, lifeExpectancy: 86,
      rrspBalance: 500000, tfsaBalance: 0,
      nonRegInvestments: 0,
      cppMonthly: 500, oasMonthly: 500,
      monthlyExpenses: 2000, inflationRate: 0, realReturn: 0,
      tfsaReturn: 0, nonRegReturn: 0,
    });
    const r = projectScenario(s);
    // RRIF min at 85 = 500000 * 0.0851 = $42,550
    // This large withdrawal creates surplus that deposits into TFSA
    expect(r[0].tfsaDeposit).toBeGreaterThan(0);
    expect(r[0].tfsaDeposit).toBeLessThanOrEqual(7000);
  });
});

// -- 16. Couple support -------------------------------------------------------

// Shared couple factory used across couple tests
function coupleBase(overrides = {}) {
  return {
    ...createDefaultScenario('Couple'),
    isCouple: true,
    spouseAge: 63, spouseRetirementAge: 65,
    cppMonthly: 0, oasMonthly: 0,
    spouseCppMonthly: 0, spouseOasMonthly: 0,
    rrspBalance: 0, tfsaBalance: 300000,
    nonRegInvestments: 0, cashSavings: 0, otherAssets: 0,
    spouseRrspBalance: 0, spouseTfsaBalance: 0,
    spouseEmploymentIncome: 0, spouseStillWorking: true,
    spousePensionType: 'none', spouseDbPensionAnnual: 0, spouseDbPensionStartAge: 65, spouseDbPensionIndexed: false, spouseDcPensionBalance: 0,
    spouseRrifBalance: 0, spouseTfsaContributionRoom: 0,
    currentAge: 63, retirementAge: 65, lifeExpectancy: 80,
    monthlyExpenses: 2000, inflationRate: 0, realReturn: 0, tfsaReturn: 0,
    expenseReductionAtRetirement: 0,
    ...overrides,
  };
}

describe('couple support', () => {
  // P0 bug fix: spouse CPP/OAS must not be silently zero
  it('P0: spouse CPP is zero before spouseCppStartAge, positive after', () => {
    // Primary and spouse both start at 63. Spouse CPP starts at 65 (when both are 65).
    const s = coupleBase({ spouseCppMonthly: 700, spouseCppStartAge: 65 });
    const r = projectScenario(s);
    r.filter(row => row.age < 65).forEach(row => expect(row.spouseCppIncome).toBe(0));
    // Positive at 65 — exact value omitted because inflationRate 0 falls back to 2.5%
    expect(r.find(row => row.age === 65).spouseCppIncome).toBeGreaterThan(0);
  });

  it('P0: spouse OAS is zero before spouseOasStartAge, positive after', () => {
    const s = coupleBase({ spouseOasMonthly: 713, spouseOasStartAge: 65 });
    const r = projectScenario(s);
    r.filter(row => row.age < 65).forEach(row => expect(row.spouseOasIncome).toBe(0));
    expect(r.find(row => row.age === 65).spouseOasIncome).toBeGreaterThan(0);
  });

  it('P0: spouse CPP/OAS with different ages — starts at spouse\'s age, not primary\'s', () => {
    // Primary 60, spouse 63 → spouse turns 65 when primary turns 62
    const s = coupleBase({
      currentAge: 60, retirementAge: 65, lifeExpectancy: 80,
      spouseAge: 63, spouseRetirementAge: 65,
      spouseCppMonthly: 700, spouseCppStartAge: 65,
      spouseOasMonthly: 713, spouseOasStartAge: 65,
      tfsaBalance: 500000,
    });
    const r = projectScenario(s);
    // Before primary age 62 (spouse < 65): zero
    r.filter(row => row.age < 62).forEach(row => {
      expect(row.spouseCppIncome).toBe(0);
      expect(row.spouseOasIncome).toBe(0);
    });
    // At primary 62 (spouse 65): both kick in
    const at62 = r.find(row => row.age === 62);
    expect(at62.spouseCppIncome).toBeGreaterThan(0);
    expect(at62.spouseOasIncome).toBeGreaterThan(0);
    // Before start age rows had zero, confirming age-gating not primary-age-gating
    expect(r.find(row => row.age === 61).spouseCppIncome).toBe(0);
  });

  // Two-tax-call advantage
  it('couple pays less combined tax than single person with same combined CPP income', () => {
    // Each person: $5000/month CPP = $60K/yr. Combined: $120K.
    const coupleS = coupleBase({
      currentAge: 65, retirementAge: 65, lifeExpectancy: 66,
      spouseAge: 65, spouseRetirementAge: 65,
      cppMonthly: 5000, cppStartAge: 65,
      spouseCppMonthly: 5000, spouseCppStartAge: 65,
      tfsaBalance: 0, monthlyExpenses: 5000,
    });
    // Single person with $120K CPP
    const singleS = { ...coupleS, isCouple: false, cppMonthly: 10000, spouseCppMonthly: 0 };
    const coupleResult = projectScenario(coupleS)[0];
    const singleResult = projectScenario(singleS)[0];
    expect(coupleResult.totalTax).toBeLessThan(singleResult.totalTax);
    // Bracket splitting + two basic personal amounts → meaningful difference
    expect(singleResult.totalTax - coupleResult.totalTax).toBeGreaterThan(5000);
  });

  // P1: spouse employment income
  it('spouse employment income present pre-retirement, zero at spouseRetirementAge', () => {
    // Primary 58, spouse 55, spouse retires at 60 (primary 63)
    const s = coupleBase({
      currentAge: 58, retirementAge: 65, lifeExpectancy: 75,
      spouseAge: 55, spouseRetirementAge: 60,
      spouseEmploymentIncome: 80000, spouseStillWorking: true,
      tfsaBalance: 1000000,
    });
    const r = projectScenario(s);
    // Spouse 55 + (age-58) → retires when primary age=63 (spouseAge=60)
    // Inflation-adjusted, so just check positive/zero boundary
    r.filter(row => row.age < 63).forEach(row =>
      expect(row.spouseEmploymentIncome).toBeGreaterThan(0),
    );
    r.filter(row => row.age >= 63).forEach(row =>
      expect(row.spouseEmploymentIncome).toBe(0),
    );
  });

  it('spouse employment income = 0 when spouseStillWorking is false', () => {
    const s = coupleBase({
      spouseEmploymentIncome: 80000, spouseStillWorking: false,
      tfsaBalance: 300000,
    });
    projectScenario(s).forEach(row => expect(row.spouseEmploymentIncome).toBe(0));
  });

  // P2: spouse pension
  it('spouse DB pension starts at spouseDbPensionStartAge, zero before', () => {
    // Primary 60, spouse 58 → spouse turns 65 when primary turns 67
    const s = coupleBase({
      currentAge: 60, spouseAge: 58, spouseRetirementAge: 62,
      spousePensionType: 'db', spouseDbPensionAnnual: 30000,
      spouseDbPensionStartAge: 65, spouseDbPensionIndexed: false,
      tfsaBalance: 1000000, lifeExpectancy: 80,
    });
    const r = projectScenario(s);
    r.filter(row => row.age < 67).forEach(row => expect(row.spousePensionIncome).toBe(0));
    expect(r.find(row => row.age === 67).spousePensionIncome).toBe(30000);
  });

  it('spouse indexed DB pension inflates year-over-year', () => {
    const s = coupleBase({
      currentAge: 67, spouseAge: 65, spouseRetirementAge: 65,
      lifeExpectancy: 75, inflationRate: 0.025,
      spousePensionType: 'db', spouseDbPensionAnnual: 20000,
      spouseDbPensionStartAge: 65, spouseDbPensionIndexed: true,
      tfsaBalance: 500000,
    });
    const r = projectScenario(s);
    // Year 0 (primary 67, spouse 65): inflationFactor = (1.025)^(0) = 1 → $20K
    expect(r[0].spousePensionIncome).toBe(20000);
    // Year 1 (primary 68, spouse 66): inflationFactor = 1.025 → $20500
    expect(r[1].spousePensionIncome).toBe(Math.round(20000 * 1.025));
  });

  // P3: spouse registered savings
  it('spouse RRIF minimum kicks in at spouse age 72, not primary age 72', () => {
    // Primary 68, spouse 60 → spouse turns 72 when primary turns 80
    const s = coupleBase({
      currentAge: 68, retirementAge: 68, lifeExpectancy: 84,
      spouseAge: 60, spouseRetirementAge: 62,
      spouseRrspBalance: 200000,
      inflationRate: 0, realReturn: 0, tfsaReturn: 0,
      tfsaBalance: 500000,
    });
    const r = projectScenario(s);
    // Before spouse turns 72 (primary < 80): no spouse RRIF withdrawal
    r.filter(row => row.age < 80).forEach(row =>
      expect(row.spouseRrspWithdrawal).toBe(0),
    );
    // At primary 80 (spouse 72): spouse RRIF begins
    expect(r.find(row => row.age === 80).spouseRrspWithdrawal).toBeGreaterThan(0);
  });

  it('couple: spouse account balances appear in projection output', () => {
    // Use 0.001 (not 0) to avoid the engine's falsy-zero fallback on realReturn/tfsaReturn
    const s = coupleBase({
      spouseRrspBalance: 150000, spouseTfsaBalance: 80000,
      realReturn: 0.001, tfsaReturn: 0.001,
      tfsaBalance: 500000,
    });
    const r = projectScenario(s);
    // Spouse RRSP: no withdrawal (< 72), minimal growth (0.1%)
    expect(r[0].spouseRrspBalance).toBe(Math.round(150000 * 1.001));
    expect(r[0].spouseTfsaBalance).toBe(Math.round(80000 * 1.001));
    // totalPortfolio includes spouse accounts — must be > primary-only sum
    expect(r[0].totalPortfolio).toBeGreaterThan(r[0].rrspBalance + r[0].tfsaBalance);
  });

  it('couple: surplus identity holds across full projection', () => {
    const s = coupleBase({
      currentAge: 60, retirementAge: 65, lifeExpectancy: 80,
      spouseAge: 58, spouseRetirementAge: 62,
      cppMonthly: 900, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
      spouseCppMonthly: 700, spouseCppStartAge: 65, spouseOasMonthly: 713, spouseOasStartAge: 65,
      spouseEmploymentIncome: 70000, spouseStillWorking: true,
      spouseRrspBalance: 150000, spouseTfsaBalance: 80000,
      rrspBalance: 300000, tfsaBalance: 100000,
      nonRegInvestments: 50000, nonRegCostBasis: 30000,
      monthlyExpenses: 6000, realReturn: 0.04, inflationRate: 0.025, tfsaReturn: 0.04,
      expenseReductionAtRetirement: 0.10,
    });
    projectScenario(s).forEach(row => {
      const expected = row.afterTaxIncome - row.expenses - row.debtPayments;
      const actual = row.surplus + (row.tfsaDeposit || 0) + (row.nonRegDeposit || 0);
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
    });
  });

  // Single-person path unchanged
  it('isCouple=false: spouse fields are undefined in output', () => {
    const s = { ...createDefaultScenario('Solo'), currentAge: 65, retirementAge: 65, lifeExpectancy: 67 };
    projectScenario(s).forEach(row => {
      expect(row.spouseCppIncome).toBeUndefined();
      expect(row.spouseOasIncome).toBeUndefined();
      expect(row.spouseRrspBalance).toBeUndefined();
    });
  });
});
