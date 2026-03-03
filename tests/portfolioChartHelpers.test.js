import { describe, it, expect } from 'vitest';
import {
  buildMilestones,
  buildPhaseAnnotations,
} from '../src/views/dashboard/portfolioChartHelpers.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeScenario(overrides = {}) {
  return {
    currentAge: 63,
    retirementAge: 67,
    lifeExpectancy: 90,
    cppStartAge: 65,
    oasStartAge: 65,
    rrspBalance: 200000,
    rrspMeltdownEnabled: false,
    rrspMeltdownAnnual: 0,
    rrspMeltdownStartAge: 67,
    consumerDebt: 0,
    employmentIncome: 60000,
    ...overrides,
  };
}

/** Build a minimal projection row for a working year. */
function makeWorkRow(age, overrides = {}) {
  return {
    age,
    employmentIncome: 60000,
    totalTax: 10000,
    expenses: 48000,
    debtPayments: 0,
    _portfolioDrain: 0,
    rrspWithdrawal: 0,
    tfsaWithdrawal: 0,
    cppIncome: 0,
    oasIncome: 0,
    pensionIncome: 0,
    gisIncome: 0,
    rrspBalance: 200000,
    ...overrides,
  };
}

/** Build a minimal projection row for a retired year. */
function makeRetiredRow(age, overrides = {}) {
  return {
    age,
    employmentIncome: 0,
    totalTax: 3000,
    expenses: 50000,
    debtPayments: 0,
    _portfolioDrain: 20000,
    rrspWithdrawal: 20000,
    tfsaWithdrawal: 0,
    cppIncome: 6240,
    oasIncome: 6000,
    pensionIncome: 0,
    gisIncome: 0,
    rrspBalance: 150000,
    ...overrides,
  };
}

// ─── buildMilestones ─────────────────────────────────────────────────────────

describe('buildMilestones', () => {
  it('returns a Retire marker at retirementAge', () => {
    const s = makeScenario();
    const rows = [makeWorkRow(63), makeRetiredRow(67)];
    const marks = buildMilestones(s, rows);
    expect(marks.some(m => m.label === 'Retire' && m.age === 67)).toBe(true);
  });

  it('excludes milestones outside [currentAge, lifeExpectancy]', () => {
    const s = makeScenario({ currentAge: 70, lifeExpectancy: 85, retirementAge: 67 });
    const rows = [makeRetiredRow(70)];
    const marks = buildMilestones(s, rows);
    // retirementAge 67 < currentAge 70 — should be excluded
    expect(marks.some(m => m.label === 'Retire')).toBe(false);
  });

  it('does not produce duplicate ages', () => {
    // retirementAge === cppStartAge → only one marker at that age
    const s = makeScenario({ retirementAge: 65, cppStartAge: 65 });
    const rows = [makeWorkRow(63), makeRetiredRow(65)];
    const marks = buildMilestones(s, rows);
    const ages = marks.map(m => m.age);
    expect(ages.length).toBe(new Set(ages).size);
  });

  it('assigns level 0 to the first milestone', () => {
    const s = makeScenario({ retirementAge: 63, cppStartAge: 70, oasStartAge: 70 });
    const rows = [makeWorkRow(63), makeRetiredRow(70)];
    const marks = buildMilestones(s, rows);
    const first = marks.find(m => m.age === 63);
    expect(first.level).toBe(0);
  });

  it('assigns level 1 to a milestone within 3 years of a level-0 milestone', () => {
    // Retire at 63, CPP at 65 (2 years apart → conflict)
    const s = makeScenario({ retirementAge: 63, cppStartAge: 65, oasStartAge: 75 });
    const rows = [makeWorkRow(63), makeRetiredRow(65), makeRetiredRow(75)];
    const marks = buildMilestones(s, rows);
    const retire = marks.find(m => m.label === 'Retire');
    const cpp = marks.find(m => m.label === 'CPP starts');
    expect(retire.level).toBe(0);
    expect(cpp.level).toBe(1);
  });

  it('assigns level 0 to a milestone more than 3 years after all others', () => {
    // Retire at 63, CPP at 70 (7 years apart → no conflict)
    const s = makeScenario({ retirementAge: 63, cppStartAge: 70, oasStartAge: 80 });
    const rows = [makeWorkRow(63), makeRetiredRow(70), makeRetiredRow(80)];
    const marks = buildMilestones(s, rows);
    const cpp = marks.find(m => m.label === 'CPP starts');
    expect(cpp.level).toBe(0);
  });

  it('handles three close milestones with levels 0, 1, 2', () => {
    // Retire 63, CPP 64 (1yr), OAS 65 (1yr) → levels 0, 1, 2
    const s = makeScenario({ retirementAge: 63, cppStartAge: 64, oasStartAge: 65 });
    const rows = Array.from({ length: 28 }, (_, i) => makeRetiredRow(63 + i));
    const marks = buildMilestones(s, rows);
    const retire = marks.find(m => m.label === 'Retire');
    const cpp = marks.find(m => m.label === 'CPP starts');
    const oas = marks.find(m => m.label === 'OAS starts');
    expect(retire.level).toBe(0);
    expect(cpp.level).toBe(1);
    expect(oas.level).toBe(2);
  });
});

// ─── buildPhaseAnnotations ───────────────────────────────────────────────────

describe('buildPhaseAnnotations', () => {
  it('returns empty array when there are no pre-retirement rows with drain', () => {
    const s = makeScenario({ currentAge: 67, retirementAge: 67 });
    // No pre-retirement rows (already retired)
    const rows = [makeRetiredRow(67)];
    const annotations = buildPhaseAnnotations(s, rows);
    // Pre-retirement card absent (no working rows before retirementAge)
    expect(annotations.find(a => a.phase === 'pre-retirement')).toBeUndefined();
  });

  it('omits pre-retirement card when drain is zero (salary covers everything)', () => {
    const s = makeScenario();
    const rows = [
      makeWorkRow(63, { _portfolioDrain: 0 }),
      makeWorkRow(64, { _portfolioDrain: 0 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    expect(annotations.find(a => a.phase === 'pre-retirement')).toBeUndefined();
  });

  it('includes pre-retirement card when drain > 0', () => {
    const s = makeScenario();
    const rows = [
      makeWorkRow(63, { _portfolioDrain: 34000, debtPayments: 36000 }),
      makeWorkRow(64, { _portfolioDrain: 34000, debtPayments: 36000 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    expect(annotations.find(a => a.phase === 'pre-retirement')).toBeDefined();
  });

  it('line1 contains formatted salary (e.g. "$60K")', () => {
    const s = makeScenario();
    const rows = [makeWorkRow(63, { _portfolioDrain: 10000 })];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.line1).toMatch(/\$60K/);
  });

  it('line1 includes net-after-tax salary', () => {
    const s = makeScenario();
    // employmentIncome 60000, totalTax 10000 → net ~50K
    const rows = [makeWorkRow(63, { _portfolioDrain: 10000, totalTax: 10000 })];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.line1).toMatch(/\$50K/);
  });

  it('line2 includes both expenses and debt when debtPayments > 0', () => {
    const s = makeScenario({ consumerDebt: 90000 });
    const rows = [
      makeWorkRow(63, { _portfolioDrain: 34000, debtPayments: 36000, expenses: 48000 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    // Should mention both expenses and debt
    expect(card.line2).toMatch(/expenses/i);
    expect(card.line2).toMatch(/debt/i);
  });

  it('line3 mentions the RRSP when rrspWithdrawal is the primary drain source', () => {
    const s = makeScenario();
    const rows = [
      makeWorkRow(63, { _portfolioDrain: 34000, rrspWithdrawal: 34000, totalTax: 10000 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.line3).toMatch(/RRSP/i);
  });

  it('line3 mentions TFSA when tfsaWithdrawal is the primary drain source', () => {
    const s = makeScenario();
    const rows = [
      makeWorkRow(63, { _portfolioDrain: 34000, tfsaWithdrawal: 34000, rrspWithdrawal: 0, totalTax: 10000 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.line3).toMatch(/TFSA/i);
  });

  it('line4 is present when consumerDebt > 0', () => {
    const s = makeScenario({ consumerDebt: 90000 });
    const rows = [
      makeWorkRow(63, { _portfolioDrain: 34000, debtPayments: 36000, totalTax: 10000 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.line4).toBeDefined();
    expect(card.line4).toMatch(/debt/i);
  });

  it('line4 is absent when consumerDebt === 0', () => {
    const s = makeScenario({ consumerDebt: 0 });
    const rows = [
      makeWorkRow(63, { _portfolioDrain: 10000, totalTax: 10000 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card?.line4).toBeUndefined();
  });

  it('returns early-retirement card for scenario retired from start', () => {
    const s = makeScenario({ currentAge: 67, retirementAge: 67 });
    const rows = [
      makeRetiredRow(67),
      makeRetiredRow(68),
      makeRetiredRow(69),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    expect(annotations.find(a => a.phase === 'early-retirement')).toBeDefined();
  });

  it('early-retirement card omits debt line when debtPayments is zero', () => {
    const s = makeScenario({ currentAge: 67, retirementAge: 67, consumerDebt: 0 });
    const rows = [
      makeRetiredRow(67, { debtPayments: 0 }),
      makeRetiredRow(68, { debtPayments: 0 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'early-retirement');
    expect(card?.line4).toBeUndefined();
  });

  it('ages range string is correct', () => {
    const s = makeScenario();
    const rows = [
      makeWorkRow(63, { _portfolioDrain: 10000 }),
      makeWorkRow(64, { _portfolioDrain: 10000 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.ages).toBe('63–64');
  });
});

// ─── buildPhaseAnnotations — accumulation card ──────────────────────────────

describe('buildPhaseAnnotations — accumulation card', () => {
  /** Young scenario with long accumulation phase (age 34 → retire 65). */
  function makeAccumScenario(overrides = {}) {
    return makeScenario({
      currentAge: 34,
      retirementAge: 65,
      rrspBalance: 50000,
      tfsaBalance: 30000,
      cashSavings: 10000,
      nonRegInvestments: 5000,
      mortgageBalance: 0,
      consumerDebt: 0,
      ...overrides,
    });
  }

  /** Build an accumulation work row (no drain, positive surplus deposits). */
  function makeAccumRow(age, overrides = {}) {
    return makeWorkRow(age, {
      _portfolioDrain: 0,
      tfsaDeposit: 7000,
      nonRegDeposit: 5000,
      mortgageBalance: 0,
      totalPortfolio: 500000,
      ...overrides,
    });
  }

  function accumRows(startAge, endAge, overrides = {}) {
    return Array.from({ length: endAge - startAge + 1 }, (_, i) =>
      makeAccumRow(startAge + i, overrides),
    );
  }

  it('shows accumulation card when no drain and retAge - currentAge > 5', () => {
    const s = makeAccumScenario();
    const rows = accumRows(34, 64);
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card).toBeDefined();
    expect(card.line1).toMatch(/Salary covers/);
    expect(card.line2).toMatch(/surplus invested/);
  });

  it('omits accumulation card when retAge - currentAge <= 5 (near-retiree)', () => {
    const s = makeAccumScenario({ currentAge: 63, retirementAge: 67 });
    const rows = accumRows(63, 66);
    const annotations = buildPhaseAnnotations(s, rows);
    expect(annotations.find(a => a.phase === 'pre-retirement')).toBeUndefined();
  });

  it('omits accumulation card when maxSurplus is 0', () => {
    const s = makeAccumScenario();
    const rows = accumRows(34, 64, { tfsaDeposit: 0, nonRegDeposit: 0 });
    const annotations = buildPhaseAnnotations(s, rows);
    expect(annotations.find(a => a.phase === 'pre-retirement')).toBeUndefined();
  });

  it('line1 mentions mortgage when mortgageBalance > 0', () => {
    const s = makeAccumScenario({ mortgageBalance: 200000 });
    const rows = accumRows(34, 64);
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.line1).toMatch(/mortgage/);
  });

  it('line1 omits mortgage when mortgageBalance === 0', () => {
    const s = makeAccumScenario({ mortgageBalance: 0 });
    const rows = accumRows(34, 64);
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.line1).not.toMatch(/mortgage/);
  });

  it('line2 shows range when min and max differ by > $1K', () => {
    const s = makeAccumScenario();
    const rows = [
      makeAccumRow(34, { tfsaDeposit: 3000, nonRegDeposit: 0 }),
      makeAccumRow(35, { tfsaDeposit: 7000, nonRegDeposit: 5000 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    // Should contain an en-dash range like "$3K–$12K/yr"
    expect(card.line2).toMatch(/\$\d.*–.*\$\d/);
  });

  it('line2 shows single value when range < $1K', () => {
    const s = makeAccumScenario();
    const rows = accumRows(34, 64, { tfsaDeposit: 7000, nonRegDeposit: 5000 });
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    // Should NOT contain range (no en-dash between two dollar amounts)
    expect(card.line2).not.toMatch(/\$\d.*–.*\$\d/);
  });

  it('shows mortgage payoff line when payoff detected', () => {
    const s = makeAccumScenario({ mortgageBalance: 200000 });
    const rows = [
      makeAccumRow(34, { mortgageBalance: 100000 }),
      makeAccumRow(35, { mortgageBalance: 50000 }),
      makeAccumRow(36, { mortgageBalance: 0 }),
      makeAccumRow(37, { mortgageBalance: 0 }),
    ];
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    expect(card.line3).toMatch(/Mortgage paid off at 36/);
  });

  it('shows growth percentage line', () => {
    const s = makeAccumScenario({
      rrspBalance: 50000,
      tfsaBalance: 30000,
      cashSavings: 10000,
      nonRegInvestments: 5000,
    });
    // originalSavings = 95000, portfolioAtRetirement = 500000
    // growthPercent = round((500000 - 95000) / 500000 * 100) = 81%
    const rows = accumRows(34, 64, { totalPortfolio: 500000 });
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    const growthLine = card.line3 || card.line4;
    expect(growthLine).toMatch(/81%.*compounding/);
  });

  it('omits growth line when portfolio <= original savings', () => {
    const s = makeAccumScenario({
      rrspBalance: 200000,
      tfsaBalance: 100000,
      cashSavings: 50000,
      nonRegInvestments: 50000,
    });
    // originalSavings = 400000, portfolioAtRetirement = 300000 (less than original)
    const rows = accumRows(34, 64, { totalPortfolio: 300000 });
    const annotations = buildPhaseAnnotations(s, rows);
    const card = annotations.find(a => a.phase === 'pre-retirement');
    // Should have line1 and line2 but no growth line
    expect(card.line1).toBeDefined();
    expect(card.line2).toBeDefined();
    expect(card.line3).toBeUndefined();
    expect(card.line4).toBeUndefined();
  });
});
