/**
 * Audit sections 14-15: Inflation Crosswalk, Chart Tooltip Snapshots.
 * Pure functions — no React, no side-effects.
 */

import { formatCurrency, mdTable } from '../utils/formatters.js';
import { toTodaysDollars } from '../utils/inflationHelper.js';

const $ = (v) => formatCurrency(v);

/** Determine key snapshot ages, deduplicated and sorted. */
function getSnapshotAges(scenario, projectionData) {
  const s = scenario;
  const ages = new Set();

  if (s.cppStartAge && s.cppStartAge !== s.retirementAge) ages.add(s.cppStartAge);
  if (s.oasStartAge && s.oasStartAge !== s.retirementAge) ages.add(s.oasStartAge);
  ages.add(s.retirementAge);
  ages.add(72);
  const deplRow = projectionData.find(r => r.age > s.currentAge && r.totalPortfolio <= 0);
  if (deplRow) ages.add(deplRow.age);
  ages.add(80);
  ages.add(85);
  ages.add(s.lifeExpectancy);

  const projAges = new Set(projectionData.map(r => r.age));
  return [...ages].filter(a => projAges.has(a)).sort((a, b) => a - b);
}

/** Label for a snapshot age explaining why it's notable. */
function ageLabel(age, scenario, deplAge) {
  const parts = [];
  if (age === scenario.retirementAge) parts.push('Retirement');
  if (age === scenario.cppStartAge && age !== scenario.retirementAge) parts.push('CPP Begins');
  if (age === scenario.oasStartAge && age !== scenario.retirementAge) parts.push('OAS Begins');
  if (age === 72) parts.push('RRIF Conversion');
  if (age === deplAge) parts.push('Portfolio Depleted');
  if (age === scenario.lifeExpectancy) parts.push('Life Expectancy');
  if (age === 80 && !parts.length) parts.push('Age 80');
  if (age === 85 && !parts.length) parts.push('Age 85');
  return parts.length > 0 ? parts.join(', ') : `Age ${age}`;
}

// ---------------------------------------------------------------------------
// Section 14 — Inflation Crosswalk
// ---------------------------------------------------------------------------

export function auditInflationCrosswalk(scenario, projectionData) {
  const s = scenario;
  const inf = s.inflationRate || 0;

  let md = '## 14. Inflation Crosswalk (User Input → Projected)\n\n';
  md += `Inflation rate: **${(inf * 100).toFixed(1)}%**\n\n`;

  if (!inf) {
    md += '*Inflation rate is 0% — all values remain unchanged over time.*\n\n';
    return md;
  }

  // Target ages
  const targets = [];
  const retYears = s.retirementAge - s.currentAge;
  if (retYears > 0) targets.push({ age: s.retirementAge, years: retYears, label: `Retirement (age ${s.retirementAge})` });
  const y80 = 80 - s.currentAge;
  if (y80 > 0 && 80 !== s.retirementAge) targets.push({ age: 80, years: y80, label: 'Age 80' });
  const yEnd = s.lifeExpectancy - s.currentAge;
  if (yEnd > 0 && s.lifeExpectancy !== 80) targets.push({ age: s.lifeExpectancy, years: yEnd, label: `Life Exp (age ${s.lifeExpectancy})` });

  // Inputs to track
  const inputs = [
    { label: s.expensesIncludeDebt ? 'Monthly Expenses (adjusted for debt overlap)' : 'Monthly Expenses', annual: (s.monthlyExpenses || 0) * 12, projField: 'expenses' },
    { label: 'CPP', annual: (s.cppMonthly || 0) * 12, projField: 'cppIncome' },
    { label: 'OAS', annual: (s.oasMonthly || 0) * 12, projField: 'oasIncome' },
  ];
  if (s.pensionType === 'db' && s.dbPensionAnnual > 0) {
    inputs.push({ label: 'DB Pension', annual: s.dbPensionAnnual, projField: 'pensionIncome' });
  }

  const headers = ['Input', 'User Entered'];
  targets.forEach(t => headers.push(t.label));
  headers.push('');

  const rows = inputs.map(inp => {
    const row = [inp.label, `${$(Math.round(inp.annual / 12))}/mo`];
    targets.forEach(t => {
      const inflated = Math.round(inp.annual * Math.pow(1 + inf, t.years));
      const projRow = projectionData.find(r => r.age === t.age);
      const actual = projRow ? Math.round(projRow[inp.projField] || 0) : null;
      if (actual !== null && Math.abs(actual - inflated) > 100) {
        row.push(`${$(inflated)}/yr → actual ${$(actual)}/yr *`);
      } else {
        row.push(`${$(inflated)}/yr`);
      }
    });
    row.push('');
    return row;
  });

  md += mdTable(headers, rows) + '\n\n';
  md += '*\\* Actual differs from naive inflation due to OAS clawback, benefit timing, or expense reduction.*\n\n';

  // Verification formula
  if (targets.length > 0 && inputs.length > 0) {
    const ex = inputs[0];
    const t = targets[0];
    const result = Math.round(ex.annual * Math.pow(1 + inf, t.years));
    md += '**Verification formula:** `futureValue = input × 12 × (1 + rate)^years`\n\n';
    md += `Example: ${ex.label} at ${t.label} = ${$(Math.round(ex.annual / 12))} × 12 × (1 + ${(inf * 100).toFixed(1)}%)^${t.years} = **${$(result)}/yr**\n\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// Section 15 — Chart Tooltip Snapshots
// ---------------------------------------------------------------------------

export function auditChartSnapshots(scenario, projectionData) {
  const s = scenario;
  const inf = s.inflationRate || 0;
  const couple = s.isCouple;
  const ages = getSnapshotAges(s, projectionData);
  const deplRow = projectionData.find(r => r.age > s.currentAge && r.totalPortfolio <= 0);
  const deplAge = deplRow ? deplRow.age : null;

  let md = '## 15. Chart Tooltip Snapshots\n\n';
  md += '*These match the chart tooltip when hovering at each age.*\n\n';

  for (const age of ages) {
    const d = projectionData.find(r => r.age === age);
    if (!d) continue;

    const years = age - s.currentAge;
    const tdMo = (val) => {
      if (!val || years <= 0) return '-';
      return $(Math.round(toTodaysDollars(val, years, inf) / 12)) + '/mo';
    };

    const label = ageLabel(age, s, deplAge);
    md += `### Age ${age} (${d.year}) — ${label}\n\n`;

    // Income sources (matching PortfolioChartTooltip.jsx)
    const incomeSources = [
      { label: 'Employment', value: (d.employmentIncome || 0) + (couple ? (d.spouseEmploymentIncome || 0) : 0) },
      { label: 'CPP', value: (d.cppIncome || 0) + (couple ? (d.spouseCppIncome || 0) : 0) },
      { label: 'OAS', value: (d.oasIncome || 0) + (couple ? (d.spouseOasIncome || 0) : 0) },
      { label: 'GIS', value: d.gisIncome || 0 },
      { label: 'GAINS', value: d.gainsIncome || 0 },
      { label: 'Pension', value: (d.pensionIncome || 0) + (couple ? (d.spousePensionIncome || 0) : 0) },
    ].filter(s => s.value > 0);

    const realIncome = incomeSources.reduce((sum, s) => sum + s.value, 0);
    const outflows = (d.expenses || 0) + (d.totalTax || 0) + (d.debtPayments || 0);
    const gap = realIncome - outflows;

    const withdrawals = [
      { label: 'from RRSP', value: (d.rrspWithdrawal || 0) + (couple ? (d.spouseRrspWithdrawal || 0) : 0) },
      { label: 'from TFSA', value: (d.tfsaWithdrawal || 0) + (couple ? (d.spouseTfsaWithdrawal || 0) : 0) },
      { label: 'from Non-Reg', value: d.nonRegWithdrawal || 0 },
      { label: 'from Other', value: d.otherWithdrawal || 0 },
    ].filter(w => w.value > 0);

    const rows = [];
    incomeSources.forEach(s => rows.push([s.label, $(s.value) + '/yr', tdMo(s.value)]));
    if (incomeSources.length > 1) rows.push(['**Real Income**', `**${$(realIncome)}/yr**`, `**${tdMo(realIncome)}**`]);
    rows.push(['Expenses', `-${$(d.expenses || 0)}`, tdMo(d.expenses)]);
    if ((d.totalTax || 0) > 0) rows.push(['Tax', `-${$(d.totalTax)}`, '-']);
    if ((d.debtPayments || 0) > 0) rows.push(['Debt', `-${$(d.debtPayments)}`, '-']);
    rows.push([`**${gap < 0 ? 'Gap' : 'Surplus'}**`, `**${gap < 0 ? '-' : ''}${$(Math.abs(gap))}/yr**`, `**${tdMo(Math.abs(gap))}**`]);
    withdrawals.forEach(w => rows.push([`  ${w.label}`, $(w.value) + '/yr', tdMo(w.value)]));
    rows.push(['**Portfolio**', `**${$(d.totalPortfolio)}**`, '']);

    md += mdTable(['Item', 'Nominal', "Today's $/mo"], rows) + '\n\n';
  }

  return md;
}
