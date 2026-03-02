import { describe, it, expect } from 'vitest';
import { buildWaterfallData, buildWaterfallInsight } from '../src/views/dashboard/waterfallChartHelpers.js';
import { projectScenario } from '../src/engines/projectionEngine.js';
import { calcTotalTax } from '../src/engines/taxEngine.js';
import { createDefaultScenario } from '../src/constants/defaults.js';

// ---------------------------------------------------------------------------
// Persona factories (mirror projectionEngine.test.js style)
// ---------------------------------------------------------------------------

/** Margaret: retired immediately, standard RRSP + TFSA drawdown, DB pension, no meltdown. */
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
    rrspMeltdownEnabled: false,
    consumerDebt: 0, otherDebt: 0,
  };
}

/** Rajesh: working until 60, RRSP meltdown 60–71. Salary covers expenses pre-ret. */
function rajesh() {
  return {
    ...createDefaultScenario('Rajesh'),
    currentAge: 55, retirementAge: 60, lifeExpectancy: 90,
    rrspBalance: 800000, tfsaBalance: 200000,
    nonRegInvestments: 300000, nonRegCostBasis: 150000,
    employmentIncome: 120000,
    cppMonthly: 1200, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
    monthlyExpenses: 7000, realReturn: 0.04, inflationRate: 0.025,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0,
    rrspMeltdownEnabled: true, rrspMeltdownAnnual: 30000,
    rrspMeltdownStartAge: 55, rrspMeltdownTargetAge: 71,
    pensionType: 'none',
    consumerDebt: 0, otherDebt: 0,
  };
}

/** Sam: low portfolio → depletes partway through retirement. */
function sam() {
  return {
    ...createDefaultScenario('Sam'),
    currentAge: 65, retirementAge: 65, lifeExpectancy: 90,
    rrspBalance: 60000, tfsaBalance: 10000,
    nonRegInvestments: 0, nonRegCostBasis: 0,
    cppMonthly: 600, cppStartAge: 65, oasMonthly: 500, oasStartAge: 65,
    monthlyExpenses: 5000, realReturn: 0.04, inflationRate: 0.025,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0,
    rrspMeltdownEnabled: false, pensionType: 'none',
    consumerDebt: 0, otherDebt: 0,
  };
}

// ---------------------------------------------------------------------------
// Shared assertion helpers
// ---------------------------------------------------------------------------

// The engine's iterative solver converges when surplus >= -$50 (not always exactly 0).
// Chart identity error = |surplus|, so max error is $50. Math.round() adds ~$5 more.
// Tolerance of $60 covers both sources.
const ROUNDING_TOLERANCE = 60;

/**
 * Assert the main chart identity for a single waterfall row:
 *   investmentGrowth + salarySurplus − expenseGap − debtPayment − taxDrain − meltdownTax
 *   = portfolioChange   (within ROUNDING_TOLERANCE)
 */
function assertChartIdentity(row, label = '') {
  const greenSum = row._growth + row._surplus;
  const redSum   = row._expenseGap + row._debtPayment + row._taxDrain + row._meltdownTax;
  // (red values are already negative in the chart data)
  const net = greenSum + redSum; // redSum is negative, so this is green − |red|
  const diff = Math.abs(net - row.portfolioChange);
  expect(diff, `${label} age ${row.age}: chart identity off by $${diff.toFixed(0)}`)
    .toBeLessThan(ROUNDING_TOLERANCE);
}

/**
 * Assert the tax decomposition invariant for a single row:
 *   taxDrain + meltdownTaxLeakage = portfolioFundedTax = totalTax − T_s
 */
function assertTaxDecomposition(row, projRow, label = '') {
  const taxableNPI   = (projRow.employmentIncome || 0)
                     + (projRow.cppIncome        || 0)
                     + (projRow.oasIncome        || 0)
                     + (projRow.pensionIncome     || 0);
  const hasPension   = projRow.pensionIncome > 0;
  const T_s          = calcTotalTax(taxableNPI, projRow.age, hasPension);
  const expectedPFT  = Math.max(0, (projRow.totalTax || 0) - T_s);
  const actualPFT    = row._taxDrainRaw + row._meltdownTaxRaw;
  const diff = Math.abs(actualPFT - expectedPFT);
  expect(diff, `${label} age ${row.age}: tax decomp off by $${diff.toFixed(0)}`)
    .toBeLessThan(ROUNDING_TOLERANCE);
  expect(row._taxDrainRaw,    `${label} age ${row.age}: taxDrain < 0`   ).toBeGreaterThanOrEqual(0);
  expect(row._meltdownTaxRaw, `${label} age ${row.age}: meltdownTax < 0`).toBeGreaterThanOrEqual(0);
}

/**
 * For non-meltdown years, additionally assert Identity 1:
 *   expenseGap + debtPayment + taxDrain = total portfolio withdrawals W
 */
function assertIdentity1NonMeltdown(row, projRow, label = '') {
  const W         = (projRow.rrspWithdrawal  || 0) + (projRow.tfsaWithdrawal  || 0)
                  + (projRow.nonRegWithdrawal || 0) + (projRow.otherWithdrawal || 0);
  const sumRed    = row._expenseGapRaw + row._debtPaymentRaw + row._taxDrainRaw; // no meltdown
  const diff      = Math.abs(sumRed - W);
  expect(diff, `${label} age ${row.age}: Identity 1 (non-meltdown) off by $${diff.toFixed(0)}`)
    .toBeLessThan(ROUNDING_TOLERANCE);
}

// ---------------------------------------------------------------------------
// Scenario 1: Margaret — retirement drawdown, no meltdown
// ---------------------------------------------------------------------------

describe('buildWaterfallData — retirement, no meltdown (Margaret)', () => {
  const scenario = margaret();
  const proj     = projectScenario(scenario);
  const wf       = buildWaterfallData(scenario, proj);

  it('returns one row per projection year', () => {
    expect(wf.length).toBe(proj.length);
  });

  it('depletes very late in retirement (post-depletion only from age 84+)', () => {
    // Margaret's portfolio lasts ~20 years; first post-depletion row should be at 84+.
    const firstDepletion = wf.find(r => r.isPostDepletion);
    if (firstDepletion) {
      expect(firstDepletion.age).toBeGreaterThanOrEqual(84);
    }
  });

  it('chart identity holds for every row', () => {
    wf.forEach(row => assertChartIdentity(row, 'Margaret'));
  });

  it('tax decomposition invariant holds for non-post-depletion rows', () => {
    wf.filter(r => !r.isPostDepletion)
      .forEach(row => assertTaxDecomposition(row, proj.find(p => p.age === row.age), 'Margaret'));
  });

  it('Identity 1 (sum_red = W) holds for non-post-depletion rows (no meltdown)', () => {
    wf.filter(r => !r.isPostDepletion)
      .forEach(row => assertIdentity1NonMeltdown(row, proj.find(p => p.age === row.age), 'Margaret'));
  });

  it('meltdownTax is 0 for every row (meltdown not enabled)', () => {
    wf.forEach(row => {
      expect(row._meltdownTaxRaw, `age ${row.age}`).toBe(0);
    });
  });

  it('investmentGrowth is positive in early retirement when portfolio is large', () => {
    // First year of retirement: portfolio > 0 and earns returns
    const firstRow = wf[0];
    expect(firstRow._growth).toBeGreaterThan(0);
  });

  it('salarySurplus is 0 (retired, no employment income)', () => {
    wf.forEach(row => {
      expect(row._surplus, `age ${row.age}`).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Rajesh — working + meltdown strategy
// ---------------------------------------------------------------------------

describe('buildWaterfallData — pre-retirement with RRSP meltdown (Rajesh)', () => {
  const scenario = rajesh();
  const proj     = projectScenario(scenario);
  const wf       = buildWaterfallData(scenario, proj);

  it('returns one row per projection year', () => {
    expect(wf.length).toBe(proj.length);
  });

  it('chart identity holds for every non-post-depletion row', () => {
    wf.filter(r => !r.isPostDepletion)
      .forEach(row => assertChartIdentity(row, 'Rajesh'));
  });

  it('tax decomposition invariant holds for every row', () => {
    wf.filter(r => !r.isPostDepletion)
      .forEach((row, i) => {
        const projIdx = proj.findIndex(p => p.age === row.age);
        assertTaxDecomposition(row, proj[projIdx], 'Rajesh');
      });
  });

  it('meltdownTax > 0 during meltdown years', () => {
    // Rajesh has salary > expenses; meltdown should generate tax leakage
    const meltdownRows = wf.filter(
      r => !r.isPostDepletion
        && r.age >= scenario.rrspMeltdownStartAge
        && r.age < scenario.rrspMeltdownTargetAge,
    );
    expect(meltdownRows.length).toBeGreaterThan(0);
    // At least some meltdown years should have non-zero leakage
    const hasLeakage = meltdownRows.some(r => r._meltdownTaxRaw > 0);
    expect(hasLeakage).toBe(true);
  });

  it('Identity 1 (sum_red = W) holds for non-meltdown rows only', () => {
    // Pre-retirement rows where meltdown is NOT active
    const nonMeltdownRows = wf.filter(r =>
      !r.isPostDepletion
      && (r.age < scenario.rrspMeltdownStartAge || r.age >= scenario.rrspMeltdownTargetAge),
    );
    nonMeltdownRows.forEach(row => {
      const projRow = proj.find(p => p.age === row.age);
      assertIdentity1NonMeltdown(row, projRow, 'Rajesh-nonMeltdown');
    });
  });

  it('salarySurplus > 0 during working years when salary covers expenses', () => {
    const workingRows = wf.filter(r => !r.isPostDepletion && r.age < scenario.retirementAge);
    // Rajesh earns $120K salary, expenses ~$84K/yr → should have salary surplus
    const hasSurplus = workingRows.some(r => r._surplus > 0);
    expect(hasSurplus).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Sam — portfolio depletion
// ---------------------------------------------------------------------------

describe('buildWaterfallData — portfolio depletion (Sam)', () => {
  const scenario = sam();
  const proj     = projectScenario(scenario);
  const wf       = buildWaterfallData(scenario, proj);

  it('has at least one post-depletion row', () => {
    expect(wf.some(r => r.isPostDepletion)).toBe(true);
  });

  it('post-depletion rows have investmentGrowth = 0', () => {
    wf.filter(r => r.isPostDepletion)
      .forEach(row => expect(row._growth, `age ${row.age}`).toBe(0));
  });

  it('post-depletion rows have salarySurplus = 0', () => {
    wf.filter(r => r.isPostDepletion)
      .forEach(row => expect(row._surplus, `age ${row.age}`).toBe(0));
  });

  it('post-depletion rows have only _shortfall as a non-zero red bar', () => {
    wf.filter(r => r.isPostDepletion).forEach(row => {
      expect(row._expenseGap,  `age ${row.age}`).toBe(0);
      expect(row._debtPayment, `age ${row.age}`).toBe(0);
      expect(row._taxDrain,    `age ${row.age}`).toBe(0);
      expect(row._meltdownTax, `age ${row.age}`).toBe(0);
      expect(row._shortfall,   `age ${row.age}`).toBeLessThan(0); // negative
      expect(row._shortfallRaw, `age ${row.age}`).toBeGreaterThan(0);
    });
  });

  it('non-post-depletion rows have _shortfall = 0', () => {
    wf.filter(r => !r.isPostDepletion)
      .forEach(row => expect(row._shortfall, `age ${row.age}`).toBe(0));
  });

  it('chart identity holds for non-post-depletion rows', () => {
    wf.filter(r => !r.isPostDepletion)
      .forEach(row => assertChartIdentity(row, 'Sam'));
  });

  it('tax decomposition holds for non-post-depletion rows', () => {
    wf.filter(r => !r.isPostDepletion).forEach((row) => {
      const projRow = proj.find(p => p.age === row.age);
      assertTaxDecomposition(row, projRow, 'Sam');
    });
  });

  it('shortfall is positive (expenses exceed CPP + OAS after depletion)', () => {
    const depletedRows = wf.filter(r => r.isPostDepletion);
    const avgShortfall = depletedRows.reduce((s, r) => s + r._shortfallRaw, 0) / depletedRows.length;
    expect(avgShortfall).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// buildWaterfallInsight — all three phases
// ---------------------------------------------------------------------------

describe('buildWaterfallInsight', () => {
  it('pre-retirement: names the biggest drain and a dollar amount', () => {
    const s    = { ...rajesh(), lifeExpectancy: 62 }; // only pre-ret years
    const proj = projectScenario(s);
    const wf   = buildWaterfallData(s, proj);
    const insight = buildWaterfallInsight(s, wf, proj);
    expect(insight).toMatch(/\$/); // has a dollar amount
    // Should be about debt, taxes, or expense gap
    expect(insight).toMatch(/drain|debt|tax|expense|growing/i);
  });

  it('retirement: mentions CPP / OAS / Pension coverage percentage', () => {
    const s    = margaret();
    const proj = projectScenario(s);
    const wf   = buildWaterfallData(s, proj);
    const insight = buildWaterfallInsight(s, wf, proj);
    expect(insight).toMatch(/\d+%/);   // has a percentage
    expect(insight).toMatch(/cover/i); // "cover X% of expenses"
  });

  it('post-depletion: mentions "empty" or "shortfall"', () => {
    const s    = sam();
    const proj = projectScenario(s);
    const wf   = buildWaterfallData(s, proj);
    // Force all-depleted view by using only depleted rows
    const allDepletedWF = wf.map(r => ({ ...r, isPostDepletion: true, _shortfallRaw: 5000 }));
    const insight = buildWaterfallInsight(s, allDepletedWF, proj);
    expect(insight).toMatch(/empty|shortfall/i);
    expect(insight).toMatch(/\$/);
  });

  it('returns a non-empty string for all personas', () => {
    for (const makeScenario of [margaret, rajesh, sam]) {
      const s    = makeScenario();
      const proj = projectScenario(s);
      const wf   = buildWaterfallData(s, proj);
      const insight = buildWaterfallInsight(s, wf, proj);
      expect(typeof insight).toBe('string');
      expect(insight.length).toBeGreaterThan(0);
    }
  });
});
