/**
 * Audit export — Sections 2–3 (projection table + CPP/OAS verification).
 *
 * Pure functions that accept a scenario + projectionData and return
 * Markdown strings.  No React, no side-effects.
 */

import { formatCurrency, formatPercent, mdTable } from '../utils/formatters.js';
import { CPP_PARAMS, OAS_PARAMS } from '../constants/taxTables.js';
import { splitCoupleIncome } from '../utils/coupleHelpers.js';

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
  const preHeaders = ['Age', 'Year', 'Emp Inc', 'Pension', 'NonTaxed', 'RRSP Wd', 'Expenses', 'Debt Pmt', 'Tax', 'After-Tax', 'Surplus', 'RRSP Dep', 'TFSA Dep', 'NonReg Dep', 'RRSP Room', 'TFSA Room', 'RRSP Bal', 'TFSA Bal', 'NonReg Bal', 'Portfolio', 'Net Worth'];

  const fmtPreRow = (r) => [
    r.age, r.year, $(r.employmentIncome), $(r.pensionIncome), $(r.nonTaxedIncome),
    $(r.rrspWithdrawal),
    $(r.expenses), $(r.debtPayments), $(r.totalTax), $(r.afterTaxIncome), $(r.surplus),
    $(r.rrspDeposit), $(r.tfsaDeposit), $(r.nonRegDeposit),
    $(r.rrspContributionRoom), $(r.tfsaContributionRoom),
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
    const coupleHeaders = ['Age', 'Sp Age', 'Sp Emp', 'Sp CPP', 'Sp OAS', 'Sp Pension', 'Sp RRSP Wd', 'Sp TFSA Wd', 'Sp RRSP Dep', 'Sp TFSA Dep', 'Sp RRSP Bal', 'Sp TFSA Bal'];
    const ageDiff = (s.spouseAge || 0) - s.currentAge;
    const fmtCoupleRow = (r) => [
      r.age, r.age + ageDiff,
      $(r.spouseEmploymentIncome || 0), $(r.spouseCppIncome || 0), $(r.spouseOasIncome || 0),
      $(r.spousePensionIncome || 0), $(r.spouseRrspWithdrawal || 0), $(r.spouseTfsaWithdrawal || 0),
      $(r.spouseRrspDeposit || 0), $(r.spouseTfsaDeposit || 0),
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

  // Inflation indexing example: pick age retirementAge + 5 (or life expectancy if shorter)
  const indexExampleAge = Math.min(s.retirementAge + 5, s.lifeExpectancy);
  const indexYears = indexExampleAge - (cppStartAge > oasStartAge ? cppStartAge : oasStartAge);
  const indexFactor = indexYears > 0 ? Math.pow(1 + (s.inflationRate || 0.025), indexExampleAge - s.currentAge) : 1;

  let md = '## 3. CPP & OAS Verification\n\n';

  md += `### CPP Calculation${s.isCouple ? ' (Primary)' : ''}\n\`\`\`\n`;
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

  // Spouse CPP
  if (s.isCouple) {
    const spCppStartAge = s.spouseCppStartAge || 65;
    const spMonthsDiff = (spCppStartAge - 65) * 12;
    let spCppFactor;
    let spCppAdjLabel, spCppAdjCalc;
    if (spMonthsDiff < 0) {
      const p = +(CPP_PARAMS.earlyReduction * 100).toFixed(1);
      const t = +(Math.abs(spMonthsDiff) * p).toFixed(1);
      spCppFactor = 1 + spMonthsDiff * CPP_PARAMS.earlyReduction;
      spCppAdjLabel = `Early by ${Math.abs(spMonthsDiff)} months`;
      spCppAdjCalc = `${Math.abs(spMonthsDiff)} x ${p}% = ${t.toFixed(1)}% reduction`;
    } else if (spMonthsDiff > 0) {
      const p = +(CPP_PARAMS.lateIncrease * 100).toFixed(1);
      const t = +(spMonthsDiff * p).toFixed(1);
      spCppFactor = 1 + spMonthsDiff * CPP_PARAMS.lateIncrease;
      spCppAdjLabel = `Late by ${spMonthsDiff} months`;
      spCppAdjCalc = `${spMonthsDiff} x ${p}% = ${t.toFixed(1)}% bonus`;
    } else {
      spCppFactor = 1;
      spCppAdjLabel = 'At 65 (no adjustment)';
      spCppAdjCalc = 'Factor = 1.000';
    }
    const spCppAnnual = (s.spouseCppMonthly || 0) * 12 * spCppFactor;

    md += '### CPP Calculation (Spouse)\n```\n';
    md += `Monthly at 65:           ${$(s.spouseCppMonthly || 0)}\n`;
    md += `Start age:               ${spCppStartAge} (${spCppAdjLabel})\n`;
    md += `Adjustment:              ${spCppAdjCalc}\n`;
    md += `Adjustment factor:       ${spCppFactor.toFixed(3)}\n`;
    md += `Annual CPP (base):       ${$(s.spouseCppMonthly || 0)} x 12 x ${spCppFactor.toFixed(3)} = ${$(spCppAnnual)}\n`;
    md += '```\n\n';
  }

  md += `### OAS Calculation${s.isCouple ? ' (Primary)' : ''}\n\`\`\`\n`;
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

  // Spouse OAS
  if (s.isCouple) {
    const spOasStart = s.spouseOasStartAge || 65;
    const spYearsDeferred = Math.min(spOasStart, OAS_PARAMS.maxDeferAge) - OAS_PARAMS.startAge;
    const spMonthsDeferred = Math.max(0, spYearsDeferred) * 12;
    const spDeferralBonus = spMonthsDeferred * OAS_PARAMS.deferralBonus;
    const spOasAnnual = (s.spouseOasMonthly || 0) * 12 * (1 + spDeferralBonus);

    md += '### OAS Calculation (Spouse)\n```\n';
    md += `Monthly at 65:           ${$(s.spouseOasMonthly || 0)}\n`;
    md += `Start age:               ${spOasStart}\n`;
    if (spMonthsDeferred > 0) {
      md += `Months deferred:         ${spMonthsDeferred}\n`;
      md += `Total bonus:             ${(spDeferralBonus * 100).toFixed(1)}%\n`;
    }
    md += `Annual OAS (base):       ${$(s.spouseOasMonthly || 0)} x 12 x ${(1 + spDeferralBonus).toFixed(3)} = ${$(spOasAnnual)}\n`;
    md += '```\n\n';
  }

  // OAS Clawback — per-person for couples
  if (s.isCouple) {
    const ageDiff = (s.spouseAge || s.currentAge) - s.currentAge;
    const spouseOasStart = s.spouseOasStartAge || 65;

    // Primary clawback check
    const primaryOasYears = projectionData.filter(r => r.age >= oasStartAge);
    let maxPrimaryIncome = 0, maxPrimaryAge = oasStartAge;
    for (const r of primaryOasYears) {
      const { primaryTaxable } = splitCoupleIncome(r, s);
      if (primaryTaxable > maxPrimaryIncome) {
        maxPrimaryIncome = primaryTaxable;
        maxPrimaryAge = r.age;
      }
    }

    // Spouse clawback check
    const spouseOasYears = projectionData.filter(r => (r.age + ageDiff) >= spouseOasStart);
    let maxSpouseIncome = 0, maxSpouseAge = spouseOasStart;
    for (const r of spouseOasYears) {
      const { spouseTaxable, spouseAge: spAge } = splitCoupleIncome(r, s);
      if (spouseTaxable > maxSpouseIncome) {
        maxSpouseIncome = spouseTaxable;
        maxSpouseAge = spAge;
      }
    }

    md += '### OAS Clawback Check (Primary)\n```\n';
    md += `Clawback threshold:      ${$(OAS_PARAMS.clawbackStart)}\n`;
    md += `Highest taxable income:  ~${$(maxPrimaryIncome)} (age ${maxPrimaryAge})\n`;
    md += `Clawback triggered?      ${maxPrimaryIncome > OAS_PARAMS.clawbackStart ? 'Yes' : 'No'}\n`;
    md += '```\n\n';

    md += '### OAS Clawback Check (Spouse)\n```\n';
    md += `Clawback threshold:      ${$(OAS_PARAMS.clawbackStart)}\n`;
    md += `Highest taxable income:  ~${$(maxSpouseIncome)} (spouse age ${maxSpouseAge})\n`;
    md += `Clawback triggered?      ${maxSpouseIncome > OAS_PARAMS.clawbackStart ? 'Yes' : 'No'}\n`;
    md += '```\n\n';
  } else {
    const oasYears = projectionData.filter(r => r.age >= oasStartAge);
    const maxIncomeRow = oasYears.length > 0
      ? oasYears.reduce((a, b) => (b.totalTaxableIncome > a.totalTaxableIncome ? b : a), oasYears[0])
      : projectionData[0];

    md += '### OAS Clawback Check\n```\n';
    md += `Clawback threshold:      ${$(OAS_PARAMS.clawbackStart)}\n`;
    md += `Highest taxable income:  ~${$(maxIncomeRow.totalTaxableIncome)} (age ${maxIncomeRow.age}, during OAS-receiving years)\n`;
    md += `Clawback triggered?      ${maxIncomeRow.totalTaxableIncome > OAS_PARAMS.clawbackStart ? 'Yes' : 'No'}\n`;
    md += '```\n\n';
  }

  return md;
}
