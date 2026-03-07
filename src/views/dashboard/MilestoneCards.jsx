import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

const MILESTONE_AGES = [85, 90, 95];

function findClosestRow(projectionData, targetAge) {
  if (!projectionData || projectionData.length === 0) return null;
  const exact = projectionData.find(r => r.age === targetAge);
  if (exact) return exact;
  let closest = projectionData[0];
  let minDiff = Math.abs(closest.age - targetAge);
  for (const row of projectionData) {
    const diff = Math.abs(row.age - targetAge);
    if (diff < minDiff) { closest = row; minDiff = diff; }
  }
  return closest;
}

function findDepletionAge(projectionData) {
  const row = projectionData.find(r => r.totalPortfolio <= 0);
  return row ? row.age : null;
}

/** Generate a plain-English explanation for why the milestone looks the way it does. */
function buildInsight(row, scenario, depletionAge, age) {
  const depleted = row.totalPortfolio <= 0;
  const monthlyIncome = Math.round(row.afterTaxIncome / 12);
  const monthlyExpenses = Math.round((row.expenses + row.debtPayments) / 12);
  const gap = monthlyIncome - monthlyExpenses;
  const yearsFromNow = age - scenario.currentAge;
  const yearsInRetirement = age - scenario.retirementAge;
  const hasCpp = row.cppIncome > 0;
  const hasOas = row.oasIncome > 0;

  const reasons = [];

  if (depleted && depletionAge) {
    reasons.push(`Your savings ran out at age ${depletionAge} — that's ${depletionAge - scenario.retirementAge} years into retirement.`);

    // Why it ran out
    const retRow = findClosestRow([row], scenario.retirementAge);
    if (scenario.monthlyExpenses > 3000) {
      reasons.push(`A ${formatCurrency(scenario.monthlyExpenses)}/mo budget requires ${formatCurrency(scenario.monthlyExpenses * 12)}/yr, which is hard to sustain without a large portfolio.`);
    }
    if (!hasCpp || !hasOas) {
      reasons.push('Government benefits haven\'t fully kicked in yet, leaving a bigger gap to fill from savings.');
    }
    if (scenario.consumerDebt > 0) {
      reasons.push(`The ${formatCurrency(scenario.consumerDebt)} in consumer debt ate into savings in the early years.`);
    }

    // What they're living on now
    const sources = [];
    if (hasCpp) sources.push(`CPP (${formatCurrency(Math.round(row.cppIncome / 12))}/mo)`);
    if (hasOas) sources.push(`OAS (${formatCurrency(Math.round(row.oasIncome / 12))}/mo)`);
    if (row.pensionIncome > 0) sources.push(`pension (${formatCurrency(Math.round(row.pensionIncome / 12))}/mo)`);
    if (sources.length > 0) {
      reasons.push(`At age ${age}, you're living on ${sources.join(' + ')} = ${formatCurrency(monthlyIncome)}/mo after tax.`);
    }

    reasons.push(`But expenses have grown to ${formatCurrency(monthlyExpenses)}/mo with ${(scenario.inflationRate * 100).toFixed(1)}% annual inflation over ${yearsFromNow} years.`);
  } else if (!depleted) {
    reasons.push(`After ${yearsInRetirement} years of retirement, you still have ${formatCurrency(row.totalPortfolio)} in savings.`);

    if (gap >= 0) {
      reasons.push(`Your income of ${formatCurrency(monthlyIncome)}/mo fully covers the ${formatCurrency(monthlyExpenses)}/mo in expenses — savings are growing, not shrinking.`);
    } else {
      reasons.push(`You're drawing ${formatCurrency(Math.abs(gap))}/mo from savings to cover the gap between ${formatCurrency(monthlyIncome)}/mo income and ${formatCurrency(monthlyExpenses)}/mo expenses.`);
      const yearsLeft = row.totalPortfolio / (Math.abs(gap) * 12);
      if (yearsLeft < 10) {
        reasons.push(`At this rate, savings could last roughly ${Math.round(yearsLeft)} more years.`);
      }
    }
  }

  return reasons;
}

function DriverBullet({ label, value, color = 'text-gray-600' }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export default function MilestoneCards({ projectionData, scenario }) {
  const [showAll, setShowAll] = useState(false);

  if (!projectionData || projectionData.length === 0) return null;

  const depletionAge = findDepletionAge(projectionData);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {MILESTONE_AGES.map((age, idx) => {
        // On mobile, hide cards beyond the first unless showAll is true
        const hiddenOnMobile = idx > 0 && !showAll;
        const row = findClosestRow(projectionData, age);
        if (!row) return null;

        const value = row.totalPortfolio;
        const depleted = value <= 0;
        const displayAge = row.age;
        const monthlyIncome = Math.round(row.afterTaxIncome / 12);
        const monthlyExpenses = Math.round((row.expenses + row.debtPayments) / 12);
        const monthlyGap = monthlyIncome - monthlyExpenses;
        const hasCpp = row.cppIncome > 0;
        const hasOas = row.oasIncome > 0;
        const hasPension = row.pensionIncome > 0;
        const insights = buildInsight(row, scenario, depletionAge, age);

        return (
          <div
            key={age}
            className={`card-base p-4 flex flex-col gap-3 ${
              depleted ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'
            } ${hiddenOnMobile ? 'hidden sm:flex' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  depleted ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                }`}
              >
                {displayAge}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Age {displayAge}</p>
                <p className={`text-lg font-bold tabular-nums leading-tight ${
                  depleted ? 'text-red-600' : 'text-green-700'
                }`}>
                  {depleted ? 'Depleted' : formatCurrency(value)}
                </p>
              </div>
            </div>

            {/* Drivers */}
            <div className="space-y-1 pt-2 border-t border-gray-200/60">
              <DriverBullet
                label="After-tax income"
                value={`${formatCurrency(monthlyIncome)}/mo`}
                color="text-green-600"
              />
              <DriverBullet
                label="Expenses + debt"
                value={`${formatCurrency(monthlyExpenses)}/mo`}
                color="text-gray-700"
              />
              <DriverBullet
                label={monthlyGap >= 0 ? 'Monthly surplus' : 'Monthly shortfall'}
                value={`${monthlyGap >= 0 ? '+' : ''}${formatCurrency(monthlyGap)}/mo`}
                color={monthlyGap >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            </div>

            {/* Income sources */}
            <div className="flex flex-wrap gap-1.5">
              {hasCpp && (
                <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  CPP {formatCurrency(Math.round(row.cppIncome / 12))}/mo
                </span>
              )}
              {hasOas && (
                <span className="text-[10px] font-medium bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
                  OAS {formatCurrency(Math.round(row.oasIncome / 12))}/mo
                </span>
              )}
              {hasPension && (
                <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                  Pension {formatCurrency(Math.round(row.pensionIncome / 12))}/mo
                </span>
              )}
            </div>

            {/* AI-style insight bullets */}
            <div className="space-y-1.5 pt-2 border-t border-gray-200/60">
              {insights.map((text, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${
                    depleted ? 'bg-red-400' : 'bg-green-400'
                  }`} />
                  <p className="text-[11px] text-gray-600 leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>

      {/* Mobile: show/hide toggle for cards 2 & 3 */}
      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="sm:hidden mt-2 w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Show all 3 milestones ▼
        </button>
      )}
    </div>
  );
}
