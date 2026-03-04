import React, { useMemo } from 'react';
import AiInsight from '../../components/AiInsight';
import SummaryCards from './SummaryCards';
import PortfolioChart from './PortfolioChart';
import IncomeExpenseChart from './IncomeExpenseChart';
import WithdrawalChart from './WithdrawalChart';
import AccountChart from './AccountChart';
import MilestoneCards from './MilestoneCards';
import { calcTotalTax } from '../../engines/taxEngine';
import { formatCurrency } from '../../utils/formatters';
import { buildDashboardAiData } from '../../utils/buildAiData';

const SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'portfolio-chart', label: 'Portfolio' },
  { id: 'income-chart', label: 'Income vs Expenses' },
  { id: 'withdrawal-chart', label: 'Withdrawals' },
  { id: 'account-chart', label: 'Accounts' },
  { id: 'milestones', label: 'Milestones' },
];

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Dashboard({
  scenario,
  projectionData,
  onScenarioChange,
  aiInsights,
  onSaveInsight,
}) {
  if (!scenario || !projectionData || projectionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No scenario data available. Create a plan to get started.
      </div>
    );
  }

  const aiData = useMemo(
    () => buildDashboardAiData(scenario, projectionData),
    [scenario, projectionData],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
        {scenario.name || 'Retirement Plan'}
      </h1>

      {/* AI Insights — mobile (above content) */}
      <div className="xl:hidden">
        <AiInsight type="dashboard" data={aiData}
          savedInsight={aiInsights?.dashboard}
          onSave={(text, hash) => onSaveInsight?.('dashboard', text, hash)} />
      </div>

      {/* Two-column layout: content left, AI sticky right on desktop */}
      <div className="flex gap-6 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          <div id="summary">
            <SummaryCards projectionData={projectionData} scenario={scenario} />
          </div>

          {/* One-time migration banner for meltdown start age */}
          {scenario._meltdownStartAgeMigrated && onScenarioChange && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">We've added a meltdown start age.</span>{' '}
                  Your existing plan starts at age {scenario.rrspMeltdownStartAge}.
                  Consider changing to {scenario.retirementAge} for better tax efficiency.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onScenarioChange({ _meltdownStartAgeMigrated: false })}
                className="text-blue-400 hover:text-blue-600 flex-shrink-0"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Meltdown during working years warning */}
          {scenario.rrspMeltdownEnabled
            && (scenario.rrspMeltdownStartAge ?? scenario.retirementAge) < scenario.retirementAge
            && (scenario.stillWorking ?? true)
            && scenario.employmentIncome > 0
            && (() => {
              const meltdownAnnual = scenario.rrspMeltdownAnnual || 0;
              const empIncome = scenario.employmentIncome || 0;
              const startAge = scenario.rrspMeltdownStartAge ?? scenario.retirementAge;
              const preRetYears = scenario.retirementAge - Math.max(startAge, scenario.currentAge);
              if (preRetYears <= 0) return null;
              const extraTax = calcTotalTax(empIncome + meltdownAnnual, scenario.currentAge, false, scenario.province || 'ON')
                - calcTotalTax(empIncome, scenario.currentAge, false, scenario.province || 'ON');
              if (extraTax <= 0) return null;
              return (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                  <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">RRSP meltdown starts at age {startAge}, before retirement.</span>{' '}
                    Withdrawing {formatCurrency(meltdownAnnual)}/yr on top of {formatCurrency(empIncome)}/yr
                    employment income costs ~{formatCurrency(extraTax)}/yr in extra tax
                    (~{formatCurrency(extraTax * preRetYears)} over {preRetYears} years).
                    Consider setting start age to {scenario.retirementAge} for lower tax rates.
                  </p>
                </div>
              );
            })()}

          <div id="portfolio-chart">
            <PortfolioChart projectionData={projectionData} scenario={scenario} />
          </div>

          <div id="income-chart">
            <IncomeExpenseChart projectionData={projectionData} scenario={scenario} />
          </div>

          <div id="withdrawal-chart">
            <WithdrawalChart projectionData={projectionData} scenario={scenario} />
          </div>

          <div id="account-chart">
            <AccountChart projectionData={projectionData} scenario={scenario} />
          </div>

          <div id="milestones">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Portfolio Milestones
            </h2>
            <MilestoneCards projectionData={projectionData} scenario={scenario} />
          </div>

        </div>

        {/* AI Insights — desktop sticky sidebar */}
        <div className="hidden xl:block w-96 flex-shrink-0 sticky top-24">
          <AiInsight type="dashboard" data={aiData}
            savedInsight={aiInsights?.dashboard}
            onSave={(text, hash) => onSaveInsight?.('dashboard', text, hash)} />
          {/* Section jump links */}
          <div className="mt-3 card-base p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Jump to
            </p>
            <div className="flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="text-left text-sm text-purple-600 hover:text-purple-800
                             hover:bg-purple-50 rounded px-2 py-1 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
