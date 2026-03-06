import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const fc = (v) => formatCurrency(v);

function buildInputRows(s) {
  const rows = [];

  // --- Age & Retirement ---
  rows.push(['Current Age', s.currentAge]);
  rows.push(['Retirement Age', s.retirementAge]);
  rows.push(['Life Expectancy', s.lifeExpectancy]);

  // --- Couple ---
  if (s.isCouple) {
    rows.push(['Is Couple', 'Yes']);
    rows.push(['Spouse Age', s.spouseAge]);
    rows.push(['Spouse Retirement Age', s.spouseRetirementAge]);
    if ((s.spouseEmploymentIncome || 0) > 0) {
      rows.push(['Spouse Employment', `${fc(s.spouseEmploymentIncome)}/yr`]);
    }
  }

  // --- Employment ---
  if (s.stillWorking && (s.employmentIncome || 0) > 0) {
    rows.push(['Employment Income', `${fc(s.employmentIncome)}/yr`]);
  }
  if ((s.nonTaxedIncome || 0) > 0) {
    rows.push(['Non-Taxed Income', `${fc(s.nonTaxedIncome)}/yr (ages ${s.nonTaxedIncomeStartAge ?? s.currentAge}–${s.nonTaxedIncomeEndAge ?? s.lifeExpectancy})`]);
  }

  // --- Government Benefits ---
  rows.push(['CPP', `${fc(s.cppMonthly)}/mo starting age ${s.cppStartAge}`]);
  rows.push(['OAS', `${fc(s.oasMonthly)}/mo starting age ${s.oasStartAge}`]);
  if (s.isCouple) {
    rows.push(['Spouse CPP', `${fc(s.spouseCppMonthly)}/mo starting age ${s.spouseCppStartAge}`]);
    rows.push(['Spouse OAS', `${fc(s.spouseOasMonthly)}/mo starting age ${s.spouseOasStartAge}`]);
  }
  if (s.gisEligible) rows.push(['GIS', 'Eligible']);
  if (s.gainsEligible) rows.push(['GAINS', 'Eligible']);

  // --- Pension ---
  if (s.pensionType === 'db') {
    rows.push(['DB Pension', `${fc(s.dbPensionAnnual)}/yr starting age ${s.dbPensionStartAge}${s.dbPensionIndexed ? ' (indexed)' : ''}`]);
  }
  if (s.pensionType === 'dc') {
    rows.push(['DC Balance', fc(s.dcPensionBalance)]);
  }
  if (s.isCouple && s.spousePensionType === 'db') {
    rows.push(['Spouse DB Pension', `${fc(s.spouseDbPensionAnnual)}/yr starting age ${s.spouseDbPensionStartAge}${s.spouseDbPensionIndexed ? ' (indexed)' : ''}`]);
  }
  if (s.isCouple && s.spousePensionType === 'dc') {
    rows.push(['Spouse DC Balance', fc(s.spouseDcPensionBalance)]);
  }

  // --- Savings Accounts ---
  rows.push(['RRSP', fc(s.rrspBalance)]);
  rows.push(['TFSA', fc(s.tfsaBalance)]);
  if ((s.liraBalance || 0) > 0) rows.push(['LIRA', fc(s.liraBalance)]);
  if (s.isCouple && ((s.spouseRrspBalance || 0) + (s.spouseRrifBalance || 0)) > 0) {
    rows.push(['Spouse RRSP', fc((s.spouseRrspBalance || 0) + (s.spouseRrifBalance || 0))]);
  }
  if (s.isCouple && (s.spouseTfsaBalance || 0) > 0) {
    rows.push(['Spouse TFSA', fc(s.spouseTfsaBalance)]);
  }

  // --- Other Assets ---
  rows.push(['Non-Registered', fc(s.nonRegInvestments)]);
  rows.push(['Cash Savings', fc(s.cashSavings)]);
  if ((s.otherAssets || 0) > 0) rows.push(['Other Assets', fc(s.otherAssets)]);
  if ((s.realEstateValue || 0) > 0) rows.push(['Real Estate', fc(s.realEstateValue)]);

  // --- Debts ---
  if ((s.mortgageBalance || 0) > 0) rows.push(['Mortgage', fc(s.mortgageBalance)]);
  if ((s.consumerDebt || 0) > 0) rows.push(['Consumer Debt', fc(s.consumerDebt)]);
  if ((s.otherDebt || 0) > 0) rows.push(['Other Debt', fc(s.otherDebt)]);

  // --- Expenses & Returns ---
  rows.push(['Monthly Expenses', fc(s.monthlyExpenses)]);
  rows.push(['Expense Reduction at Retirement', pct(s.expenseReductionAtRetirement)]);
  rows.push(['Inflation Rate', pct(s.inflationRate)]);
  rows.push(['Investment Return', pct(s.realReturn)]);
  if ((s.tfsaReturn || s.realReturn) !== s.realReturn) rows.push(['TFSA Return', pct(s.tfsaReturn)]);
  if ((s.nonRegReturn || s.realReturn) !== s.realReturn) rows.push(['Non-Reg Return', pct(s.nonRegReturn)]);

  // --- RRSP Meltdown ---
  if (s.rrspMeltdownEnabled) {
    rows.push(['RRSP Meltdown', `${fc(s.rrspMeltdownAnnual)}/yr, ages ${s.rrspMeltdownStartAge ?? s.retirementAge}–${s.rrspMeltdownTargetAge}`]);
  }

  // --- Withdrawal Order ---
  if (s.withdrawalOrder?.length > 0) {
    rows.push(['Withdrawal Order', s.withdrawalOrder.join(' → ')]);
  }

  // --- Estate ---
  rows.push(['Has Will', s.hasWill ? 'Yes' : 'No']);
  rows.push(['Primary Beneficiary', s.primaryBeneficiary || 'N/A']);

  return rows;
}

export default function PrintInputsSection({ scenario }) {
  const rows = buildInputRows(scenario);

  return (
    <div className="print-page" style={{ paddingTop: 24 }}>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Plan Inputs</h2>
      <p className="text-sm text-gray-500 mb-4">All values as entered — the raw assumptions behind every projection.</p>

      <div className="card-base overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-2.5 px-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Input</th>
              <th className="py-2.5 px-4 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value], idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                <td className="py-2 px-4 text-gray-600">{label}</td>
                <td className="py-2 px-4 text-right font-medium text-gray-900 tabular-nums">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          RetirePlanner.ca · Not financial advice · Generated {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
