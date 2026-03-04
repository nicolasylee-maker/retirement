/**
 * Audit export — Sections 4–5 (tax verification + debt amortization trace).
 *
 * Pure functions that accept a scenario + projectionData and return
 * Markdown strings.  No React, no side-effects.
 */

import { formatCurrency, formatPercent, mdTable } from '../utils/formatters.js';
import {
  FEDERAL_BRACKETS, FEDERAL_CREDITS,
  PROVINCE_DATA, PROVINCE_NAMES,
} from '../constants/taxTables.js';
import { calcTotalTax } from './taxEngine.js';

const $ = (v) => formatCurrency(v);
const pct = (v, d = 1) => formatPercent(v, d);

// ---------------------------------------------------------------------------
// Section 4 — Tax Verification
// ---------------------------------------------------------------------------

export function auditTaxVerification(scenario, projectionData) {
  const s = scenario;
  const province = s.province || 'ON';
  const provName = PROVINCE_NAMES[province] || province;

  // Pick two worked examples:
  // 1) Retirement-age income
  const retRow = projectionData.find((r) => r.age === s.retirementAge);
  // 2) Highest-taxable-income year
  const maxRow = projectionData.reduce((a, b) => (b.totalTaxableIncome > a.totalTaxableIncome ? b : a), projectionData[0]);

  const exampleRows = [retRow];
  if (maxRow && maxRow.age !== retRow?.age) exampleRows.push(maxRow);

  let md = '## 4. Tax Verification (' + provName + ')\n\n';

  for (const row of exampleRows) {
    if (!row) continue;
    const income = row.totalTaxableIncome;
    const age = row.age;
    const hasPension = (row.pensionIncome > 0) || (age >= 72 && row.rrspWithdrawal > 0);

    md += `### Worked Example: ${$(income)} taxable income, age ${age}${hasPension ? ', pension income' : ''}\n\n`;
    md += workedTaxExample(income, age, hasPension, province);
    md += '\n';

    // Verify against engine
    const engineTax = calcTotalTax(income, age, hasPension, province);
    const projTax = row.totalTax;
    md += `**Engine verification**: calcTotalTax(${$(income)}, ${age}, ${hasPension}, '${province}') = ${$(engineTax)}\n`;
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
    $(calcTotalTax(inc, retAge, true, province)),
    $(calcTotalTax(inc, 50, false, province)),
  ]);
  md += mdTable(['Taxable Income', `Age ${retAge} Tax`, 'Age 50 Tax'], taxRows);
  md += '\n\n';

  return md;
}

function workedTaxExample(income, age, hasPension, province) {
  const fc = FEDERAL_CREDITS;
  const provData = PROVINCE_DATA[province] || PROVINCE_DATA.ON;
  const provName = PROVINCE_NAMES[province] || province;
  const pc = provData.credits;
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

  // Provincial
  md += '**' + provName + ' Tax**:\n```\n';
  let provBracketTax = 0;
  for (const b of provData.brackets) {
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    const tax = taxable * b.rate;
    provBracketTax += tax;
    md += `  ${$(b.min)}–${b.max === Infinity ? '...' : $(b.max)}: ${$(taxable)} x ${(b.rate * 100).toFixed(2)}% = ${$(tax)}\n`;
  }
  md += `Bracket tax:             ${$(provBracketTax)}\n`;

  let provCreditable = pc.basicPersonal;
  md += `Basic personal credit:   ${$(pc.basicPersonal)} x ${(pc.creditRate * 100).toFixed(2)}% = -${$(pc.basicPersonal * pc.creditRate)}\n`;

  if (age >= 65) {
    const reduction = Math.max(0, income - (pc.ageIncomeThreshold ?? 0)) * (pc.ageClawbackRate ?? 0);
    const ageAmt = Math.max(0, (pc.ageAmount || 0) - reduction);
    provCreditable += ageAmt;
    md += ('Age amount:').padEnd(25) + $(pc.ageAmount || 0);
    if (reduction > 0) md += ` - ${$(reduction)} clawback = ${$(ageAmt)}`;
    md += ` x ${(pc.creditRate * 100).toFixed(2)}% = -${$(ageAmt * pc.creditRate)}\n`;
  }

  if (hasPension) {
    provCreditable += pc.pensionCredit;
    md += `Pension credit:          ${$(pc.pensionCredit)} x ${(pc.creditRate * 100).toFixed(2)}% = -${$(pc.pensionCredit * pc.creditRate)}\n`;
  }

  const provBasicTax = Math.max(0, provBracketTax - provCreditable * pc.creditRate);
  md += ('Basic ' + provName + ' tax:').padEnd(25) + $(provBasicTax) + '\n';

  const st = provData.surtax;
  let surtax = 0;
  if (st) {
    if (provBasicTax > st.threshold1) surtax += (provBasicTax - st.threshold1) * st.rate1;
    if (provBasicTax > st.threshold2) surtax += (provBasicTax - st.threshold2) * st.rate2;
    md += `Surtax:                  ${$(surtax)}${surtax === 0 ? ` (basic tax ${$(provBasicTax)} < ${$(st.threshold1)} threshold)` : ''}\n`;
  }
  md += (provName + ' tax:').padEnd(25) + $(provBasicTax + surtax) + '\n';
  md += '```\n\n';

  md += `**Total**: ${$(fedFinal)} + ${$(provBasicTax + surtax)} = **${$(fedFinal + provBasicTax + surtax)}** (effective rate: ${((fedFinal + provBasicTax + surtax) / income * 100).toFixed(1)}%)\n\n`;

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
    if (rows.length > 0) {
      rows[0][1] = $(s.consumerDebt);
      md += mdTable(['Age', 'Balance', 'Annual Payment', 'Interest', 'Principal', 'Remaining'], rows);
      md += `\n\n**Totals**: ${$(totalPayments)} total payments, ${$(totalInterest)} total interest on ${$(s.consumerDebt)} principal\n\n`;
    } else {
      md += `Already paid off or payoff age ≤ current age.\n\n`;
    }
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

    if (rows.length > 0) {
      rows[0][1] = $(s.mortgageBalance);
      md += mdTable(['Age', 'Balance', 'Annual Payment', 'Interest', 'Principal', 'Remaining'], rows);
      md += '\n\n';
    } else {
      md += `Already paid off (0 years remaining).\n\n`;
    }
  }

  return md;
}
