/**
 * Audit sections 11-13: Dashboard KPI detail, Depletion, Pre-Retirement Health.
 * Pure functions — no React, no side-effects.
 */

import { formatCurrency, formatPercent, mdTable } from '../utils/formatters.js';
import { toTodaysDollars } from '../utils/inflationHelper.js';
import { calcSustainableWithdrawal } from './withdrawalCalc.js';

const $ = (v) => formatCurrency(v);

// ---------------------------------------------------------------------------
// Section 11 — Dashboard Summary Cards (all 5 KPIs)
// ---------------------------------------------------------------------------

export function auditDashboardSummary(scenario, projectionData) {
  const s = scenario;
  const retRow = projectionData.find(r => r.age === s.retirementAge);
  if (!retRow) return '## 11. Dashboard Summary Cards\n\nNo retirement row found in projection.\n\n';

  const yearsToRet = s.retirementAge - s.currentAge;
  const inf = s.inflationRate || 0;
  const tdMo = (futureAnnual) => {
    if (!futureAnnual || yearsToRet <= 0) return '-';
    return $(Math.round(toTodaysDollars(futureAnnual, yearsToRet, inf) / 12)) + '/mo';
  };

  let md = '## 11. Dashboard Summary Cards\n\n';

  // --- NET WORTH ---
  md += `### NET WORTH (at retirement, age ${s.retirementAge})\n\n`;
  const nwRows = [
    ['RRSP/RRIF', $(retRow.rrspBalance)],
    ['TFSA', $(retRow.tfsaBalance)],
  ];
  if (s.isCouple && (retRow.spouseRrspBalance || 0) > 0)
    nwRows.push(['Spouse RRSP/RRIF', $(retRow.spouseRrspBalance)]);
  if (s.isCouple && (retRow.spouseTfsaBalance || 0) > 0)
    nwRows.push(['Spouse TFSA', $(retRow.spouseTfsaBalance)]);
  nwRows.push(['Non-Registered', $(retRow.nonRegBalance)]);
  if ((retRow.otherBalance || 0) > 0) nwRows.push(['Other Assets', $(retRow.otherBalance)]);
  nwRows.push(['**Portfolio (liquid)**', `**${$(retRow.totalPortfolio)}**`]);
  if ((s.realEstateValue || 0) > 0) nwRows.push(['Real Estate', $(s.realEstateValue)]);
  if ((retRow.mortgageBalance || 0) > 0) nwRows.push(['Mortgage', `-${$(retRow.mortgageBalance)}`]);
  nwRows.push(['**Net Worth**', `**${$(retRow.netWorth)}**`]);
  md += mdTable(['Component', 'Value'], nwRows) + '\n\n';

  // --- INCOME ---
  md += `### INCOME (first year of retirement, age ${s.retirementAge})\n\n`;
  const couple = s.isCouple;
  const cpp = (retRow.cppIncome || 0) + (couple ? (retRow.spouseCppIncome || 0) : 0);
  const oas = (retRow.oasIncome || 0) + (couple ? (retRow.spouseOasIncome || 0) : 0);
  const gis = retRow.gisIncome || 0;
  const gains = retRow.gainsIncome || 0;
  const pension = (retRow.pensionIncome || 0) + (couple ? (retRow.spousePensionIncome || 0) : 0);
  const employment = (retRow.employmentIncome || 0) + (couple ? (retRow.spouseEmploymentIncome || 0) : 0);
  const realIncome = cpp + oas + gis + gains + pension + employment;

  const rrspWd = (retRow.rrspWithdrawal || 0) + (couple ? (retRow.spouseRrspWithdrawal || 0) : 0);
  const tfsaWd = (retRow.tfsaWithdrawal || 0) + (couple ? (retRow.spouseTfsaWithdrawal || 0) : 0);
  const nonRegWd = retRow.nonRegWithdrawal || 0;
  const otherWd = retRow.otherWithdrawal || 0;
  const totalWd = rrspWd + tfsaWd + nonRegWd + otherWd;

  const incRows = [];
  const addInc = (label, val) => { if (val > 0) incRows.push([label, $(val) + '/yr', tdMo(val)]); };
  addInc('CPP', cpp);
  addInc('OAS', oas);
  addInc('GIS', gis);
  addInc('GAINS', gains);
  addInc('Pension', pension);
  addInc('Employment', employment);
  incRows.push(['**Real Income**', `**${$(realIncome)}/yr**`, `**${tdMo(realIncome)}**`]);
  if (rrspWd > 0) incRows.push(['RRSP Withdrawal', $(rrspWd) + '/yr', tdMo(rrspWd)]);
  if (tfsaWd > 0) incRows.push(['TFSA Withdrawal', $(tfsaWd) + '/yr', tdMo(tfsaWd)]);
  if (nonRegWd > 0) incRows.push(['NonReg Withdrawal', $(nonRegWd) + '/yr', tdMo(nonRegWd)]);
  if (otherWd > 0) incRows.push(['Other Withdrawal', $(otherWd) + '/yr', tdMo(otherWd)]);
  if (totalWd > 0) incRows.push(['**Total Withdrawals**', `**${$(totalWd)}/yr**`, `**${tdMo(totalWd)}**`]);
  incRows.push(['**Total Cash Inflow**', `**${$(retRow.totalIncome)}/yr**`, '']);
  md += mdTable(['Source', 'Future $/yr', "Today's $/mo"], incRows) + '\n\n';

  // --- TAX ---
  md += `### TAX (first year of retirement, age ${s.retirementAge})\n\n`;
  const taxableIncome = retRow.totalTaxableIncome || 0;
  const effRate = taxableIncome > 0 ? retRow.totalTax / taxableIncome : 0;
  const taxRows = [
    ['Taxable Income', $(taxableIncome)],
    ['Gross Income (all sources)', $(retRow.totalIncome)],
    ['**Total Tax**', `**${$(retRow.totalTax)}**`],
    ['Effective Tax Rate', formatPercent(effRate)],
    ['After-Tax Income', $(retRow.afterTaxIncome)],
    ["After-Tax (today's $/mo)", tdMo(retRow.afterTaxIncome)],
  ];
  md += mdTable(['Item', 'Value'], taxRows) + '\n\n';
  md += '*For federal/provincial bracket breakdown, see Section 4.*\n\n';

  // --- SHORTFALL ---
  md += `### SHORTFALL (first year of retirement, age ${s.retirementAge})\n\n`;
  const expReductionPct = Math.round((s.expenseReductionAtRetirement || 0) * 100);

  let shortfallLabel, fundedFromLabel;
  if (totalWd === 0) {
    shortfallLabel = '$0 (surplus)';
    fundedFromLabel = 'N/A — income covers all expenses';
  } else {
    shortfallLabel = `**-${$(totalWd)}**`;
    const sources = [];
    if (rrspWd > 0) sources.push('RRSP');
    if (tfsaWd > 0) sources.push('TFSA');
    if (nonRegWd > 0) sources.push('Non-Reg');
    if (otherWd > 0) sources.push('Other');
    if (couple) {
      if ((retRow.spouseRrspWithdrawal || 0) > 0) sources.push('Spouse RRSP');
      if ((retRow.spouseTfsaWithdrawal || 0) > 0) sources.push('Spouse TFSA');
    }
    fundedFromLabel = sources.length > 0 ? sources.join(', ') : 'Portfolio';
  }

  const sfRows = [
    ['After-Tax Income', $(retRow.afterTaxIncome)],
    ['Living Expenses', `-${$(retRow.expenses)}`],
    ["Expenses (today's $/mo)", tdMo(retRow.expenses)],
    ['Pre-retirement input', `${$(s.monthlyExpenses)}/mo`],
    ['Retirement reduction', `${expReductionPct}%`],
    ['**Annual Shortfall**', shortfallLabel],
    ["Shortfall (today's $/mo)", totalWd === 0 ? '-' : tdMo(totalWd)],
    ['Funded from', fundedFromLabel],
  ];
  md += mdTable(['Item', 'Value'], sfRows) + '\n\n';

  // --- SAFE MONTHLY SPENDING ---
  md += '### SAFE MONTHLY SPENDING\n\n';
  const { sustainableMonthly } = calcSustainableWithdrawal(s);
  const gap = s.monthlyExpenses - sustainableMonthly;
  const smRows = [
    ["Safe Monthly Spend", `${$(sustainableMonthly)}/mo (today's dollars)`],
    ['Current Budget', `${$(s.monthlyExpenses)}/mo (today's dollars)`],
    ['Over/Under Budget', `${gap > 0 ? '+' : ''}${$(gap)}/mo ${gap > 0 ? '(over)' : '(under)'}`],
    ['Must Last Until', 'Age 95'],
    ['Method', 'Binary search across spending levels against full projection'],
  ];
  md += mdTable(['Item', 'Value'], smRows) + '\n\n';

  return md;
}

// ---------------------------------------------------------------------------
// Section 12 — Portfolio Depletion Analysis
// ---------------------------------------------------------------------------

export function auditDepletionAnalysis(scenario, projectionData) {
  const s = scenario;
  const inf = s.inflationRate || 0;
  const retRow = projectionData.find(r => r.age === s.retirementAge);
  const lastRow = projectionData[projectionData.length - 1];
  const deplRow = projectionData.find(r => r.age > s.currentAge && r.totalPortfolio <= 0);
  const depleted = deplRow && deplRow.age < s.lifeExpectancy;

  const tdMoAt = (futureAnnual, age) => {
    const years = age - s.currentAge;
    if (!futureAnnual || years <= 0) return '-';
    return $(Math.round(toTodaysDollars(futureAnnual, years, inf) / 12)) + '/mo';
  };

  let md = '## 12. Portfolio Depletion Analysis\n\n';

  const topRows = [
    ['Portfolio at retirement (age ' + s.retirementAge + ')', $(retRow?.totalPortfolio || 0)],
    ['Portfolio depleted?', depleted ? 'Yes' : 'No'],
    ['Depletion age', deplRow ? `${deplRow.age} (${deplRow.year})` : 'Never'],
    ['Years before life expectancy', depleted ? `${s.lifeExpectancy - deplRow.age} years short` : 'N/A'],
    ['Portfolio at life expectancy (age ' + s.lifeExpectancy + ')', $(lastRow?.totalPortfolio || 0)],
    ['Net worth at life expectancy', $(lastRow?.netWorth || 0)],
  ];
  md += mdTable(['Item', 'Value'], topRows) + '\n\n';

  if (depleted) {
    md += `### Post-Depletion Snapshot (age ${deplRow.age})\n\n`;
    const postCpp = deplRow.cppIncome || 0;
    const postOas = deplRow.oasIncome || 0;
    const postGis = deplRow.gisIncome || 0;
    const postPension = deplRow.pensionIncome || 0;
    const postIncome = postCpp + postOas + postGis + postPension;
    const postExp = deplRow.expenses || 0;
    const postShortfall = postExp - postIncome;

    const pdRows = [
      ['CPP', $(postCpp) + '/yr', tdMoAt(postCpp, deplRow.age)],
      ['OAS', $(postOas) + '/yr', tdMoAt(postOas, deplRow.age)],
    ];
    if (postGis > 0) pdRows.push(['GIS', $(postGis) + '/yr', tdMoAt(postGis, deplRow.age)]);
    if (postPension > 0) pdRows.push(['Pension', $(postPension) + '/yr', tdMoAt(postPension, deplRow.age)]);
    pdRows.push(
      ['**Total Income**', `**${$(postIncome)}/yr**`, `**${tdMoAt(postIncome, deplRow.age)}**`],
      ['Expenses', $(postExp) + '/yr', tdMoAt(postExp, deplRow.age)],
      ['**Annual Shortfall**', `**-${$(postShortfall)}/yr**`, `**-${tdMoAt(postShortfall, deplRow.age)}**`],
    );
    md += mdTable(['Item', 'Future $/yr', "Today's $/mo"], pdRows) + '\n\n';
    md += `*After age ${deplRow.age}, this shortfall cannot be funded — no portfolio remains.*\n\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// Section 13 — Pre-Retirement Financial Health
// ---------------------------------------------------------------------------

export function auditPreRetirementHealth(scenario, projectionData) {
  const s = scenario;
  let md = '## 13. Pre-Retirement Financial Health\n\n';

  if (s.currentAge >= s.retirementAge) {
    md += '*Already retired — no pre-retirement working years to analyze.*\n\n';
    return md;
  }

  const working = projectionData.filter(r => r.age >= s.currentAge && r.age < s.retirementAge);
  const count = working.length;

  // Net cash flow = afterTaxIncome - expenses - debtPayments (NOT surplus, which is always 0)
  const cashFlows = working.map(r => (r.afterTaxIncome || 0) - (r.expenses || 0) - (r.debtPayments || 0));
  const avgCashFlow = count > 0 ? Math.round(cashFlows.reduce((a, b) => a + b, 0) / count) : 0;
  const positiveYears = cashFlows.filter(cf => cf > 0).length;

  const wdYears = working.filter(r =>
    (r.rrspWithdrawal || 0) + (r.tfsaWithdrawal || 0) + (r.nonRegWithdrawal || 0) + (r.otherWithdrawal || 0) > 0
  );

  // Account depletion detection
  const tfsaDepleted = working.find(r => (r.tfsaBalance ?? 1) <= 0);
  const nonRegDepleted = working.find(r => (r.nonRegBalance ?? 1) <= 0);
  const rrspWdRows = working.filter(r => (r.rrspWithdrawal || 0) > 0);
  const rrspWdAges = rrspWdRows.length > 0
    ? `${rrspWdRows[0].age}–${rrspWdRows[rrspWdRows.length - 1].age}`
    : '-';

  // Mortgage payoff
  const mortgageRow = working.find(r => (r.mortgageBalance || 0) <= 0 && (s.mortgageBalance || 0) > 0);

  const rows = [
    ['Working years', `Age ${s.currentAge} to ${s.retirementAge - 1} (${count} years)`],
    ['Average annual net cash flow', $(avgCashFlow)],
    ['Years with positive cash flow', `${positiveYears} of ${count}`],
    ['Years withdrawing from savings', `${wdYears.length} of ${count}`],
    ['TFSA depleted while working?', tfsaDepleted ? `Yes, at age ${tfsaDepleted.age}` : 'No'],
    ['NonReg depleted while working?', nonRegDepleted ? `Yes, at age ${nonRegDepleted.age}` : 'No'],
    ['RRSP withdrawals while working?', rrspWdRows.length > 0 ? `Yes, ${rrspWdRows.length} years (ages ${rrspWdAges})` : 'No'],
    ['Mortgage paid off at age', mortgageRow ? `${mortgageRow.age} (${mortgageRow.year})` : (s.mortgageBalance > 0 ? 'After retirement' : 'N/A')],
  ];
  md += mdTable(['Metric', 'Value'], rows) + '\n\n';

  if (wdYears.length > 0) {
    md += `*⚠️ Savings withdrawals during ${wdYears.length} working years indicate expenses exceed after-tax income.*\n\n`;
  }

  return md;
}
