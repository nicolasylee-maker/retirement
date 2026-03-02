/**
 * Audit export — Sections 1-5 (projection-side).
 *
 * Pure functions that accept a scenario + projectionData and return
 * Markdown strings.  No React, no side-effects.
 */

import { formatCurrency, formatPercent, mdTable } from '../utils/formatters.js';
import {
  CPP_PARAMS, OAS_PARAMS, CAPITAL_GAINS,
  FEDERAL_BRACKETS, ONTARIO_BRACKETS, ONTARIO_SURTAX,
  FEDERAL_CREDITS, ONTARIO_CREDITS,
} from '../constants/taxTables.js';
import { calcTotalTax } from './taxEngine.js';

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
  ];

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
  if (s.gisEligible) rows.push(['GIS eligible', 'Yes']);
  if (s.gainsEligible) rows.push(['GAINS eligible', 'Yes']);

  if (s.pensionType === 'db') {
    rows.push(['Pension type', `DB — ${$(s.dbPensionAnnual)}/yr starting age ${s.dbPensionStartAge}${s.dbPensionIndexed ? ' (indexed)' : ''}`]);
  } else if (s.pensionType === 'dc') {
    rows.push(['Pension type', `DC — ${$(s.dcPensionBalance)} balance (rolled into RRSP pool)`]);
  }

  const rrspPool = (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0) + (s.liraBalance || 0);
  rows.push(['RRSP balance', $(s.rrspBalance)]);
  if (s.dcPensionBalance > 0) rows.push(['DC pension balance', $(s.dcPensionBalance)]);
  if (s.liraBalance > 0) rows.push(['LIRA balance', $(s.liraBalance)]);
  if (s.rrifBalance > 0) rows.push(['RRIF balance', $(s.rrifBalance)]);
  rows.push(['**Combined RRSP pool**', `**${$(rrspPool)}**`]);

  rows.push(['TFSA balance', $(s.tfsaBalance)]);

  const nonRegPool = (s.nonRegInvestments || 0) + (s.cashSavings || 0);
  rows.push(
    ['Cash savings', $(s.cashSavings)],
    ['Non-reg investments', $(s.nonRegInvestments)],
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
  if (s.otherDebt > 0) rows.push(['Other debt', $(s.otherDebt)]);

  rows.push(
    ['Monthly expenses', $(s.monthlyExpenses)],
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

  return '## 1. Input Snapshot\n\n' + mdTable(['Field', 'Value'], rows);
}

// ---------------------------------------------------------------------------
// Section 2 — Year-by-Year Projection Table
// ---------------------------------------------------------------------------

export function auditProjectionTable(scenario, projectionData) {
  const s = scenario;
  const retAge = s.retirementAge;

  // --- Pre-retirement rows ---
  const preRows = projectionData.filter((r) => r.age < retAge);
  const preHeaders = ['Age', 'Year', 'Emp Inc', 'RRSP Wd', 'Expenses', 'Debt Pmt', 'Tax', 'Surplus', 'RRSP Bal', 'TFSA Bal', 'Portfolio', 'Net Worth'];

  const fmtPreRow = (r) => [
    r.age, r.year, $(r.employmentIncome), $(r.rrspWithdrawal),
    $(r.expenses), $(r.debtPayments), $(r.totalTax), $(r.surplus),
    $(r.rrspBalance), $(r.tfsaBalance), $(r.totalPortfolio), $(r.netWorth),
  ];

  // --- Post-retirement rows ---
  const postRows = projectionData.filter((r) => r.age >= retAge);
  const postHeaders = ['Age', 'Year', 'CPP', 'OAS', 'RRSP Wd', 'TFSA Wd', 'NonReg Wd', 'Expenses', 'Debt Pmt', 'Tax', 'Surplus', 'RRSP Bal', 'Portfolio', 'Net Worth'];

  const fmtPostRow = (r) => [
    r.age, r.year, $(r.cppIncome), $(r.oasIncome),
    $(r.rrspWithdrawal), $(r.tfsaWithdrawal), $(r.nonRegWithdrawal),
    $(r.expenses), $(r.debtPayments), $(r.totalTax), $(r.surplus),
    $(r.rrspBalance), $(r.totalPortfolio), $(r.netWorth),
  ];

  // Find depletion age (first age where portfolio <= 0 past current age)
  const depleted = projectionData.find((r) => r.age > s.currentAge && r.totalPortfolio <= 0);

  let md = '## 2. Year-by-Year Projection\n\n';

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

// ---------------------------------------------------------------------------
// Section 4 — Tax Verification
// ---------------------------------------------------------------------------

export function auditTaxVerification(scenario, projectionData) {
  const s = scenario;

  // Pick two worked examples:
  // 1) Retirement-age income
  const retRow = projectionData.find((r) => r.age === s.retirementAge);
  // 2) Highest-taxable-income year
  const maxRow = projectionData.reduce((a, b) => (b.totalTaxableIncome > a.totalTaxableIncome ? b : a), projectionData[0]);

  const exampleRows = [retRow];
  if (maxRow && maxRow.age !== retRow?.age) exampleRows.push(maxRow);

  let md = '## 4. Tax Verification\n\n';

  for (const row of exampleRows) {
    if (!row) continue;
    const income = row.totalTaxableIncome;
    const age = row.age;
    const hasPension = (row.pensionIncome > 0) || (age >= 72 && row.rrspWithdrawal > 0);

    md += `### Worked Example: ${$(income)} taxable income, age ${age}${hasPension ? ', pension income' : ''}\n\n`;
    md += workedTaxExample(income, age, hasPension);
    md += '\n';

    // Verify against engine
    const engineTax = calcTotalTax(income, age, hasPension);
    const projTax = row.totalTax;
    md += `**Engine verification**: calcTotalTax(${$(income)}, ${age}, ${hasPension}) = ${$(engineTax)}\n`;
    md += `**Projection row tax**: ${$(projTax)}\n`;
    if (Math.abs(engineTax - projTax) > 2) {
      md += `**MISMATCH** — delta ${$(Math.abs(engineTax - projTax))} (may be due to rounding in iterative gross-up)\n`;
    }
    md += '\n';
  }

  // Additional data points table
  md += '### Tax Reference Table\n\n';
  const incomes = [20000, 40000, 60000, 80000, 100000, 150000];
  const retAge = s.retirementAge;
  const taxRows = incomes.map((inc) => [
    $(inc),
    $(calcTotalTax(inc, retAge, true)),
    $(calcTotalTax(inc, 50, false)),
  ]);
  md += mdTable(['Taxable Income', `Age ${retAge} Tax`, 'Age 50 Tax'], taxRows);
  md += '\n\n';

  return md;
}

function workedTaxExample(income, age, hasPension) {
  const fc = FEDERAL_CREDITS;
  const oc = ONTARIO_CREDITS;
  let md = '';

  // Federal
  md += '**Federal Tax**:\n```\n';
  let fedTax = 0;
  for (const b of FEDERAL_BRACKETS) {
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    const tax = taxable * b.rate;
    fedTax += tax;
    md += `  ${$(b.min)}–${b.max === Infinity ? '...' : $(b.max)}: ${$(taxable)} x ${(b.rate * 100).toFixed(1)}% = ${$(tax)}\n`;
  }
  md += `Bracket tax:             ${$(fedTax)}\n`;

  let fedCreditable = fc.basicPersonal;
  md += `Basic personal credit:   ${$(fc.basicPersonal)} x ${(fc.creditRate * 100)}% = -${$(fc.basicPersonal * fc.creditRate)}\n`;

  if (age >= 65) {
    const reduction = Math.max(0, income - fc.ageIncomeThreshold) * fc.ageClawbackRate;
    const ageAmt = Math.max(0, fc.ageAmount - reduction);
    fedCreditable += ageAmt;
    md += `Age amount:              ${$(fc.ageAmount)}`;
    if (reduction > 0) md += ` - ${$(reduction)} clawback = ${$(ageAmt)}`;
    md += ` x ${(fc.creditRate * 100)}% = -${$(ageAmt * fc.creditRate)}\n`;
  }

  if (hasPension) {
    fedCreditable += fc.pensionCredit;
    md += `Pension credit:          ${$(fc.pensionCredit)} x ${(fc.creditRate * 100)}% = -${$(fc.pensionCredit * fc.creditRate)}\n`;
  }

  const fedFinal = Math.max(0, fedTax - fedCreditable * fc.creditRate);
  md += `Federal tax:             ${$(fedFinal)}\n`;
  md += '```\n\n';

  // Ontario
  md += '**Ontario Tax**:\n```\n';
  let ontTax = 0;
  for (const b of ONTARIO_BRACKETS) {
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    const tax = taxable * b.rate;
    ontTax += tax;
    md += `  ${$(b.min)}–${b.max === Infinity ? '...' : $(b.max)}: ${$(taxable)} x ${(b.rate * 100).toFixed(2)}% = ${$(tax)}\n`;
  }
  md += `Bracket tax:             ${$(ontTax)}\n`;

  let ontCreditable = oc.basicPersonal;
  md += `Basic personal credit:   ${$(oc.basicPersonal)} x ${(oc.creditRate * 100).toFixed(2)}% = -${$(oc.basicPersonal * oc.creditRate)}\n`;

  if (age >= 65) {
    const reduction = Math.max(0, income - oc.ageIncomeThreshold) * oc.ageClawbackRate;
    const ageAmt = Math.max(0, oc.ageAmount - reduction);
    ontCreditable += ageAmt;
    md += `Age amount:              ${$(oc.ageAmount)}`;
    if (reduction > 0) md += ` - ${$(reduction)} clawback = ${$(ageAmt)}`;
    md += ` x ${(oc.creditRate * 100).toFixed(2)}% = -${$(ageAmt * oc.creditRate)}\n`;
  }

  if (hasPension) {
    ontCreditable += oc.pensionCredit;
    md += `Pension credit:          ${$(oc.pensionCredit)} x ${(oc.creditRate * 100).toFixed(2)}% = -${$(oc.pensionCredit * oc.creditRate)}\n`;
  }

  const ontBasic = Math.max(0, ontTax - ontCreditable * oc.creditRate);
  md += `Basic Ontario tax:       ${$(ontBasic)}\n`;

  const st = ONTARIO_SURTAX;
  let surtax = 0;
  if (ontBasic > st.threshold1) surtax += (ontBasic - st.threshold1) * st.rate1;
  if (ontBasic > st.threshold2) surtax += (ontBasic - st.threshold2) * st.rate2;
  md += `Surtax:                  ${$(surtax)}${surtax === 0 ? ` (basic tax ${$(ontBasic)} < ${$(st.threshold1)} threshold)` : ''}\n`;
  md += `Ontario tax:             ${$(ontBasic + surtax)}\n`;
  md += '```\n\n';

  md += `**Total**: ${$(fedFinal)} + ${$(ontBasic + surtax)} = **${$(fedFinal + ontBasic + surtax)}** (effective rate: ${((fedFinal + ontBasic + surtax) / income * 100).toFixed(1)}%)\n\n`;

  return md;
}

// ---------------------------------------------------------------------------
// Section 5 — Debt Amortization Trace
// ---------------------------------------------------------------------------

export function auditDebtTrace(scenario) {
  const s = scenario;
  const hasConsumer = (s.consumerDebt || 0) > 0;
  const hasMortgage = (s.mortgageBalance || 0) > 0;

  if (!hasConsumer && !hasMortgage) {
    return '## 5. Debt Amortization Trace\n\nNo debts in this scenario.\n\n';
  }

  let md = '## 5. Debt Amortization Trace\n\n';

  // -------------------------------------------------------------------------
  // NOTE: The amortization logic below is intentionally duplicated from
  // projectionEngine.js (lines 90-116). This ensures the audit trace
  // independently verifies the projection engine's debt calculations.
  // If the projection engine's debt logic changes, this must be updated
  // to match — or discrepancies will surface in the audit.
  // -------------------------------------------------------------------------

  if (hasConsumer) {
    const rate = s.consumerDebtRate || 0.08;
    const payoffAge = s.consumerDebtPayoffAge || (s.currentAge + 10);
    const totalYears = payoffAge - s.currentAge;
    md += `**Consumer debt: ${$(s.consumerDebt)} @ ${pct(rate)} — payoff target age ${payoffAge} (${totalYears} years)**\n\n`;

    let balance = s.consumerDebt;
    const rows = [];
    let totalPayments = 0;
    let totalInterest = 0;

    for (let y = 0; y < totalYears && balance > 0; y++) {
      const yearsLeft = Math.max(1, totalYears - y);
      let annualPayment;
      if (rate === 0) {
        annualPayment = balance / yearsLeft;
      } else {
        annualPayment = balance * (rate * Math.pow(1 + rate, yearsLeft)) / (Math.pow(1 + rate, yearsLeft) - 1);
      }
      const interest = balance * rate;
      const total = Math.min(balance + interest, annualPayment);
      const principal = total - interest;
      balance = Math.max(0, balance - principal);

      totalPayments += total;
      totalInterest += interest;

      rows.push([
        s.currentAge + y,
        $(balance + principal), // balance at start of year = prior remaining
        $(total),
        $(interest),
        $(principal),
        $(balance),
      ]);
    }

    // Fix first column: show starting balance correctly
    rows[0][1] = $(s.consumerDebt);

    md += mdTable(['Age', 'Balance', 'Annual Payment', 'Interest', 'Principal', 'Remaining'], rows);
    md += `\n\n**Totals**: ${$(totalPayments)} total payments, ${$(totalInterest)} total interest on ${$(s.consumerDebt)} principal\n\n`;
  }

  if (hasMortgage) {
    md += `**Mortgage: ${$(s.mortgageBalance)} @ ${pct(s.mortgageRate || 0.05)}, ${s.mortgageYearsLeft} years remaining**\n\n`;

    let balance = s.mortgageBalance;
    const rows = [];
    const rate = s.mortgageRate || 0.05;

    for (let y = 0; y < s.mortgageYearsLeft && balance > 0; y++) {
      const yearsLeft = Math.max(1, s.mortgageYearsLeft - y);
      const principal = balance / yearsLeft;
      const interest = balance * rate;
      balance = Math.max(0, balance - principal);

      rows.push([
        s.currentAge + y,
        $(balance + principal),
        $(principal + interest),
        $(interest),
        $(principal),
        $(balance),
      ]);
    }

    rows[0][1] = $(s.mortgageBalance);

    md += mdTable(['Age', 'Balance', 'Annual Payment', 'Interest', 'Principal', 'Remaining'], rows);
    md += '\n\n';
  }

  return md;
}
