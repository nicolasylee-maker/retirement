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

// -- 9. Capital gains tiered inclusion ---------------------------------------

describe('capital gains tiered inclusion', () => {
  it('gain <= $250K uses 50% inclusion', () => {
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
  it('gain > $250K uses enhanced 66.7% rate above threshold', () => {
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
    const taxable = 250000 * 0.5 + (totalGain - 250000) * 0.6667;
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
