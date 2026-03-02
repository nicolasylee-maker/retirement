/**
 * Audit export — Sections 6-10 (analysis-side).
 *
 * Pure functions that accept a scenario + projectionData and return
 * Markdown strings.  No React, no side-effects.
 */

import { formatCurrency, formatPercent, mdTable } from '../utils/formatters.js';
import { calcEstateImpact } from './estateEngine.js';
import { calcSustainableWithdrawal } from './withdrawalCalc.js';
import { calcTotalTax, calcTaxOnDeemedIncome, calcRrifMinimum } from './taxEngine.js';
import { RRIF_MIN_RATES, OAS_PARAMS, PROBATE } from '../constants/taxTables.js';

const $ = (v) => formatCurrency(v);
const pct = (v, d = 1) => formatPercent(v, d);

// ---------------------------------------------------------------------------
// Section 6 — Estate Verification
// ---------------------------------------------------------------------------

export function auditEstateVerification(scenario, projectionData) {
  const s = scenario;

  // Find 50% peak portfolio crossover age (dynamic, not hardcoded)
  const peakPortfolio = Math.max(...projectionData.map((r) => r.totalPortfolio));
  const halfPeakAge = projectionData.find((r) => r.age > s.currentAge && r.totalPortfolio <= peakPortfolio * 0.5);

  // Pick two estate analysis ages:
  // 1) 50% peak crossover (or retirement+10 if portfolio never drops to 50%)
  // 2) Life expectancy
  const estateAge1 = halfPeakAge ? halfPeakAge.age : Math.min(s.retirementAge + 10, s.lifeExpectancy);
  const estateAge2 = s.lifeExpectancy;

  let md = '## 6. Estate Verification\n\n';

  if (halfPeakAge) {
    md += `*Estate analyzed at age ${estateAge1} (portfolio drops to 50% of peak ${$(peakPortfolio)}) and age ${estateAge2} (life expectancy).*\n\n`;
  } else {
    md += `*Portfolio never drops to 50% of peak (${$(peakPortfolio)}). Using age ${estateAge1} and age ${estateAge2} for estate analysis.*\n\n`;
  }

  const ages = [estateAge1];
  if (estateAge2 !== estateAge1) ages.push(estateAge2);

  for (const age of ages) {
    const estate = calcEstateImpact(s, projectionData, age);
    const row = projectionData.find((r) => r.age === age) || projectionData[projectionData.length - 1];

    md += `### Estate at Age ${age}${age === estateAge2 ? ' (life expectancy)' : ''}\n\n`;
    md += '```\n';
    md += `RRSP/RRIF balance:       ${$(estate.rrspRrifBalance)}\n`;
    md += `TFSA balance:            ${$(estate.tfsaBalance)}\n`;
    md += `Non-reg balance:         ${$(estate.nonRegBalance)}\n`;
    if (estate.otherBalance > 0) md += `Other assets:            ${$(estate.otherBalance)}\n`;
    if (estate.realEstateValue > 0) md += `Real estate:             ${$(estate.realEstateValue)} (${s.realEstateIsPrimary ? 'primary residence' : 'investment property'})\n`;
    md += `Gross estate:            ${$(estate.grossEstate)}\n`;
    md += '\n';

    // RRSP deemed
    const spouseRollover = s.primaryBeneficiary === 'spouse';
    if (spouseRollover && estate.rrspRrifBalance > 0) {
      md += `RRSP deemed income:      $0 (spousal rollover — tax-free)\n`;
    } else if (estate.rrspRrifBalance > 0) {
      md += `RRSP deemed income:      ${$(estate.rrspRrifBalance)} (no spouse rollover — beneficiary is ${s.primaryBeneficiary || 'children'})\n`;
      md += `  Tax on deemed income:  ${$(estate.deemedIncomeTax)}\n`;
    } else {
      md += `RRSP deemed income:      $0 (no balance)\n`;
    }

    // Capital gains
    const costBasis = row.nonRegCostBasis || 0;
    const nonRegGain = Math.max(0, estate.nonRegBalance - costBasis);
    if (nonRegGain > 0) {
      md += `Non-reg capital gains:   ${$(estate.nonRegBalance)} - ${$(costBasis)} cost basis = ${$(nonRegGain)} gain\n`;
    } else {
      md += `Non-reg capital gains:   ${$(nonRegGain)} (cost basis ${$(costBasis)})\n`;
    }
    const costBasisSource = row.nonRegCostBasis ? 'tracked from projection' : 'inferred from initial deposit';
    md += `  (Cost basis: ${costBasisSource})\n`;
    md += `  Capital gains tax:     ${$(estate.capitalGainsTax)}\n`;

    // Real estate
    if (estate.realEstateValue > 0 && s.realEstateIsPrimary) {
      md += `Real estate gains:       $0 (primary residence exempt)\n`;
    }

    // Probate
    md += '\n';
    let probateable = estate.nonRegBalance + (estate.otherBalance || 0) + estate.realEstateValue;
    if (!spouseRollover) probateable += estate.rrspRrifBalance;
    md += `Probateable assets:      ${$(probateable)}\n`;
    if (!spouseRollover && estate.rrspRrifBalance > 0) {
      md += `  (RRSP included — no spouse beneficiary)\n`;
    }
    md += `Probate fees:            ${$(estate.probateFees)}\n`;
    md += '\n';
    md += `Total estate tax:        ${$(estate.totalEstateTax)}\n`;
    md += `Net to heirs:            ${$(estate.netToHeirs)}\n`;
    if (estate.distribution) {
      const d = estate.distribution;
      if (d.spouse > 0 && d.children > 0) {
        md += `Distribution:            Spouse ${$(d.spouse)}, Children ${$(d.children)}\n`;
      } else if (d.spouse > 0) {
        md += `Distribution:            100% to spouse\n`;
      } else if (d.children > 0) {
        md += `Distribution:            100% to children (per ${s.hasWill ? 'will' : 'intestacy rules'})\n`;
      } else {
        md += `Distribution:            100% to other heirs\n`;
      }
    }
    md += '```\n\n';
  }

  // Probate formula reminder
  md += '### Ontario Probate Fee Formula\n```\n';
  md += `First $50,000:           $5 per $1,000 = $250\n`;
  md += `Above $50,000:           $15 per $1,000\n`;
  md += '```\n\n';

  return md;
}

// ---------------------------------------------------------------------------
// Section 7 — Sustainable Withdrawal
// ---------------------------------------------------------------------------

export function auditSustainableWithdrawal(scenario) {
  const { sustainableMonthly } = calcSustainableWithdrawal(scenario);

  let md = '## 7. Sustainable Withdrawal\n\n';
  md += '```\n';
  md += `Method:          Binary search (20 iterations)\n`;
  md += `Search range:    $0 — $30,000/month\n`;
  md += `Target age:      95\n`;
  md += `Solvency test:   Portfolio > $0 AND surplus >= -$1 for all years past currentAge\n`;
  md += '\n';
  md += `Result:          ${$(sustainableMonthly)}/month maximum sustainable expenses\n`;
  md += `                 (vs. scenario setting of ${$(scenario.monthlyExpenses)}/month)\n`;
  md += '\n';

  const gap = scenario.monthlyExpenses - sustainableMonthly;
  if (gap > 0) {
    md += `Gap:             ${$(gap)}/month (${$(gap * 12)}/year) overspend\n`;
    md += `Implication:     At ${$(scenario.monthlyExpenses)}/month, portfolio may deplete early\n`;
    md += `                 At ${$(sustainableMonthly)}/month, portfolio survives to age 95\n`;
  } else {
    md += `Headroom:        ${$(Math.abs(gap))}/month under the sustainable limit\n`;
    md += `Implication:     Current expenses are sustainable to age 95\n`;
  }
  md += '```\n\n';

  return md;
}

// ---------------------------------------------------------------------------
// Section 8 — RRIF Minimum Withdrawal Schedule
// ---------------------------------------------------------------------------

export function auditRrifSchedule() {
  let md = '## 8. RRIF Minimum Withdrawal Schedule\n\n';
  md += 'Prescribed minimum withdrawal percentages (applied to Jan 1 balance):\n\n';

  const ages = [71, 72, 75, 80, 85, 90, 95];
  const rows = ages.map((age) => {
    const rate = RRIF_MIN_RATES[age] || 0.20;
    return [
      age,
      pct(rate, 2),
      $(100000 * rate),
      $(200000 * rate),
    ];
  });

  md += mdTable(['Age', 'Rate', 'On $100K', 'On $200K'], rows);
  md += '\n\n';

  return md;
}

// ---------------------------------------------------------------------------
// Section 9 — Known Gaps & Simplifications
// ---------------------------------------------------------------------------

export function auditKnownGaps() {
  let md = '## 9. Known Gaps & Simplifications\n\n';

  const gaps = [
    ['**CPP/OAS inflation-indexed**', 'Benefits are indexed to inflation (fixed in v2). Realistic income growth modeled.', 'Accurate representation of real benefit growth'],
    ['**No TFSA contributions**', "Model doesn't add annual TFSA room ($7K/yr)", 'Understates TFSA growth, especially pre-retirement'],
    ['**Real estate static**', 'House value stays at initial amount, no appreciation', 'Could understate net worth significantly over 30 years'],
    ['**No tax bracket indexing**', "Federal/Ontario brackets don't adjust for inflation", 'Overstates taxes in later years (bracket creep)'],
    ['**Single tax year**', 'Uses 2024 brackets for all future years', 'Tax rates may change'],
    ['**Debt payment from income**', 'Debt payments come from gross income, not savings', 'Accurate if income covers payments; if not, withdrawals fill the gap'],
    ['**No CPP survivor benefit**', 'Not modeled (single scenario)', 'N/A for single filer'],
    ['**No health/care costs**', 'Model uses flat expense growth', 'May understate expenses significantly after age 80'],
    ['**Employment income stops abruptly**', 'No part-time or gradual retirement option', 'May overstate withdrawal needs in early retirement'],
    ['**Non-reg cost basis tracks proportionally**', 'Assumes uniform gain distribution across portfolio', 'Slightly inaccurate if actual holdings have varying ACBs'],
    ['**Estate capital gains guard**', 'Capital gains tax is $0 when non-reg gain is $0 (fixed in v2)', 'Prevents phantom tax on depleted accounts'],
    ['**Tax gross-up loop**', 'Iterative gross-up (10 iterations) ensures withdrawals cover taxes on withdrawals (fixed in v2)', 'Convergence within $50 tolerance'],
  ];

  md += mdTable(['Area', 'Simplification', 'Impact'], gaps);
  md += '\n\n';

  return md;
}

// ---------------------------------------------------------------------------
// Section 10 — Dashboard KPI Derivations
// ---------------------------------------------------------------------------

export function auditKpiDerivations(scenario, projectionData) {
  const s = scenario;
  const retRow = projectionData.find((r) => r.age === s.retirementAge);
  const lastRow = projectionData[projectionData.length - 1];
  const depleted = projectionData.find((r) => r.age > s.currentAge && r.totalPortfolio <= 0);
  const { sustainableMonthly } = calcSustainableWithdrawal(s);

  let md = '## 10. Dashboard KPI Derivations\n\n';

  // Net Worth at retirement
  md += '### Net Worth (at retirement, age ' + s.retirementAge + ')\n```\n';
  if (retRow) {
    md += `Total portfolio:    ${$(retRow.totalPortfolio)} (RRSP ${$(retRow.rrspBalance)} + TFSA ${$(retRow.tfsaBalance)} + NonReg ${$(retRow.nonRegBalance)}`;
    if (retRow.otherBalance > 0) md += ` + Other ${$(retRow.otherBalance)}`;
    md += ')\n';
    md += `Real estate:        ${$(s.realEstateValue || 0)}\n`;
    if (retRow.mortgageBalance > 0) md += `Mortgage:           -${$(retRow.mortgageBalance)}\n`;
    md += `Net worth:          ${$(retRow.netWorth)}\n`;
  }
  md += '```\n\n';

  // First-year retirement income
  md += `### First-Year Retirement Income (age ${s.retirementAge})\n\`\`\`\n`;
  if (retRow) {
    if (retRow.employmentIncome > 0) md += `Employment:         ${$(retRow.employmentIncome)} (taxable)\n`;
    if (retRow.cppIncome > 0) md += `CPP:                ${$(retRow.cppIncome)} (taxable)\n`;
    if (retRow.oasIncome > 0) md += `OAS:                ${$(retRow.oasIncome)} (taxable, after any clawback)\n`;
    if (retRow.gisIncome > 0) md += `GIS:                ${$(retRow.gisIncome)} (non-taxable)\n`;
    if (retRow.gainsIncome > 0) md += `GAINS:              ${$(retRow.gainsIncome)} (non-taxable)\n`;
    if (retRow.pensionIncome > 0) md += `Pension:            ${$(retRow.pensionIncome)} (taxable)\n`;
    if (retRow.rrspWithdrawal > 0) md += `RRSP withdrawal:    ${$(retRow.rrspWithdrawal)} (taxable)\n`;
    if (retRow.tfsaWithdrawal > 0) md += `TFSA withdrawal:    ${$(retRow.tfsaWithdrawal)} (tax-free)\n`;
    if (retRow.nonRegWithdrawal > 0) md += `Non-reg withdrawal: ${$(retRow.nonRegWithdrawal)}\n`;
    md += `Total gross:        ${$(retRow.totalIncome)}\n`;
    md += `Tax:                ${$(retRow.totalTax)}\n`;
    md += `After-tax:          ${$(retRow.afterTaxIncome)}\n`;
  }
  md += '```\n\n';

  // Surplus/Shortfall
  md += `### Surplus/Shortfall (age ${s.retirementAge})\n\`\`\`\n`;
  if (retRow) {
    md += `After-tax income:   ${$(retRow.afterTaxIncome)}\n`;
    md += `Expenses:           ${$(retRow.expenses)}\n`;
    if (retRow.debtPayments > 0) md += `Debt payments:      ${$(retRow.debtPayments)}\n`;
    md += `Surplus:            ${$(retRow.surplus)}\n`;
  }
  md += '```\n\n';

  // Portfolio depletion
  md += `### Portfolio Depletion\n\`\`\`\n`;
  if (depleted) {
    md += `Depletion age:      ${depleted.age}\n`;
    md += `Sustainable monthly: ${$(sustainableMonthly)}/month (to age 95)\n`;
    md += `Current expenses:   ${$(s.monthlyExpenses)}/month\n`;
  } else {
    md += `Portfolio survives to age ${s.lifeExpectancy} (never depleted)\n`;
    md += `Sustainable monthly: ${$(sustainableMonthly)}/month\n`;
  }
  md += '```\n\n';

  return md;
}
