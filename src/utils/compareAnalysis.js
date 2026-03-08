/**
 * Pure computation utilities for Compare tab analysis.
 * No React imports — independently testable.
 */

// ---------------------------------------------------------------------------
// DIFF_FIELDS — scenario fields to compare, with display metadata
// ---------------------------------------------------------------------------
export const DIFF_FIELDS = [
  // Ages
  { key: 'currentAge', label: 'Current Age', fmt: v => String(v), unit: 'year' },
  { key: 'retirementAge', label: 'Retirement Age', fmt: v => String(v), unit: 'year' },
  { key: 'lifeExpectancy', label: 'Life Expectancy', fmt: v => String(v), unit: 'year' },
  { key: 'spouseAge', label: 'Spouse Age', fmt: v => String(v), unit: 'year' },
  { key: 'spouseRetirementAge', label: 'Spouse Retirement Age', fmt: v => String(v), unit: 'year' },

  // Income & Employment
  { key: 'employmentIncome', label: 'Employment Income', fmt: fmtDollar, unit: 'dollar' },
  { key: 'stillWorking', label: 'Still Working', fmt: fmtBool, unit: 'boolean' },
  { key: 'spouseEmploymentIncome', label: 'Spouse Employment Income', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spouseStillWorking', label: 'Spouse Still Working', fmt: fmtBool, unit: 'boolean' },
  { key: 'nonTaxedIncome', label: 'Non-Taxed Income', fmt: fmtDollar, unit: 'dollar' },
  { key: 'nonTaxedIncomeStartAge', label: 'Non-Taxed Income Start Age', fmt: v => String(v), unit: 'year' },
  { key: 'nonTaxedIncomeEndAge', label: 'Non-Taxed Income End Age', fmt: v => String(v), unit: 'year' },

  // Government Benefits
  { key: 'cppMonthly', label: 'CPP Monthly', fmt: fmtDollar, unit: 'dollar' },
  { key: 'cppStartAge', label: 'CPP Start Age', fmt: v => String(v), unit: 'year' },
  { key: 'oasMonthly', label: 'OAS Monthly', fmt: fmtDollar, unit: 'dollar' },
  { key: 'oasStartAge', label: 'OAS Start Age', fmt: v => String(v), unit: 'year' },
  { key: 'spouseCppMonthly', label: 'Spouse CPP Monthly', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spouseCppStartAge', label: 'Spouse CPP Start Age', fmt: v => String(v), unit: 'year' },
  { key: 'spouseOasMonthly', label: 'Spouse OAS Monthly', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spouseOasStartAge', label: 'Spouse OAS Start Age', fmt: v => String(v), unit: 'year' },
  { key: 'gisEligible', label: 'GIS Eligible', fmt: fmtBool, unit: 'boolean' },
  { key: 'gainsEligible', label: 'GAINS Eligible', fmt: fmtBool, unit: 'boolean' },

  // Pensions
  { key: 'pensionType', label: 'Pension Type', fmt: v => String(v), unit: 'other' },
  { key: 'dbPensionAnnual', label: 'DB Pension Annual', fmt: fmtDollar, unit: 'dollar' },
  { key: 'dbPensionStartAge', label: 'DB Pension Start Age', fmt: v => String(v), unit: 'year' },
  { key: 'dbPensionIndexed', label: 'DB Pension Indexed', fmt: fmtBool, unit: 'boolean' },
  { key: 'dcPensionBalance', label: 'DC Pension Balance', fmt: fmtDollar, unit: 'dollar' },
  { key: 'liraBalance', label: 'LIRA Balance', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spousePensionType', label: 'Spouse Pension Type', fmt: v => String(v), unit: 'other' },
  { key: 'spouseDbPensionAnnual', label: 'Spouse DB Pension', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spouseDbPensionStartAge', label: 'Spouse DB Pension Start Age', fmt: v => String(v), unit: 'year' },
  { key: 'spouseDbPensionIndexed', label: 'Spouse DB Indexed', fmt: fmtBool, unit: 'boolean' },
  { key: 'spouseDcPensionBalance', label: 'Spouse DC Pension', fmt: fmtDollar, unit: 'dollar' },

  // Savings & Balances
  { key: 'rrspBalance', label: 'RRSP Balance', fmt: fmtDollar, unit: 'dollar' },
  { key: 'tfsaBalance', label: 'TFSA Balance', fmt: fmtDollar, unit: 'dollar' },
  { key: 'rrifBalance', label: 'RRIF Balance', fmt: fmtDollar, unit: 'dollar' },
  { key: 'otherRegisteredBalance', label: 'Other Registered', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spouseRrspBalance', label: 'Spouse RRSP', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spouseRrifBalance', label: 'Spouse RRIF', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spouseTfsaBalance', label: 'Spouse TFSA', fmt: fmtDollar, unit: 'dollar' },
  { key: 'spouseTfsaContributionRoom', label: 'Spouse TFSA Room', fmt: fmtDollar, unit: 'dollar' },
  { key: 'cashSavings', label: 'Cash Savings', fmt: fmtDollar, unit: 'dollar' },
  { key: 'nonRegInvestments', label: 'Non-Reg Investments', fmt: fmtDollar, unit: 'dollar' },
  { key: 'realEstateValue', label: 'Real Estate Value', fmt: fmtDollar, unit: 'dollar' },
  { key: 'otherAssets', label: 'Other Assets', fmt: fmtDollar, unit: 'dollar' },

  // Liabilities
  { key: 'mortgageBalance', label: 'Mortgage Balance', fmt: fmtDollar, unit: 'dollar' },
  { key: 'mortgageRate', label: 'Mortgage Rate', fmt: fmtPct, unit: 'percent' },
  { key: 'mortgageYearsLeft', label: 'Mortgage Years Left', fmt: v => String(v), unit: 'year' },
  { key: 'consumerDebt', label: 'Consumer Debt', fmt: fmtDollar, unit: 'dollar' },
  { key: 'consumerDebtRate', label: 'Consumer Debt Rate', fmt: fmtPct, unit: 'percent' },
  { key: 'consumerDebtPayoffAge', label: 'Consumer Debt Payoff Age', fmt: v => String(v), unit: 'year' },
  { key: 'otherDebt', label: 'Other Debt', fmt: fmtDollar, unit: 'dollar' },
  { key: 'otherDebtPayoffAge', label: 'Other Debt Payoff Age', fmt: v => String(v), unit: 'year' },

  // Expenses & Assumptions
  { key: 'monthlySavings', label: 'Monthly Savings', fmt: fmtDollar, unit: 'dollar' },
  { key: 'monthlyExpenses', label: 'Monthly Expenses', fmt: fmtDollar, unit: 'dollar' },
  { key: 'expensesIncludeDebt', label: 'Expenses Include Debt', fmt: fmtBool, unit: 'boolean' },
  { key: 'expenseReductionAtRetirement', label: 'Expense Reduction at Retirement', fmt: fmtPct, unit: 'percent' },
  { key: 'inflationRate', label: 'Inflation Rate', fmt: fmtPct, unit: 'percent' },
  { key: 'realReturn', label: 'Real Return', fmt: fmtPct, unit: 'percent' },
  { key: 'tfsaReturn', label: 'TFSA Return', fmt: fmtPct, unit: 'percent' },
  { key: 'nonRegReturn', label: 'Non-Reg Return', fmt: fmtPct, unit: 'percent' },

  // Withdrawal Strategy
  { key: 'withdrawalOrder', label: 'Withdrawal Order', fmt: v => (Array.isArray(v) ? v.join(' → ') : String(v)), unit: 'other' },
  { key: 'rrspMeltdownEnabled', label: 'RRSP Meltdown', fmt: fmtBool, unit: 'boolean' },
  { key: 'rrspMeltdownAnnual', label: 'RRSP Meltdown Annual', fmt: fmtDollar, unit: 'dollar' },
  { key: 'rrspMeltdownStartAge', label: 'Meltdown Start Age', fmt: v => String(v), unit: 'year' },
  { key: 'rrspMeltdownTargetAge', label: 'Meltdown Target Age', fmt: v => String(v), unit: 'year' },

  // Couple
  { key: 'isCouple', label: 'Couple Plan', fmt: fmtBool, unit: 'boolean' },

  // Estate
  { key: 'hasWill', label: 'Has Will', fmt: fmtBool, unit: 'boolean' },
  { key: 'primaryBeneficiary', label: 'Primary Beneficiary', fmt: v => String(v), unit: 'other' },
  { key: 'numberOfChildren', label: 'Number of Children', fmt: v => String(v), unit: 'other' },
];

// ---------------------------------------------------------------------------
// Formatting helpers (internal)
// ---------------------------------------------------------------------------
function fmtDollar(v) {
  return `$${Number(v || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}`;
}

function fmtPct(v) {
  return `${(Number(v || 0) * 100).toFixed(1)}%`;
}

function fmtBool(v) {
  return v ? 'Yes' : 'No';
}

// ---------------------------------------------------------------------------
// computeDiffDrivers — returns fields that differ between two scenarios
// ---------------------------------------------------------------------------
export function computeDiffDrivers(scenarioA, scenarioB) {
  if (!scenarioA || !scenarioB) return [];

  const diffs = [];
  for (const field of DIFF_FIELDS) {
    const a = scenarioA[field.key];
    const b = scenarioB[field.key];

    if (!valuesEqual(a, b, field.unit)) {
      diffs.push({
        key: field.key,
        label: field.label,
        valueA: a,
        valueB: b,
        fmtA: field.fmt(a),
        fmtB: field.fmt(b),
        _magnitude: computeMagnitude(a, b, field.unit),
      });
    }
  }

  // Sort by absolute magnitude descending (biggest changes first)
  diffs.sort((x, y) => y._magnitude - x._magnitude);

  // Strip internal _magnitude field
  return diffs.map(({ _magnitude, ...rest }) => rest);
}

function valuesEqual(a, b, unit) {
  // Handle null/undefined
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Arrays: compare by JSON
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // Booleans
  if (unit === 'boolean') return Boolean(a) === Boolean(b);

  // Numbers: float tolerance
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-6;
  }

  return a === b;
}

function computeMagnitude(a, b, unit) {
  if (unit === 'dollar') return Math.abs(Number(a || 0) - Number(b || 0));
  if (unit === 'percent') return Math.abs(Number(a || 0) - Number(b || 0)) * 100;
  if (unit === 'year') return Math.abs(Number(a || 0) - Number(b || 0));
  return 1; // boolean / other: uniform weight
}

// ---------------------------------------------------------------------------
// getPhaseRanges — slice life into phases
// ---------------------------------------------------------------------------
export function getPhaseRanges(scenario) {
  if (!scenario) return [];
  const { currentAge, retirementAge, lifeExpectancy } = scenario;
  const phases = [];

  // Working phase: currentAge to retirementAge - 1
  if (currentAge < retirementAge) {
    phases.push({ id: 'working', label: 'Working', startAge: currentAge, endAge: retirementAge - 1 });
  }

  // Early Retirement: retirementAge to min(71, lifeExpectancy)
  if (retirementAge <= 71 && retirementAge <= lifeExpectancy) {
    phases.push({
      id: 'early-retirement',
      label: 'Early Retirement',
      startAge: retirementAge,
      endAge: Math.min(71, lifeExpectancy),
    });
  }

  // RRIF Era: 72 to lifeExpectancy
  if (lifeExpectancy >= 72) {
    phases.push({
      id: 'rrif',
      label: 'RRIF Era',
      startAge: 72,
      endAge: lifeExpectancy,
    });
  }

  // Estate: single year at lifeExpectancy
  phases.push({ id: 'estate', label: 'Estate', startAge: lifeExpectancy, endAge: lifeExpectancy });

  return phases;
}

// ---------------------------------------------------------------------------
// computePhaseSummary — aggregate projection data for a single phase
// ---------------------------------------------------------------------------
export function computePhaseSummary(projectionData, phase) {
  if (!projectionData || !phase) return null;

  const rows = projectionData.filter(r => r.age >= phase.startAge && r.age <= phase.endAge);
  if (rows.length === 0) return null;

  const portfolioStart = rows[0].totalPortfolio ?? 0;
  const portfolioEnd = rows[rows.length - 1].totalPortfolio ?? 0;

  // Avg annual savings uses deposits, NOT surplus (which is always 0)
  const totalSavings = rows.reduce((sum, r) => sum + (r.tfsaDeposit || 0) + (r.nonRegDeposit || 0), 0);
  const avgAnnualSavings = rows.length > 0 ? totalSavings / rows.length : 0;

  // Detect events
  const events = [];
  const accountKeys = [
    { field: 'rrspBalance', label: 'RRSP depleted' },
    { field: 'tfsaBalance', label: 'TFSA depleted' },
    { field: 'nonRegBalance', label: 'Non-reg depleted' },
    { field: 'totalPortfolio', label: 'Portfolio depleted' },
  ];

  for (const { field, label } of accountKeys) {
    // Check if account was positive at start of phase and hits 0 during it
    const firstVal = rows[0][field] ?? 0;
    if (firstVal > 0) {
      const deplRow = rows.find(r => (r[field] ?? 0) <= 0);
      if (deplRow) events.push({ label, age: deplRow.age });
    }
  }

  // Mortgage payoff
  const firstDebt = rows[0].debtPayments ?? 0;
  if (firstDebt > 0) {
    const payoffRow = rows.find(r => (r.debtPayments ?? 0) === 0);
    if (payoffRow) events.push({ label: 'Mortgage paid off', age: payoffRow.age });
  }

  return { avgAnnualSavings, portfolioStart, portfolioEnd, events };
}

// ---------------------------------------------------------------------------
// computePhaseStatus — green / yellow / red for a phase summary
// ---------------------------------------------------------------------------
export function computePhaseStatus(summary) {
  if (!summary) return 'gray';

  // Red: portfolio depletes during phase
  if (summary.events.some(e => e.label === 'Portfolio depleted')) return 'red';

  // Yellow: portfolio declines >5% OR any account depletes
  if (summary.portfolioStart > 0) {
    const decline = (summary.portfolioStart - summary.portfolioEnd) / summary.portfolioStart;
    if (decline > 0.05) return 'yellow';
  }
  if (summary.events.some(e => e.label.includes('depleted'))) return 'yellow';

  return 'green';
}

// ---------------------------------------------------------------------------
// Monthly snapshots at key ages
// ---------------------------------------------------------------------------
export const SNAPSHOT_AGES = [65, 72, 80, 85];

export function computeMonthlySnapshots(projectionData, ages = SNAPSHOT_AGES) {
  if (!projectionData || projectionData.length === 0) return [];

  const maxAge = projectionData[projectionData.length - 1].age;

  return ages
    .filter(age => age <= maxAge)
    .map(age => {
      const row = projectionData.find(r => r.age === age);
      if (!row) return null;

      const monthlyIncome = (row.afterTaxIncome || 0) / 12;
      const monthlyExpenses = (row.expenses || 0) / 12;
      const monthlyDebt = (row.debtPayments || 0) / 12;
      const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyDebt;

      return {
        age,
        monthlyIncome: Math.round(monthlyIncome),
        monthlyExpenses: Math.round(monthlyExpenses + monthlyDebt),
        monthlySurplus: Math.round(monthlySurplus),
        portfolioBalance: Math.round(row.totalPortfolio || 0),
      };
    })
    .filter(Boolean);
}
