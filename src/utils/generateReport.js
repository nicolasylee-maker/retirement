import { calcEstateImpact } from '../engines/estateEngine';
import { calcSustainableWithdrawal } from '../engines/withdrawalCalc';

const $ = (v) => {
  if (v == null || isNaN(v)) return '$0';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
};
const pct = (v) => `${(v * 100).toFixed(1)}%`;

function inputsTable(s) {
  const rows = [
    ['Current Age', s.currentAge],
    ['Retirement Age', s.retirementAge],
    ['Life Expectancy', s.lifeExpectancy],
  ];

  if (s.isCouple) {
    rows.push(
      ['Is Couple', 'Yes'],
      ['Spouse Age', s.spouseAge],
      ['Spouse Retirement Age', s.spouseRetirementAge],
    );
    if (s.spouseEmploymentIncome > 0) rows.push(['Spouse Employment', `${$(s.spouseEmploymentIncome)}/yr`]);
  }

  if (s.stillWorking && s.employmentIncome > 0) rows.push(['Employment Income', `${$(s.employmentIncome)}/yr`]);
  if (s.nonTaxedIncome > 0) rows.push(['Non-Taxed Income', `${$(s.nonTaxedIncome)}/yr (ages ${s.nonTaxedIncomeStartAge ?? s.currentAge}–${s.nonTaxedIncomeEndAge ?? s.lifeExpectancy})`]);

  rows.push(
    ['CPP', `${$(s.cppMonthly)}/mo starting age ${s.cppStartAge}`],
    ['OAS', `${$(s.oasMonthly)}/mo starting age ${s.oasStartAge}`],
  );
  if (s.isCouple) {
    rows.push(
      ['Spouse CPP', `${$(s.spouseCppMonthly)}/mo starting age ${s.spouseCppStartAge}`],
      ['Spouse OAS', `${$(s.spouseOasMonthly)}/mo starting age ${s.spouseOasStartAge}`],
    );
  }
  if (s.gisEligible) rows.push(['GIS', 'Eligible']);
  if (s.gainsEligible) rows.push(['GAINS', 'Eligible']);

  if (s.pensionType === 'db') rows.push(['DB Pension', `${$(s.dbPensionAnnual)}/yr starting age ${s.dbPensionStartAge}${s.dbPensionIndexed ? ' (indexed)' : ''}`]);
  if (s.pensionType === 'dc') rows.push(['DC Balance', $(s.dcPensionBalance)]);
  if (s.isCouple && s.spousePensionType === 'db') rows.push(['Spouse DB Pension', `${$(s.spouseDbPensionAnnual)}/yr starting age ${s.spouseDbPensionStartAge}${s.spouseDbPensionIndexed ? ' (indexed)' : ''}`]);
  if (s.isCouple && s.spousePensionType === 'dc') rows.push(['Spouse DC Balance', $(s.spouseDcPensionBalance)]);

  rows.push(['RRSP', $(s.rrspBalance)], ['TFSA', $(s.tfsaBalance)]);
  if (s.rrspContributionRoom > 0) rows.push(['RRSP Contribution Room', $(s.rrspContributionRoom)]);
  if (s.tfsaContributionRoom > 0) rows.push(['TFSA Contribution Room', $(s.tfsaContributionRoom)]);
  if (s.liraBalance > 0) rows.push(['LIRA', $(s.liraBalance)]);
  if (s.isCouple && (s.spouseRrspBalance || 0) + (s.spouseRrifBalance || 0) > 0) rows.push(['Spouse RRSP', $(s.spouseRrspBalance + (s.spouseRrifBalance || 0))]);
  if (s.isCouple && s.spouseTfsaBalance > 0) rows.push(['Spouse TFSA', $(s.spouseTfsaBalance)]);
  if (s.isCouple && s.spouseRrspContributionRoom > 0) rows.push(['Spouse RRSP Room', $(s.spouseRrspContributionRoom)]);
  if (s.isCouple && s.spouseTfsaContributionRoom > 0) rows.push(['Spouse TFSA Room', $(s.spouseTfsaContributionRoom)]);

  rows.push(['Non-Registered', $(s.nonRegInvestments)], ['Cash Savings', $(s.cashSavings)]);
  if (s.otherAssets > 0) rows.push(['Other Assets', $(s.otherAssets)]);
  if (s.realEstateValue > 0) rows.push(['Real Estate', $(s.realEstateValue)]);
  if (s.mortgageBalance > 0) rows.push(['Mortgage', $(s.mortgageBalance)]);
  if (s.consumerDebt > 0) rows.push(['Consumer Debt', $(s.consumerDebt)]);
  if (s.otherDebt > 0) rows.push(['Other Debt', $(s.otherDebt)]);

  rows.push(
    ['Monthly Expenses', $(s.monthlyExpenses)],
    ['Expense Reduction at Retirement', pct(s.expenseReductionAtRetirement)],
    ['Inflation Rate', pct(s.inflationRate)],
    ['Investment Return', pct(s.realReturn)],
  );
  if ((s.tfsaReturn || s.realReturn) !== s.realReturn) rows.push(['TFSA Return', pct(s.tfsaReturn)]);
  if ((s.nonRegReturn || s.realReturn) !== s.realReturn) rows.push(['Non-Reg Return', pct(s.nonRegReturn)]);

  if (s.rrspMeltdownEnabled) rows.push(['RRSP Meltdown', `${$(s.rrspMeltdownAnnual)}/yr, ages ${s.rrspMeltdownStartAge ?? s.retirementAge}–${s.rrspMeltdownTargetAge}`]);

  return rows.map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join('');
}

function projectionTable(proj, scenario) {
  const ages = new Set();
  // Every 5 years, plus retirement age, plus last row
  for (let a = scenario.currentAge; a <= scenario.lifeExpectancy; a += 5) ages.add(a);
  ages.add(scenario.retirementAge);
  ages.add(scenario.lifeExpectancy);
  [65, 71, 85, 90, 95].forEach((a) => { if (a >= scenario.currentAge && a <= scenario.lifeExpectancy) ages.add(a); });

  const sorted = [...ages].sort((a, b) => a - b);
  return sorted.map((age) => {
    const row = proj.find((r) => r.age === age);
    if (!row) return '';
    const label = age === scenario.retirementAge ? `<strong>${age} (Retire)</strong>` : `${age}`;
    return `<tr>
      <td>${label}</td>
      <td class="num">${$(row.totalPortfolio)}</td>
      <td class="num">${$(row.totalIncome)}</td>
      <td class="num">${$(row.totalTax)}</td>
      <td class="num">${$(row.netWorth)}</td>
    </tr>`;
  }).join('');
}

export function generateReport(scenario, projectionData, userName) {
  const retRow = projectionData.find((r) => r.age === scenario.retirementAge);
  const lastRow = projectionData[projectionData.length - 1];
  const { sustainableMonthly } = calcSustainableWithdrawal(scenario);
  const estate = calcEstateImpact(scenario, projectionData, scenario.lifeExpectancy);
  const depleted = projectionData.find((r) => r.totalPortfolio <= 0);
  const surplus = (retRow?.afterTaxIncome || 0) - (retRow?.expenses || 0) - (retRow?.debtPayments || 0);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Retirement Report – ${scenario.name}</title>
<style>
  @page { margin: 0.6in 0.7in; size: letter; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1f2937;
         font-size: 11px; line-height: 1.5; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
  h1 { font-size: 22px; color: #111827; margin-bottom: 2px; }
  h2 { font-size: 14px; color: #ea580c; margin: 16px 0 8px; padding-bottom: 4px;
       border-bottom: 2px solid #fed7aa; }
  h3 { font-size: 12px; color: #374151; margin: 12px 0 6px; }
  .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  .date { color: #9ca3af; font-size: 10px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
  .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px;
         border-left: 3px solid #ea580c; }
  .kpi .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
  .kpi .value { font-size: 18px; font-weight: 700; color: #111827; }
  .kpi .note { font-size: 9px; color: #9ca3af; }
  .kpi.warn { border-left-color: #dc2626; }
  .kpi.good { border-left-color: #16a34a; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 6px 0; }
  th { background: #f3f4f6; text-align: left; padding: 5px 8px; font-weight: 600;
       border-bottom: 2px solid #d1d5db; font-size: 9px; text-transform: uppercase;
       letter-spacing: 0.3px; color: #374151; }
  td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr:nth-child(even) { background: #f9fafb; }
  .cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e7eb;
            font-size: 9px; color: #9ca3af; text-align: center; }
  .disclaimer { background: #fefce8; border: 1px solid #fde68a; border-radius: 6px;
                padding: 8px 12px; font-size: 9px; color: #92400e; margin: 12px 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>

<div class="page">
  <h1>${scenario.name}</h1>
  <div class="subtitle">${userName ? `Prepared for ${userName}` : 'Retirement Plan Summary'}</div>
  <div class="date">Generated ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

  <h2>Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="label">Net Worth at Retirement</div>
      <div class="value">${$(retRow?.netWorth || 0)}</div>
      <div class="note">Age ${scenario.retirementAge}</div>
    </div>
    <div class="kpi">
      <div class="label">Annual Retirement Income</div>
      <div class="value">${$(retRow?.totalIncome || 0)}</div>
      <div class="note">First year of retirement</div>
    </div>
    <div class="kpi ${surplus >= 0 ? 'good' : 'warn'}">
      <div class="label">Annual ${surplus >= 0 ? 'Surplus' : 'Deficit'}</div>
      <div class="value">${$(Math.abs(surplus))}</div>
      <div class="note">${surplus >= 0 ? 'Income exceeds expenses' : 'Expenses exceed income'}</div>
    </div>
    <div class="kpi">
      <div class="label">Annual Tax</div>
      <div class="value">${$(retRow?.totalTax || 0)}</div>
      <div class="note">Federal + Ontario combined</div>
    </div>
    <div class="kpi ${sustainableMonthly > 0 ? 'good' : 'warn'}">
      <div class="label">Sustainable Monthly</div>
      <div class="value">${$(sustainableMonthly)}</div>
      <div class="note">Max spend to age 95</div>
    </div>
    <div class="kpi ${depleted ? 'warn' : 'good'}">
      <div class="label">Portfolio Depletion</div>
      <div class="value">${depleted ? `Age ${depleted.age}` : 'Never'}</div>
      <div class="note">${depleted ? 'Funds run out' : 'Lasts beyond plan horizon'}</div>
    </div>
  </div>

  <h2>Key Assumptions & Inputs</h2>
  <div class="cols2">
    <table>${inputsTable(scenario)}</table>
    <div>
      <h3>Withdrawal Strategy</h3>
      <table>
        <tr><td>Order</td><td class="num">${(scenario.withdrawalOrder || []).join(' → ')}</td></tr>
        <tr><td>RRSP Meltdown</td><td class="num">${scenario.rrspMeltdownEnabled ? 'Yes' : 'No'}</td></tr>
        <tr><td>Has Will</td><td class="num">${scenario.hasWill ? 'Yes' : 'No'}</td></tr>
        <tr><td>Primary Beneficiary</td><td class="num">${scenario.primaryBeneficiary || 'N/A'}</td></tr>
      </table>
    </div>
  </div>
</div>

<div class="page">
  <h2>Year-by-Year Projection</h2>
  <table>
    <thead>
      <tr><th>Age</th><th style="text-align:right">Portfolio</th><th style="text-align:right">Income</th><th style="text-align:right">Tax</th><th style="text-align:right">Net Worth</th></tr>
    </thead>
    <tbody>${projectionTable(projectionData, scenario)}</tbody>
  </table>

  <h2>Estate Analysis (at age ${scenario.lifeExpectancy})</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="label">Gross Estate</div>
      <div class="value">${$(estate.grossEstate)}</div>
    </div>
    <div class="kpi warn">
      <div class="label">Total Estate Tax</div>
      <div class="value">${$(estate.totalEstateTax)}</div>
    </div>
    <div class="kpi good">
      <div class="label">Net to Heirs</div>
      <div class="value">${$(estate.netToHeirs)}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Tax Component</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr><td>RRSP/RRIF Deemed Income Tax</td><td class="num">${$(estate.rrspRrifTax || 0)}</td></tr>
      <tr><td>Capital Gains Tax</td><td class="num">${$(estate.capitalGainsTax || 0)}</td></tr>
      <tr><td>Probate Fees</td><td class="num">${$(estate.probateFees || 0)}</td></tr>
    </tbody>
  </table>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute
    financial advice. Tax calculations are estimates based on current Ontario and federal rates.
    Consult a qualified financial planner for personalized advice.
  </div>

  <div class="footer">
    RetirePlanner.ca &middot; Report generated ${new Date().toISOString().slice(0, 10)}
  </div>
</div>
</body></html>`;

  return html;
}

export function openReport(scenario, projectionData, userName) {
  const html = generateReport(scenario, projectionData, userName);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  // Auto-trigger print after a short delay
  if (win) {
    win.addEventListener('load', () => {
      setTimeout(() => win.print(), 400);
    });
  }
  // Clean up blob URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
