import React, { useState } from 'react';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters';

function BigStat({ emoji, label, value, color }) {
  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 text-lg ${color}`}>
        {emoji}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 text-center mt-1">{label}</p>
    </div>
  );
}

function PhaseCard({ label, ageRange, summary, metric, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-purple-300 hover:shadow-md transition-all"
    >
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-400 mb-1">{ageRange}</p>
      <p className="text-xs text-gray-600 mb-2">{summary}</p>
      <p className="text-sm font-bold text-purple-600">{metric}</p>
    </button>
  );
}

/**
 * Page 1: Executive summary — 4 big numbers + phase navigation cards.
 */
export default function AuditSummaryPage({ scenario, projectionData, onNavigate }) {
  const [showAssumptions, setShowAssumptions] = useState(false);
  const s = scenario;
  const data = projectionData;

  // Key metrics
  const retAge = s.retirementAge;
  const depletionRow = data.find(d => d.totalPortfolio <= 0);
  const depletionAge = depletionRow?.age;
  const moneyLastsLabel = depletionAge ? `Age ${depletionAge}` : 'Forever';

  // Average monthly income in retirement
  const retData = data.filter(d => d.age >= retAge);
  const avgRetIncome = retData.length
    ? Math.round(retData.reduce((s, d) => s + d.afterTaxIncome, 0) / retData.length / 12)
    : 0;

  // Net estate at life expectancy
  const lastRow = data[data.length - 1];
  const netEstate = lastRow
    ? (lastRow.totalPortfolio || 0) + (s.realEstateValue || 0) - (lastRow.mortgageBalance || 0)
    : 0;

  // Phase summaries
  const preRetData = data.filter(d => d.age < retAge);
  const earlyRetData = data.filter(d => d.age >= retAge && d.age <= 71);
  const rrifData = data.filter(d => d.age >= 72);

  const totalSaved = preRetData.reduce((s, d) => s + Math.max(0, d.surplus || 0), 0);
  const govBenefitsCover = earlyRetData.length
    ? earlyRetData.reduce((s, d) => s + (d.cppIncome || 0) + (d.oasIncome || 0) + (d.pensionIncome || 0), 0) /
      Math.max(1, earlyRetData.reduce((s, d) => s + (d.expenses || 0), 0)) * 100
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Big 4 stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat emoji="📅" label="Retirement at" value={`Age ${retAge}`} color="bg-purple-100" />
        <BigStat
          emoji="📈"
          label="Money lasts to"
          value={moneyLastsLabel}
          color={depletionAge ? 'bg-red-100' : 'bg-green-100'}
        />
        <BigStat emoji="💵" label="Avg monthly income" value={`${formatCurrencyShort(avgRetIncome)}/mo`} color="bg-blue-100" />
        <BigStat emoji="❤️" label="Net to heirs" value={formatCurrencyShort(netEstate)} color="bg-pink-100" />
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <PhaseCard
          label="Working Years"
          ageRange={`Age ${s.currentAge} – ${retAge - 1}`}
          summary="Building your nest egg through savings and compound growth."
          metric={`${formatCurrencyShort(totalSaved)} total saved`}
          onClick={() => onNavigate(1)}
        />
        <PhaseCard
          label="Early Retirement"
          ageRange={`Age ${retAge} – 71`}
          summary="Living on benefits + tax-free withdrawals before forced RRIF."
          metric={`${govBenefitsCover.toFixed(0)}% from gov't`}
          onClick={() => onNavigate(2)}
        />
        <PhaseCard
          label="Age 72+"
          ageRange="Age 72 – life expectancy"
          summary="Mandatory RRIF withdrawals, OAS clawback territory."
          metric={rrifData.length ? `${rrifData.length} years` : 'N/A'}
          onClick={() => onNavigate(3)}
        />
        <PhaseCard
          label="Estate"
          ageRange={`At age ${s.lifeExpectancy}`}
          summary="What's left for heirs after tax and probate."
          metric={formatCurrencyShort(netEstate)}
          onClick={() => onNavigate(4)}
        />
      </div>

      {/* Assumptions strip */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-700">Key Assumptions</span>
          <span className="text-xs text-gray-400">{showAssumptions ? '▼' : '▶'}</span>
        </button>
        {showAssumptions && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 p-4 text-xs">
            <div><span className="text-gray-500">Inflation:</span> <span className="font-medium">{((s.inflationRate || 0.025) * 100).toFixed(1)}%</span></div>
            <div><span className="text-gray-500">Real Return:</span> <span className="font-medium">{((s.realReturn || 0.04) * 100).toFixed(1)}%</span></div>
            <div><span className="text-gray-500">CPP Start:</span> <span className="font-medium">Age {s.cppStartAge || 65}</span></div>
            <div><span className="text-gray-500">OAS Start:</span> <span className="font-medium">Age {s.oasStartAge || 65}</span></div>
            <div><span className="text-gray-500">Monthly Expenses:</span> <span className="font-medium">{formatCurrency(s.monthlyExpenses || 0)}</span></div>
            <div><span className="text-gray-500">Expense Cut at Ret:</span> <span className="font-medium">{((s.expenseReductionAtRetirement || 0) * 100).toFixed(0)}%</span></div>
            <div><span className="text-gray-500">Province:</span> <span className="font-medium">{s.province || 'ON'}</span></div>
            <div><span className="text-gray-500">RRSP Meltdown:</span> <span className="font-medium">{s.rrspMeltdownEnabled ? 'Yes' : 'No'}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
