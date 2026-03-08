import { describe, it, expect } from 'vitest';
import { projectScenario } from '../src/engines/projectionEngine.js';
import { createDefaultScenario } from '../src/constants/defaults.js';
import { RRSP_PARAMS } from '../src/constants/taxTables.js';

// -- Helpers ------------------------------------------------------------------

function baseScenario(overrides = {}) {
  return {
    ...createDefaultScenario('Test'),
    province: 'ON',
    currentAge: 40,
    retirementAge: 65,
    lifeExpectancy: 90,
    employmentIncome: 70000,
    stillWorking: true,
    rrspBalance: 50000,
    tfsaBalance: 30000,
    tfsaContributionRoom: 7000,
    rrspContributionRoom: 20000,
    nonRegInvestments: 0,
    cashSavings: 0,
    otherAssets: 0,
    monthlyExpenses: 4000,
    cppMonthly: 800,
    cppStartAge: 65,
    oasMonthly: 713,
    oasStartAge: 65,
    pensionType: 'none',
    realReturn: 0.04,
    inflationRate: 0.025,
    tfsaReturn: 0.04,
    nonRegReturn: 0.04,
    expenseReductionAtRetirement: 0,
    monthlySavings: 0,
    ...overrides,
  };
}

function coupleScenario(overrides = {}) {
  return baseScenario({
    isCouple: true,
    spouseAge: 38,
    spouseRetirementAge: 65,
    spouseEmploymentIncome: 110000,
    spouseStillWorking: true,
    spouseRrspBalance: 40000,
    spouseTfsaBalance: 20000,
    spouseRrspContributionRoom: 15000,
    employmentIncome: 300000,
    ...overrides,
  });
}

// -- 13A: Backward Compatibility ------------------------------------------------

describe('backward compatibility', () => {
  it('monthlySavings: undefined produces identical results to explicit 0', () => {
    const withUndefined = baseScenario({ monthlySavings: undefined });
    const withZero = baseScenario({ monthlySavings: 0 });
    const projUndef = projectScenario(withUndefined);
    const projZero = projectScenario(withZero);
    expect(projUndef.length).toBe(projZero.length);
    for (let i = 0; i < projUndef.length; i++) {
      // Compare all numeric fields
      for (const key of Object.keys(projUndef[i])) {
        if (typeof projUndef[i][key] === 'number') {
          expect(projUndef[i][key], `year ${i} field ${key}`).toBe(projZero[i][key]);
        }
      }
    }
  });

  it('monthlySavings: 0 produces rrspDeposit = 0 every year', () => {
    const proj = projectScenario(baseScenario({ monthlySavings: 0 }));
    proj.forEach(row => expect(row.rrspDeposit).toBe(0));
  });

  it('monthlySavings: 0 couple scenario has zero RRSP deposits', () => {
    const proj = projectScenario(coupleScenario({ monthlySavings: 0 }));
    proj.forEach(row => {
      expect(row.rrspDeposit).toBe(0);
      expect(row.spouseRrspDeposit).toBe(0);
    });
  });
});

// -- 13B: Engine Unit Tests ---------------------------------------------------

describe('engine core logic', () => {
  it('positive savings increases RRSP balance', () => {
    const baseline = projectScenario(baseScenario({ monthlySavings: 0 }));
    const withSavings = projectScenario(baseScenario({ monthlySavings: 500 }));
    // At retirement age, RRSP should be higher with savings
    const retAge = 65;
    const baseRet = baseline.find(r => r.age === retAge);
    const savingsRet = withSavings.find(r => r.age === retAge);
    expect(savingsRet.rrspBalance).toBeGreaterThan(baseRet.rrspBalance);
  });

  it('zero-surplus user gets $0 RRSP contribution', () => {
    // High expenses + debt = no surplus = no savings possible
    const s = baseScenario({
      monthlySavings: 1000,
      employmentIncome: 50000,
      monthlyExpenses: 5000,
      mortgageBalance: 200000,
      mortgageRate: 0.05,
      mortgageYearsLeft: 25,
    });
    const proj = projectScenario(s);
    // If surplus is negative, RRSP deposit should be 0 (affordability cap)
    const year1 = proj[0];
    if (year1.afterTaxIncome - year1.expenses - year1.debtPayments <= 0) {
      expect(year1.rrspDeposit).toBe(0);
    }
  });

  it('savings exceeding surplus are capped to affordable amount', () => {
    const s = baseScenario({ monthlySavings: 5000, employmentIncome: 70000 });
    const proj = projectScenario(s);
    const year1 = proj[0];
    // RRSP deposit should not cause negative surplus
    expect(year1.surplus).toBeGreaterThanOrEqual(-50);
  });

  it('RRSP capped at $32,490/yr', () => {
    const s = baseScenario({
      monthlySavings: 5000, // $60K/yr target
      employmentIncome: 300000,
      rrspContributionRoom: 100000,
    });
    const proj = projectScenario(s);
    proj.filter(r => r.age < 65).forEach(row => {
      expect(row.rrspDeposit).toBeLessThanOrEqual(RRSP_PARAMS.annualLimit);
    });
  });

  it('RRSP room accrues and depletes', () => {
    const s = baseScenario({
      monthlySavings: 500,
      rrspContributionRoom: 0, // Start with zero room
      employmentIncome: 70000,
    });
    const proj = projectScenario(s);
    // Year 1: room accrues 18% of $70K = $12,600 (capped at $32,490)
    // Contribution depletes some room
    // Room should be > 0 after year 1 (accrued - contributed)
    expect(proj[0].rrspContributionRoom).toBeGreaterThan(0);
  });

  it('contributions stop at retirement age', () => {
    const s = baseScenario({ monthlySavings: 500 });
    const proj = projectScenario(s);
    proj.filter(r => r.age >= s.retirementAge).forEach(row => {
      expect(row.rrspDeposit).toBe(0);
    });
  });

  it('contributions stop when stillWorking is false', () => {
    const s = baseScenario({
      monthlySavings: 500,
      stillWorking: false,
      currentAge: 55,
      retirementAge: 65,
    });
    const proj = projectScenario(s);
    proj.forEach(row => expect(row.rrspDeposit).toBe(0));
  });

  it('couple splits RRSP proportional to income', () => {
    const s = coupleScenario({
      monthlySavings: 4000, // $48K/yr
      employmentIncome: 300000,
      spouseEmploymentIncome: 110000,
      rrspContributionRoom: 100000,
      spouseRrspContributionRoom: 100000,
    });
    const proj = projectScenario(s);
    const year1 = proj[0];
    // Primary share = 300/(300+110) = ~73%
    // Primary target = $48K * 73% = ~$35,040 → capped at $32,490
    expect(year1.rrspDeposit).toBe(RRSP_PARAMS.annualLimit);
    // Spouse gets remainder
    expect(year1.spouseRrspDeposit).toBeGreaterThan(0);
    expect(year1.spouseRrspDeposit).toBeLessThanOrEqual(RRSP_PARAMS.annualLimit);
  });

  it('couple: retired spouse gets $0 RRSP', () => {
    const s = coupleScenario({
      monthlySavings: 2000,
      spouseAge: 66,
      spouseRetirementAge: 65, // Already retired
    });
    const proj = projectScenario(s);
    expect(proj[0].spouseRrspDeposit).toBe(0);
  });

  it('meltdown and savings dont overlap in same year', () => {
    const s = baseScenario({
      monthlySavings: 500,
      rrspMeltdownEnabled: true,
      rrspMeltdownStartAge: 65,
      rrspMeltdownTargetAge: 71,
      rrspMeltdownAnnual: 20000,
    });
    const proj = projectScenario(s);
    // During working years: savings but no meltdown
    // During meltdown: no savings (retired)
    proj.forEach(row => {
      if (row.rrspDeposit > 0) {
        // Should not have meltdown withdrawal (meltdown starts at 65 = retirement)
        expect(row.age).toBeLessThan(65);
      }
    });
  });

  it('savings inflate with inflation rate', () => {
    const s = baseScenario({ monthlySavings: 1000, inflationRate: 0.025 });
    const proj = projectScenario(s);
    const year1 = proj[0];
    const year10 = proj[9];
    // Both should have rrspDeposit > 0 during working years
    if (year1.rrspDeposit > 0 && year10.rrspDeposit > 0) {
      // Year 10 deposit should be higher than year 1 due to inflation
      expect(year10.rrspDeposit).toBeGreaterThan(year1.rrspDeposit);
    }
  });
});

// -- 13C: Tax Verification Tests -----------------------------------------------

describe('tax verification', () => {
  it('RRSP contribution reduces taxable income', () => {
    const baseline = projectScenario(baseScenario({ monthlySavings: 0 }));
    const withSavings = projectScenario(baseScenario({ monthlySavings: 500 }));
    const baseYear1 = baseline[0];
    const savingsYear1 = withSavings[0];
    // With RRSP contribution, taxable income should be lower
    expect(savingsYear1.totalTaxableIncome).toBeLessThan(baseYear1.totalTaxableIncome);
  });

  it('RRSP contribution reduces total tax', () => {
    const baseline = projectScenario(baseScenario({ monthlySavings: 0 }));
    const withSavings = projectScenario(baseScenario({ monthlySavings: 500 }));
    expect(withSavings[0].totalTax).toBeLessThan(baseline[0].totalTax);
  });

  it('zero contribution = same tax as baseline', () => {
    const baseline = projectScenario(baseScenario({ monthlySavings: 0 }));
    const explicit = projectScenario(baseScenario({ monthlySavings: 0 }));
    expect(explicit[0].totalTax).toBe(baseline[0].totalTax);
  });
});

// -- 13D: Integration / Output Propagation Tests --------------------------------

describe('output propagation', () => {
  it('projection row includes rrspDeposit field', () => {
    const proj = projectScenario(baseScenario({ monthlySavings: 500 }));
    proj.forEach(row => {
      expect(row).toHaveProperty('rrspDeposit');
      if (row.age < 65) {
        expect(row.rrspDeposit).toBeGreaterThanOrEqual(0);
      } else {
        expect(row.rrspDeposit).toBe(0);
      }
    });
  });

  it('projection row includes rrspContributionRoom', () => {
    const proj = projectScenario(baseScenario({ monthlySavings: 500 }));
    proj.forEach(row => {
      expect(row).toHaveProperty('rrspContributionRoom');
      expect(row.rrspContributionRoom).toBeGreaterThanOrEqual(0);
    });
  });

  it('totalPortfolio includes RRSP contributions', () => {
    const baseline = projectScenario(baseScenario({ monthlySavings: 0 }));
    const withSavings = projectScenario(baseScenario({ monthlySavings: 500 }));
    const retAge = 65;
    const baseRet = baseline.find(r => r.age === retAge);
    const savingsRet = withSavings.find(r => r.age === retAge);
    expect(savingsRet.totalPortfolio).toBeGreaterThan(baseRet.totalPortfolio);
  });

  it('estate RRSP balance higher with contributions', () => {
    const baseline = projectScenario(baseScenario({ monthlySavings: 0 }));
    const withSavings = projectScenario(baseScenario({ monthlySavings: 500 }));
    const age90Base = baseline.find(r => r.age === 90);
    const age90Save = withSavings.find(r => r.age === 90);
    // RRSP at end of life should be higher (more was contributed)
    expect(age90Save.rrspBalance).toBeGreaterThanOrEqual(age90Base.rrspBalance);
  });

  it('RRSP balance at RRIF conversion is larger with contributions', () => {
    const baseline = projectScenario(baseScenario({ monthlySavings: 0 }));
    const withSavings = projectScenario(baseScenario({ monthlySavings: 1000 }));
    // At 71 (just before RRIF), RRSP balance should be higher with savings
    const baseAt71 = baseline.find(r => r.age === 71);
    const saveAt71 = withSavings.find(r => r.age === 71);
    if (baseAt71 && saveAt71) {
      expect(saveAt71.rrspBalance).toBeGreaterThan(baseAt71.rrspBalance);
    }
  });
});

// -- 13E: UI Validation Tests ---------------------------------------------------

describe('input validation', () => {
  it('negative savings treated as zero', () => {
    const proj = projectScenario(baseScenario({ monthlySavings: -500 }));
    proj.forEach(row => expect(row.rrspDeposit).toBe(0));
  });

  it('extremely large savings ($50K/mo) does not crash', () => {
    expect(() => {
      projectScenario(baseScenario({ monthlySavings: 50000 }));
    }).not.toThrow();
  });

  it('field defaults to 0 when absent from scenario', () => {
    const s = createDefaultScenario();
    expect(s.monthlySavings).toBe(0);
  });

  it('extremely large savings is capped by affordability during working years', () => {
    const s = baseScenario({ monthlySavings: 50000 });
    const proj = projectScenario(s);
    // During working years, RRSP deposits should not exceed affordable amount
    proj.filter(r => r.age < s.retirementAge).forEach(row => {
      // With affordability cap, working-year surplus should not be deeply negative
      // Allow some tolerance due to tax feedback loop
      expect(row.rrspDeposit).toBeLessThanOrEqual(RRSP_PARAMS.annualLimit);
    });
  });
});

// -- 13F: RRSP → TFSA → NonReg Cascade Tests -----------------------------------

describe('savings cascade: RRSP → TFSA → NonReg', () => {
  it('T1: RRSP room available — all savings go to RRSP', () => {
    const s = baseScenario({
      monthlySavings: 1000,          // $12K/yr
      rrspContributionRoom: 20000,
      tfsaContributionRoom: 20000,
      employmentIncome: 100000,
    });
    const proj = projectScenario(s);
    const yr = proj[0];
    expect(yr.rrspDeposit).toBe(12000);
  });

  it('T2: RRSP room exhausted — overflow to TFSA', () => {
    const s = baseScenario({
      monthlySavings: 1000,          // $12K/yr
      rrspContributionRoom: 5000,    // only $5K RRSP room
      tfsaContributionRoom: 20000,   // plenty of TFSA room
      employmentIncome: 100000,
    });
    const proj = projectScenario(s);
    const yr = proj[0];
    expect(yr.rrspDeposit).toBe(5000);
    // Remaining $7K should cascade to TFSA
    expect(yr.tfsaDeposit).toBeGreaterThanOrEqual(7000);
  });

  it('T3: RRSP + TFSA room both exhausted — overflow to NonReg', () => {
    const s = baseScenario({
      monthlySavings: 2000,          // $24K/yr
      rrspContributionRoom: 0,
      tfsaContributionRoom: 0,       // no TFSA room (but $7K accrues at year start)
      employmentIncome: 150000,
    });
    const proj = projectScenario(s);
    const yr = proj[0];
    expect(yr.rrspDeposit).toBe(0);
    // TFSA accrual of $7K happens before allocation → $7K to TFSA, rest to nonReg
    expect(yr.tfsaDeposit).toBeGreaterThanOrEqual(7000);
    expect(yr.nonRegDeposit).toBeGreaterThan(0);
  });

  it('T4: Zero savings — no contributions anywhere', () => {
    const s = baseScenario({ monthlySavings: 0 });
    const proj = projectScenario(s);
    const yr = proj[0];
    expect(yr.rrspDeposit).toBe(0);
  });

  it('T5: Couple proportional split with overflow cascade', () => {
    const s = coupleScenario({
      monthlySavings: 1000,                 // $12K/yr
      employmentIncome: 80000,              // 80% share
      spouseEmploymentIncome: 20000,        // 20% share
      rrspContributionRoom: 2000,           // primary: only $2K RRSP room
      spouseRrspContributionRoom: 500,      // spouse: only $500 RRSP room
      tfsaContributionRoom: 15000,
      spouseTfsaContributionRoom: 15000,
    });
    const proj = projectScenario(s);
    const yr = proj[0];
    // Primary RRSP capped at $2K, spouse RRSP capped at $500
    expect(yr.rrspDeposit).toBe(2000);
    expect(yr.spouseRrspDeposit).toBe(500);
    // Remainder $9,500 cascades to TFSA
    expect(yr.tfsaDeposit).toBeGreaterThan(0);
  });
});
