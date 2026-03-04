import { describe, it, expect } from 'vitest';
import {
  DIFF_FIELDS,
  computeDiffDrivers,
  getPhaseRanges,
  computePhaseSummary,
  computePhaseStatus,
  computeMonthlySnapshots,
  SNAPSHOT_AGES,
} from '../src/utils/compareAnalysis';
import { createDefaultScenario } from '../src/constants/defaults';

// Helper: build a minimal projection array
function makeProjection(ages, overrides = {}) {
  return ages.map(age => ({
    age,
    totalPortfolio: 500000 - (age - 60) * 10000,
    rrspBalance: 200000 - (age - 60) * 5000,
    tfsaBalance: 100000,
    nonRegBalance: 100000,
    afterTaxIncome: 60000,
    expenses: 48000,
    debtPayments: 0,
    tfsaDeposit: 1000,
    nonRegDeposit: 500,
    ...overrides,
    ...(typeof overrides === 'function' ? overrides(age) : {}),
  }));
}

function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// -------------------------------------------------------------------------
// computeDiffDrivers
// -------------------------------------------------------------------------
describe('computeDiffDrivers', () => {
  it('returns empty array for identical scenarios', () => {
    const a = createDefaultScenario('A');
    const b = { ...a, id: 'other', name: 'B', createdAt: 'x' };
    const diffs = computeDiffDrivers(a, b);
    expect(diffs).toEqual([]);
  });

  it('detects a single field change', () => {
    const a = createDefaultScenario('A');
    const b = { ...a, monthlyExpenses: 6000 };
    const diffs = computeDiffDrivers(a, b);
    expect(diffs.length).toBeGreaterThanOrEqual(1);
    const expDiff = diffs.find(d => d.key === 'monthlyExpenses');
    expect(expDiff).toBeDefined();
    expect(expDiff.valueA).toBe(4000);
    expect(expDiff.valueB).toBe(6000);
  });

  it('detects multiple changes and sorts by magnitude', () => {
    const a = createDefaultScenario('A');
    const b = { ...a, monthlyExpenses: 6000, retirementAge: 60, rrspBalance: 500000 };
    const diffs = computeDiffDrivers(a, b);
    expect(diffs.length).toBe(3);
    // RRSP ($500K diff) should be first
    expect(diffs[0].key).toBe('rrspBalance');
  });

  it('ignores metadata fields (id, name, createdAt)', () => {
    const a = createDefaultScenario('A');
    const b = { ...a, id: 'different', name: 'Different', createdAt: 'other' };
    const diffs = computeDiffDrivers(a, b);
    expect(diffs.find(d => d.key === 'id')).toBeUndefined();
    expect(diffs.find(d => d.key === 'name')).toBeUndefined();
    expect(diffs.find(d => d.key === 'createdAt')).toBeUndefined();
  });

  it('handles float tolerance', () => {
    const a = createDefaultScenario('A');
    const b = { ...a, realReturn: 0.04 + 1e-10 };
    const diffs = computeDiffDrivers(a, b);
    expect(diffs.find(d => d.key === 'realReturn')).toBeUndefined();
  });

  it('formats booleans as Yes/No', () => {
    const a = createDefaultScenario('A');
    const b = { ...a, rrspMeltdownEnabled: true };
    const diffs = computeDiffDrivers(a, b);
    const meltdown = diffs.find(d => d.key === 'rrspMeltdownEnabled');
    expect(meltdown.fmtA).toBe('No');
    expect(meltdown.fmtB).toBe('Yes');
  });

  it('compares arrays by content', () => {
    const a = createDefaultScenario('A');
    const b = { ...a, withdrawalOrder: ['rrsp', 'tfsa', 'nonReg', 'other'] };
    const diffs = computeDiffDrivers(a, b);
    const wo = diffs.find(d => d.key === 'withdrawalOrder');
    expect(wo).toBeDefined();
    expect(wo.fmtA).toBe('tfsa → nonReg → rrsp → other');
    expect(wo.fmtB).toBe('rrsp → tfsa → nonReg → other');
  });

  it('returns empty for null inputs', () => {
    expect(computeDiffDrivers(null, null)).toEqual([]);
    expect(computeDiffDrivers(createDefaultScenario(), null)).toEqual([]);
  });
});

// -------------------------------------------------------------------------
// getPhaseRanges
// -------------------------------------------------------------------------
describe('getPhaseRanges', () => {
  it('returns standard 4 phases for typical scenario', () => {
    const s = createDefaultScenario();
    // currentAge=60, retirementAge=65, lifeExpectancy=90
    const phases = getPhaseRanges(s);
    expect(phases.map(p => p.id)).toEqual(['working', 'early-retirement', 'rrif', 'estate']);
    expect(phases[0]).toMatchObject({ startAge: 60, endAge: 64 });
    expect(phases[1]).toMatchObject({ startAge: 65, endAge: 71 });
    expect(phases[2]).toMatchObject({ startAge: 72, endAge: 90 });
    expect(phases[3]).toMatchObject({ startAge: 90, endAge: 90 });
  });

  it('skips working phase when already retired', () => {
    const s = { ...createDefaultScenario(), currentAge: 70, retirementAge: 65 };
    const phases = getPhaseRanges(s);
    expect(phases.find(p => p.id === 'working')).toBeUndefined();
  });

  it('skips early-retirement when retiring after 71', () => {
    const s = { ...createDefaultScenario(), retirementAge: 75 };
    const phases = getPhaseRanges(s);
    expect(phases.find(p => p.id === 'early-retirement')).toBeUndefined();
  });

  it('skips RRIF phase when lifeExpectancy < 72', () => {
    const s = { ...createDefaultScenario(), lifeExpectancy: 70 };
    const phases = getPhaseRanges(s);
    expect(phases.find(p => p.id === 'rrif')).toBeUndefined();
  });

  it('always includes estate phase', () => {
    const s = { ...createDefaultScenario(), lifeExpectancy: 65 };
    const phases = getPhaseRanges(s);
    expect(phases.find(p => p.id === 'estate')).toBeDefined();
  });

  it('returns empty for null input', () => {
    expect(getPhaseRanges(null)).toEqual([]);
  });
});

// -------------------------------------------------------------------------
// computePhaseSummary
// -------------------------------------------------------------------------
describe('computePhaseSummary', () => {
  it('computes avg savings using deposits, not surplus', () => {
    const proj = range(60, 65).map(age => ({
      age,
      totalPortfolio: 500000,
      rrspBalance: 200000,
      tfsaBalance: 100000,
      nonRegBalance: 100000,
      tfsaDeposit: 2000,
      nonRegDeposit: 1000,
      surplus: 0, // always 0 in projection engine
      debtPayments: 0,
    }));
    const phase = { startAge: 60, endAge: 65 };
    const summary = computePhaseSummary(proj, phase);
    expect(summary.avgAnnualSavings).toBe(3000); // (2000+1000) per year
  });

  it('detects portfolio depletion event', () => {
    const proj = range(72, 90).map(age => ({
      age,
      totalPortfolio: age < 85 ? 100000 : 0,
      rrspBalance: 50000,
      tfsaBalance: 50000,
      nonRegBalance: 0,
      tfsaDeposit: 0,
      nonRegDeposit: 0,
      debtPayments: 0,
    }));
    const phase = { startAge: 72, endAge: 90 };
    const summary = computePhaseSummary(proj, phase);
    expect(summary.events.find(e => e.label === 'Portfolio depleted')).toBeDefined();
    expect(summary.events.find(e => e.label === 'Portfolio depleted').age).toBe(85);
  });

  it('detects mortgage payoff', () => {
    const proj = range(60, 70).map(age => ({
      age,
      totalPortfolio: 500000,
      rrspBalance: 200000,
      tfsaBalance: 100000,
      nonRegBalance: 100000,
      tfsaDeposit: 0,
      nonRegDeposit: 0,
      debtPayments: age < 65 ? 12000 : 0,
    }));
    const phase = { startAge: 60, endAge: 70 };
    const summary = computePhaseSummary(proj, phase);
    expect(summary.events.find(e => e.label === 'Mortgage paid off')).toBeDefined();
  });

  it('returns null for empty phase', () => {
    const proj = range(60, 70).map(age => ({
      age, totalPortfolio: 100000, rrspBalance: 0, tfsaBalance: 0,
      nonRegBalance: 0, tfsaDeposit: 0, nonRegDeposit: 0, debtPayments: 0,
    }));
    const phase = { startAge: 80, endAge: 90 };
    expect(computePhaseSummary(proj, phase)).toBeNull();
  });

  it('returns null for null inputs', () => {
    expect(computePhaseSummary(null, null)).toBeNull();
    expect(computePhaseSummary([], { startAge: 60, endAge: 70 })).toBeNull();
  });
});

// -------------------------------------------------------------------------
// computePhaseStatus
// -------------------------------------------------------------------------
describe('computePhaseStatus', () => {
  it('returns green when portfolio is stable', () => {
    const summary = {
      portfolioStart: 500000,
      portfolioEnd: 490000,
      avgAnnualSavings: 1000,
      events: [],
    };
    expect(computePhaseStatus(summary)).toBe('green');
  });

  it('returns red when portfolio depletes', () => {
    const summary = {
      portfolioStart: 500000,
      portfolioEnd: 0,
      avgAnnualSavings: 0,
      events: [{ label: 'Portfolio depleted', age: 85 }],
    };
    expect(computePhaseStatus(summary)).toBe('red');
  });

  it('returns yellow when portfolio declines >5%', () => {
    const summary = {
      portfolioStart: 500000,
      portfolioEnd: 400000, // 20% decline
      avgAnnualSavings: 0,
      events: [],
    };
    expect(computePhaseStatus(summary)).toBe('yellow');
  });

  it('returns yellow when any account depletes (not portfolio)', () => {
    const summary = {
      portfolioStart: 500000,
      portfolioEnd: 490000,
      avgAnnualSavings: 0,
      events: [{ label: 'RRSP depleted', age: 75 }],
    };
    expect(computePhaseStatus(summary)).toBe('yellow');
  });

  it('returns green for zero portfolio (no decline possible)', () => {
    const summary = {
      portfolioStart: 0,
      portfolioEnd: 0,
      avgAnnualSavings: 0,
      events: [],
    };
    expect(computePhaseStatus(summary)).toBe('green');
  });

  it('returns gray for null summary', () => {
    expect(computePhaseStatus(null)).toBe('gray');
  });

  it('5% threshold boundary — exactly 5% is green', () => {
    const summary = {
      portfolioStart: 100000,
      portfolioEnd: 95000, // exactly 5%
      avgAnnualSavings: 0,
      events: [],
    };
    expect(computePhaseStatus(summary)).toBe('green');
  });
});

// -------------------------------------------------------------------------
// computeMonthlySnapshots
// -------------------------------------------------------------------------
describe('computeMonthlySnapshots', () => {
  it('returns snapshots at SNAPSHOT_AGES', () => {
    const proj = range(60, 90).map(age => ({
      age,
      afterTaxIncome: 60000,
      expenses: 48000,
      debtPayments: 0,
      totalPortfolio: 500000 - (age - 60) * 10000,
    }));
    const snaps = computeMonthlySnapshots(proj);
    expect(snaps.map(s => s.age)).toEqual([65, 72, 80, 85]);
  });

  it('skips ages beyond life expectancy', () => {
    const proj = range(60, 75).map(age => ({
      age,
      afterTaxIncome: 60000,
      expenses: 48000,
      debtPayments: 0,
      totalPortfolio: 500000,
    }));
    const snaps = computeMonthlySnapshots(proj);
    expect(snaps.map(s => s.age)).toEqual([65, 72]); // 80 and 85 filtered out
  });

  it('computes surplus correctly using afterTaxIncome - expenses - debtPayments', () => {
    const proj = range(60, 90).map(age => ({
      age,
      afterTaxIncome: 72000, // $6000/mo
      expenses: 48000, // $4000/mo
      debtPayments: 6000, // $500/mo
      totalPortfolio: 400000,
    }));
    const snaps = computeMonthlySnapshots(proj);
    const snap65 = snaps.find(s => s.age === 65);
    expect(snap65.monthlyIncome).toBe(6000);
    expect(snap65.monthlyExpenses).toBe(4500); // expenses + debt
    expect(snap65.monthlySurplus).toBe(1500);
  });

  it('returns empty for null projection', () => {
    expect(computeMonthlySnapshots(null)).toEqual([]);
    expect(computeMonthlySnapshots([])).toEqual([]);
  });

  it('supports custom ages', () => {
    const proj = range(60, 90).map(age => ({
      age,
      afterTaxIncome: 60000,
      expenses: 48000,
      debtPayments: 0,
      totalPortfolio: 500000,
    }));
    const snaps = computeMonthlySnapshots(proj, [70, 75]);
    expect(snaps.map(s => s.age)).toEqual([70, 75]);
  });
});
