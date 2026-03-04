/**
 * Audit export — Sections 2–3 (projection table + CPP/OAS verification).
 *
 * Pure functions that accept a scenario + projectionData and return
 * Markdown strings.  No React, no side-effects.
 */

import { formatCurrency, formatPercent, mdTable } from '../utils/formatters.js';
import { CPP_PARAMS, OAS_PARAMS } from '../constants/taxTables.js';

const $ = (v) => formatCurrency(v);
const pct = (v, d = 1) => formatPercent(v, d);

// ---------------------------------------------------------------------------
// Section 2 — Year-by-Year Projection Table
// ---------------------------------------------------------------------------

export function auditProjectionTable(scenario, projectionData) {
  const s = scenario;
  const retAge = s.retirementAge;

  // --- Pre-retirement rows ---
  const preRows = projectionData.filter((r) => r.age < retAge);
  const preHeaders = ['Age', 'Year', 'Emp Inc', 'Pension', 'NonTaxed', 'RRSP Wd', 'Expenses', 'Debt Pmt', 'Tax', 'After-Tax', 'Surplus', 'RRSP Bal', 'TFSA Bal', 'NonReg Bal', 'Portfolio', 'Net Worth'];

  const fmtPreRow = (r) => [
    r.age, r.year, $(r.employmentIncome), $(r.pensionIncome), $(r.nonTaxedIncome),
    $(r.rrspWithdrawal),
    $(r.expenses), $(r.debtPayments), $(r.totalTax), $(r.afterTaxIncome), $(r.surplus),
    $(r.rrspBalance), $(r.tfsaBalance), $(r.nonRegBalance), $(r.totalPortfolio), $(r.netWorth),
  ];

  // --- Post-retirement rows ---
  const postRows = projectionData.filter((r) => r.age >= retAge);
  const postHeaders = ['Age', 'Year', 'CPP', 'OAS', 'Pension', 'GIS', 'GAINS', 'NonTaxed', 'RRSP Wd', 'TFSA Wd', 'NonReg Wd', 'Other Wd', 'Expenses', 'Debt Pmt', 'Tax', 'After-Tax', 'Surplus', 'RRSP Bal', 'TFSA Bal', 'NonReg Bal', 'Portfolio', 'Net Worth'];

  const fmtPostRow = (r) => [
    r.age, r.year, $(r.cppIncome), $(r.oasIncome), $(r.pensionIncome),
    $(r.gisIncome), $(r.gainsIncome), $(r.nonTaxedIncome),
    $(r.rrspWithdrawal), $(r.tfsaWithdrawal), $(r.nonRegWithdrawal), $(r.otherWithdrawal),
    $(r.expenses), $(r.debtPayments), $(r.totalTax), $(r.afterTaxIncome), $(r.surplus),
    $(r.rrspBalance), $(r.tfsaBalance), $(r.nonRegBalance), $(r.totalPortfolio), $(r.netWorth),
  ];

  // Find depletion age (first age where portfolio <= 0 past current age)
  const depleted = projectionData.find((r) => r.age > s.currentAge && r.totalPortfolio <= 0);

  let md = '## 2. Year-by-Year Projection\n\n';

  // DC/LIRA preamble note
  const hasDc = (s.dcPensionBalance || 0) > 0;
  const hasLira = (s.liraBalance || 0) > 0;
  const hasSpouseDc = s.isCouple && (s.spouseDcPensionBalance || 0) > 0;
  if (hasDc || hasLira || hasSpouseDc) {
    md += '> **Note:** ';
    const parts = [];
    if (hasDc) parts.push(`DC pension (${$(s.dcPensionBalance)})`);
    if (hasLira) parts.push(`LIRA (${$(s.liraBalance)})`);
    if (hasSpouseDc) parts.push(`Spouse DC pension (${$(s.spouseDcPensionBalance)})`);
    md += parts.join(', ') + ' merged into the RRSP pool at the start. ';
    md += 'The same real return rate applies. LIRA locked-in restrictions are not modeled.\n\n';
  }

  if (preRows.length > 0) {
    md += '### Pre-Retirement (Ages ' + preRows[0].age + '–' + preRows[preRows.length - 1].age + ')\n\n';
    md += mdTable(preHeaders, preRows.map(fmtPreRow)) + '\n\n';
  }

  if (postRows.length > 0) {
    md += '### Retirement & Drawdown (Ages ' + postRows[0].age + '–' + postRows[postRows.length - 1].age + ')\n\n';
    md += mdTable(postHeaders, postRows.map(fmtPostRow)) + '\n\n';
  }

  if (depleted) {
    md += `**Portfolio depleted at age ${depleted.age}.**\n\n`;
  }

  // Couple supplement table
  if (s.isCouple) {
    md += '### Spouse Detail\n\n';
    const coupleHeaders = ['Age', 'Sp Age', 'Sp Emp', 'Sp CPP', 'Sp OAS', 'Sp Pension', 'Sp RRSP Wd', 'Sp TFSA Wd', 'Sp RRSP Bal', 'Sp TFSA Bal'];
    const ageDiff = (s.spouseAge || 0) - s.currentAge;
    const fmtCoupleRow = (r) => [
      r.age, r.age + ageDiff,
      $(r.spouseEmploymentIncome || 0), $(r.spouseCppIncome || 0), $(r.spouseOasIncome || 0),
      $(r.spousePensionIncome || 0), $(r.spouseRrspWithdrawal || 0), $(r.spouseTfsaWithdrawal || 0),
      $(r.spouseRrspBalance || 0), $(r.spouseTfsaBalance || 0),
    ];
    md += mdTable(coupleHeaders, projectionData.map(fmtCoupleRow)) + '\n\n';
  }

  return md;
}

// ---------------------------------------------------------------------------
// Section 3 — CPP & OAS Verification
// ---------------------------------------------------------------------------

export function auditCppOasVerification(scenario, projectionData) {
  const s = scenario;

  // CPP
  const cppStartAge = s.cppStartAge || 65;
  const monthsDiff = (cppStartAge - 65) * 12;
  let cppAdjLabel, cppAdjCalc, cppFactor;
  if (monthsDiff < 0) {
    const pctPerMonth = +(CPP_PARAMS.earlyReduction * 100).toFixed(1);
    const totalPct = +(Math.abs(monthsDiff) * pctPerMonth).toFixed(1);
    cppFactor = 1 + monthsDiff * CPP_PARAMS.earlyReduction;
    cppAdjLabel = `Early by ${Math.abs(monthsDiff)} months`;
    cppAdjCalc = `${Math.abs(monthsDiff)} x ${pctPerMonth}% = ${totalPct.toFixed(1)}% reduction`;
  } else if (monthsDiff > 0) {
    const pctPerMonth = +(CPP_PARAMS.lateIncrease * 100).toFixed(1);
    const totalPct = +(monthsDiff * pctPerMonth).toFixed(1);
    cppFactor = 1 + monthsDiff * CPP_PARAMS.lateIncrease;
    cppAdjLabel = `Late by ${monthsDiff} months`;
    cppAdjCalc = `${monthsDiff} x ${pctPerMonth}% = ${totalPct.toFixed(1)}% bonus`;
  } else {
    cppFactor = 1;
    cppAdjLabel = 'At 65 (no adjustment)';
    cppAdjCalc = 'Factor = 1.000';
  }
  const cppAnnualBase = (s.cppMonthly || 0) * 12 * cppFactor;

  // OAS
  const oasStartAge = s.oasStartAge || 65;
  const yearsDeferred = Math.min(oasStartAge, OAS_PARAMS.maxDeferAge) - OAS_PARAMS.startAge;
  const monthsDeferred = Math.max(0, yearsDeferred) * 12;
  const deferralBonus = monthsDeferred * OAS_PARAMS.deferralBonus;
  const oasAnnualBase = (s.oasMonthly || 0) * 12 * (1 + deferralBonus);

  // Find highest-income year for clawback check — only among OAS-receiving years
  const oasYears = projectionData.filter(r => r.age >= oasStartAge);
  const maxIncomeRow = oasYears.length > 0
    ? oasYears.reduce((a, b) => (b.totalTaxableIncome > a.totalTaxableIncome ? b : a), oasYears[0])
    : projectionData[0];

  // Inflation indexing example: pick age retirementAge + 5 (or life expectancy if shorter)
  const indexExampleAge = Math.min(s.retirementAge + 5, s.lifeExpectancy);
  const indexYears = indexExampleAge - (cppStartAge > oasStartAge ? cppStartAge : oasStartAge);
  const indexFactor = indexYears > 0 ? Math.pow(1 + (s.inflationRate || 0.025), indexExampleAge - s.currentAge) : 1;

  let md = '## 3. CPP & OAS Verification\n\n';

  md += '### CPP Calculation\n```\n';
  md += `Monthly at 65:           ${$(s.cppMonthly)}\n`;
  md += `Start age:               ${cppStartAge} (${cppAdjLabel})\n`;
  md += `Adjustment:              ${cppAdjCalc}\n`;
  md += `Adjustment factor:       ${cppFactor.toFixed(3)}\n`;
  md += `Annual CPP (base):       ${$(s.cppMonthly)} x 12 x ${cppFactor.toFixed(3)} = ${$(cppAnnualBase)}\n`;
  md += `Inflation indexed:       Yes (${pct(s.inflationRate || 0.025)}/yr)\n`;
  if (indexYears > 0) {
    md += `  At age ${indexExampleAge}:          ${$(cppAnnualBase)} x ${indexFactor.toFixed(3)} = ${$(cppAnnualBase * indexFactor)}\n`;
  }
  md += '```\n\n';

  md += '### OAS Calculation\n```\n';
  md += `Monthly at 65:           ${$(s.oasMonthly)}\n`;
  md += `Start age:               ${oasStartAge}\n`;
  if (monthsDeferred > 0) {
    md += `Months deferred:         ${monthsDeferred}\n`;
    md += `Deferral bonus/month:    ${(OAS_PARAMS.deferralBonus * 100).toFixed(1)}%\n`;
    md += `Total bonus:             ${monthsDeferred} x ${(OAS_PARAMS.deferralBonus * 100).toFixed(1)}% = ${(deferralBonus * 100).toFixed(1)}%\n`;
  }
  md += `Adjustment factor:       ${(1 + deferralBonus).toFixed(3)}\n`;
  md += `Annual OAS (base):       ${$(s.oasMonthly)} x 12 x ${(1 + deferralBonus).toFixed(3)} = ${$(oasAnnualBase)}\n`;
  md += `Inflation indexed:       Yes (${pct(s.inflationRate || 0.025)}/yr)\n`;
  md += '```\n\n';

  md += '### OAS Clawback Check\n```\n';
  md += `Clawback threshold:      ${$(OAS_PARAMS.clawbackStart)}\n`;
  md += `Highest taxable income:  ~${$(maxIncomeRow.totalTaxableIncome)} (age ${maxIncomeRow.age}, during OAS-receiving years)\n`;
  md += `Clawback triggered?      ${maxIncomeRow.totalTaxableIncome > OAS_PARAMS.clawbackStart ? 'Yes' : 'No'}\n`;
  md += '```\n\n';

  return md;
}
