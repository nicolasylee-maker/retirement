/**
 * Audit export — Section 1 (input snapshot).
 *
 * Pure functions that accept a scenario and return a Markdown string.
 * No React, no side-effects.
 */

import { formatCurrency, formatPercent, mdTable } from '../utils/formatters.js';
import { calcTotalMonthlyDebt } from '../utils/debtCalc.js';

const $ = (v) => formatCurrency(v);
const pct = (v, d = 1) => formatPercent(v, d);

// ---------------------------------------------------------------------------
// Section 1 — Input Snapshot
// ---------------------------------------------------------------------------

export function auditInputSnapshot(scenario) {
  const s = scenario;
  const rows = [
    ['Current age', s.currentAge],
    ['Retirement age', s.retirementAge],
    ['Life expectancy', s.lifeExpectancy],
    ['Province', s.province || 'ON'],
  ];

  if (s.isCouple) {
    rows.push(
      ['Couple mode', 'Yes'],
      ['Spouse age', s.spouseAge],
      ['Spouse retirement age', s.spouseRetirementAge],
    );
    if (s.spouseStillWorking && s.spouseEmploymentIncome > 0) {
      rows.push(['Spouse employment income', `${$(s.spouseEmploymentIncome)}/yr`]);
    }
  }

  if (s.stillWorking && s.employmentIncome > 0) {
    rows.push(['Employment income', `${$(s.employmentIncome)}/yr (inflation-adjusted until retirement)`]);
  }
  if (s.nonTaxedIncome > 0) {
    rows.push(['Non-taxed income', `${$(s.nonTaxedIncome)}/yr (ages ${s.nonTaxedIncomeStartAge ?? s.currentAge}–${s.nonTaxedIncomeEndAge ?? s.lifeExpectancy})`]);
  }

  rows.push(
    ['CPP', `${$(s.cppMonthly)}/mo, start age ${s.cppStartAge}`],
    ['OAS', `${$(s.oasMonthly)}/mo, start age ${s.oasStartAge}`],
  );
  if (s.isCouple) {
    rows.push(
      ['Spouse CPP', `${$(s.spouseCppMonthly)}/mo, start age ${s.spouseCppStartAge}`],
      ['Spouse OAS', `${$(s.spouseOasMonthly)}/mo, start age ${s.spouseOasStartAge}`],
    );
  }
  if (s.gisEligible) rows.push(['GIS eligible', 'Yes']);
  if (s.gainsEligible) rows.push(['GAINS eligible', 'Yes']);

  if (s.pensionType === 'db') {
    rows.push(['Pension type', `DB — ${$(s.dbPensionAnnual)}/yr starting age ${s.dbPensionStartAge}${s.dbPensionIndexed ? ' (indexed)' : ''}`]);
  } else if (s.pensionType === 'dc') {
    rows.push(['Pension type', `DC — ${$(s.dcPensionBalance)} balance (rolled into RRSP pool)`]);
  }
  if (s.isCouple && s.spousePensionType === 'db') {
    rows.push(['Spouse pension', `DB — ${$(s.spouseDbPensionAnnual)}/yr starting age ${s.spouseDbPensionStartAge}${s.spouseDbPensionIndexed ? ' (indexed)' : ''}`]);
  } else if (s.isCouple && s.spousePensionType === 'dc') {
    rows.push(['Spouse pension', `DC — ${$(s.spouseDcPensionBalance)} balance`]);
  }

  const rrspPool = (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0) + (s.liraBalance || 0);
  rows.push(['RRSP balance', $(s.rrspBalance)]);
  if (s.dcPensionBalance > 0) rows.push(['DC pension balance', $(s.dcPensionBalance)]);
  if (s.liraBalance > 0) rows.push(['LIRA balance', $(s.liraBalance)]);
  if (s.rrifBalance > 0) rows.push(['RRIF balance', $(s.rrifBalance)]);
  rows.push(['**Combined RRSP pool**', `**${$(rrspPool)}**`]);

  rows.push(['TFSA balance', $(s.tfsaBalance)]);
  if (s.isCouple) {
    if (s.spouseRrspBalance > 0) rows.push(['Spouse RRSP balance', $(s.spouseRrspBalance)]);
    if (s.spouseRrifBalance > 0) rows.push(['Spouse RRIF balance', $(s.spouseRrifBalance)]);
    if (s.spouseDcPensionBalance > 0) rows.push(['Spouse DC pension balance', $(s.spouseDcPensionBalance)]);
    const spouseRrspPool = (s.spouseRrspBalance || 0) + (s.spouseRrifBalance || 0) + (s.spouseDcPensionBalance || 0);
    if (spouseRrspPool > 0) rows.push(['**Spouse RRSP pool**', `**${$(spouseRrspPool)}**`]);
    if (s.spouseTfsaBalance > 0) rows.push(['Spouse TFSA', $(s.spouseTfsaBalance)]);
  }

  const nonRegPool = (s.nonRegInvestments || 0) + (s.cashSavings || 0);
  rows.push(
    ['Cash savings', $(s.cashSavings)],
    ['Non-reg investments', $(s.nonRegInvestments)],
    ['Non-reg cost basis', $(s.nonRegCostBasis ?? nonRegPool)],
    ['**Combined non-reg**', `**${$(nonRegPool)}**`],
  );

  if (s.otherAssets > 0) rows.push(['Other assets', $(s.otherAssets)]);
  if (s.realEstateValue > 0) {
    rows.push(['Real estate', `${$(s.realEstateValue)} (${s.realEstateIsPrimary ? 'primary residence' : 'investment property'})`]);
  }

  if (s.mortgageBalance > 0) {
    rows.push(['Mortgage', `${$(s.mortgageBalance)} @ ${pct(s.mortgageRate)}, ${s.mortgageYearsLeft} yrs left`]);
  }
  if (s.consumerDebt > 0) {
    const payoffAge = s.consumerDebtPayoffAge || (s.currentAge + 10);
    rows.push(['Consumer debt', `${$(s.consumerDebt)} @ ${pct(s.consumerDebtRate)}`]);
    rows.push(['Consumer debt payoff age', `${payoffAge}`]);
  }
  if (s.otherDebt > 0) {
    rows.push(['Other debt', `${$(s.otherDebt)} @ ${pct(s.otherDebtRate || 0.05)}, payoff age ${s.otherDebtPayoffAge || 70}`]);
  }

  rows.push(
    ['Monthly expenses', $(s.monthlyExpenses)],
  );
  if (s.expensesIncludeDebt) {
    const debt = calcTotalMonthlyDebt(s);
    rows.push(
      ['Expenses include debt payments', 'Yes'],
      ['Adjusted non-debt expenses', `${$(Math.max(0, s.monthlyExpenses - debt.totalMonthly))}/mo`],
    );
  }
  rows.push(
    ['Expense reduction at retirement', pct(s.expenseReductionAtRetirement)],
    ['Inflation rate', pct(s.inflationRate)],
    ['Real return (RRSP)', pct(s.realReturn)],
  );
  if ((s.tfsaReturn || s.realReturn) !== s.realReturn) rows.push(['TFSA return', pct(s.tfsaReturn)]);
  if ((s.nonRegReturn || s.realReturn) !== s.realReturn) rows.push(['Non-reg return', pct(s.nonRegReturn)]);
  rows.push(['Withdrawal order', (s.withdrawalOrder || []).join(' > ')]);

  if (s.rrspMeltdownEnabled) {
    const meltStart = s.rrspMeltdownStartAge ?? s.retirementAge;
    rows.push(['RRSP meltdown', `${$(s.rrspMeltdownAnnual)}/yr from age ${meltStart} to ${s.rrspMeltdownTargetAge}`]);
  }

  rows.push(
    ['Will', s.hasWill ? 'Yes' : 'No'],
    ['Primary beneficiary', s.primaryBeneficiary || 'N/A'],
  );
  if (s.numberOfChildren > 0) rows.push(['Number of children', s.numberOfChildren]);
  if (s.realEstateValue > 0) rows.push(['Real estate in estate', s.includeRealEstateInEstate ? 'Yes' : 'No']);
  if (s.realEstateValue > 0 && !s.realEstateIsPrimary && s.estimatedCostBasis != null) {
    rows.push(['Real estate cost basis', $(s.estimatedCostBasis)]);
  }

  return '## 1. Input Snapshot\n\n' + mdTable(['Field', 'Value'], rows);
}
