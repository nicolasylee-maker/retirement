import { COLORS } from '../../constants/designTokens.js';

/** Format a dollar value as "$XK" or "$X.XK". */
export function fmtK(val) {
  const k = val / 1000;
  const rounded = Math.round(k * 10) / 10;
  const display = rounded % 1 === 0 ? Math.round(rounded) : rounded;
  return `$${display}K`;
}

/**
 * Build milestone markers for the portfolio chart.
 * Each marker gets a stagger `level` (0, 1, 2…) so labels never overlap.
 * Level is assigned greedily: lowest level not already used by a milestone
 * within 3 age-years.
 */
export function buildMilestones(scenario, projectionData) {
  const marks = [];
  const ages = new Set();

  const add = (age, label, color) => {
    if (age >= scenario.currentAge && age <= scenario.lifeExpectancy && !ages.has(age)) {
      ages.add(age);
      marks.push({ age, label, color });
    }
  };

  add(scenario.retirementAge, 'Retire', COLORS.lake.main);
  add(scenario.cppStartAge, 'CPP starts', '#16a34a');
  add(scenario.oasStartAge, 'OAS starts', '#059669');
  if (scenario.rrspBalance > 0 && 72 >= scenario.currentAge) {
    add(72, 'RRIF convert', '#d97706');
  }

  if (scenario.rrspMeltdownEnabled && scenario.rrspMeltdownAnnual > 0) {
    const meltdownStart = scenario.rrspMeltdownStartAge ?? scenario.retirementAge;
    if (!ages.has(meltdownStart)) {
      add(meltdownStart, 'RRSP meltdown starts', '#9333ea');
    }
    const rrspDepletedRow = projectionData.find(
      (r, i) => i > 0 && r.rrspBalance <= 0 && projectionData[i - 1].rrspBalance > 0,
    );
    if (rrspDepletedRow) {
      add(rrspDepletedRow.age, 'RRSP empty', '#9333ea');
    }
  }

  // Assign stagger levels: greedy lowest-unused-level within ±3 years
  marks.sort((a, b) => a.age - b.age);
  for (let i = 0; i < marks.length; i++) {
    const usedLevels = new Set();
    for (let j = 0; j < i; j++) {
      if (Math.abs(marks[i].age - marks[j].age) <= 3) {
        usedLevels.add(marks[j].level);
      }
    }
    let level = 0;
    while (usedLevels.has(level)) level++;
    marks[i].level = level;
  }

  return marks;
}

const avg = (rows, key) => rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length;

function drainSource(rows) {
  const rrsp = avg(rows, 'rrspWithdrawal');
  const tfsa = avg(rows, 'tfsaWithdrawal');
  if (rrsp > 0 && rrsp >= tfsa) return 'your RRSP';
  if (tfsa > 0) return 'your TFSA';
  return 'your savings';
}

function buildNeedLine(avgExpenses, avgDebt) {
  if (avgDebt > 0) {
    return `Total need: ${fmtK(avgExpenses + avgDebt)} (expenses ${fmtK(avgExpenses)} + debt ${fmtK(avgDebt)}).`;
  }
  return `Total need: ${fmtK(avgExpenses)} in expenses.`;
}

/**
 * Build phase annotation cards for the portfolio chart.
 * Returns up to 2 cards: pre-retirement (working + drain) and early-retirement.
 * Each card has: { phase, ages, line1, line2, line3, line4? }
 */
export function buildPhaseAnnotations(scenario, projectionData) {
  const annotations = [];
  const retAge = scenario.retirementAge;

  // ── Pre-retirement ──────────────────────────────────────────────────────
  const preRetRows = projectionData.filter(
    r => r.age < retAge && r.employmentIncome > 0,
  );
  if (preRetRows.length > 0) {
    const avgSalary = avg(preRetRows, 'employmentIncome');
    const avgTax    = avg(preRetRows, 'totalTax');
    const avgExp    = avg(preRetRows, 'expenses');
    const avgDebt   = avg(preRetRows, 'debtPayments');
    const avgDrain  = avg(preRetRows, '_portfolioDrain');

    if (avgDrain > 0) {
      const netSalary = Math.max(0, avgSalary - avgTax);
      const source = drainSource(preRetRows);

      const annotation = {
        phase: 'pre-retirement',
        ages: `${preRetRows[0].age}\u2013${preRetRows[preRetRows.length - 1].age}`,
        line1: `Your ${fmtK(avgSalary)} salary nets ~${fmtK(netSalary)} after-tax.`,
        line2: buildNeedLine(avgExp, avgDebt),
        line3: `The ${fmtK(avgDrain)}/yr gap is drawn from ${source}.`,
      };
      if (scenario.consumerDebt > 0) {
        annotation.line4 = 'Without the consumer debt, your portfolio would barely drop.';
      }
      annotations.push(annotation);
    }
  }

  // ── Early retirement ────────────────────────────────────────────────────
  const earlyRetEnd = Math.min(retAge + 5, scenario.lifeExpectancy);
  const earlyRetRows = projectionData.filter(
    r => r.age >= retAge && r.age < earlyRetEnd,
  );
  if (earlyRetRows.length > 0) {
    const avgCpp     = avg(earlyRetRows, 'cppIncome');
    const avgOas     = avg(earlyRetRows, 'oasIncome');
    const avgPension = avg(earlyRetRows, 'pensionIncome');
    const avgGis     = avg(earlyRetRows, 'gisIncome');
    const avgExp     = avg(earlyRetRows, 'expenses');
    const avgDebt    = avg(earlyRetRows, 'debtPayments');
    const avgDrain   = avg(earlyRetRows, '_portfolioDrain');

    if (avgDrain > 0) {
      const govtIncome = avgCpp + avgOas + avgPension + avgGis;
      const source = drainSource(earlyRetRows);

      const parts = [];
      if (avgCpp > 0) parts.push('CPP');
      if (avgOas > 0) parts.push('OAS');
      if (avgPension > 0) parts.push('Pension');
      if (avgGis > 0) parts.push('GIS');
      const incomeLabel = parts.join(' + ') || 'Benefits';

      const annotation = {
        phase: 'early-retirement',
        ages: `${earlyRetRows[0].age}\u2013${earlyRetRows[earlyRetRows.length - 1].age}`,
        line1: `${incomeLabel}: ${fmtK(govtIncome)}/yr.`,
        line2: buildNeedLine(avgExp, avgDebt),
        line3: `The ${fmtK(avgDrain)}/yr gap is drawn from ${source}.`,
      };
      if (scenario.consumerDebt > 0 && avgDebt > 0) {
        annotation.line4 = "Without the consumer debt, you'd need much less from your portfolio.";
      }
      annotations.push(annotation);
    }
  }

  return annotations;
}
