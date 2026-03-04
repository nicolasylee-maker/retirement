import React from 'react';
import { computeDiffDrivers } from '../../utils/compareAnalysis';
import { SCENARIO_COLORS } from '../../constants/designTokens';
import { formatCurrency } from '../../utils/formatters';

export default function DifferenceDrivers({ selectedScenarios, projections }) {
  if (!selectedScenarios || selectedScenarios.length !== 2) return null;

  const [a, b] = selectedScenarios;
  const diffs = computeDiffDrivers(a, b);

  // Portfolio gap at last common age
  const [projA, projB] = projections || [];
  let portfolioGap = null;
  if (projA?.length && projB?.length) {
    const lastAgeA = projA[projA.length - 1].age;
    const lastAgeB = projB[projB.length - 1].age;
    const commonAge = Math.min(lastAgeA, lastAgeB);
    const endA = projA.find(r => r.age === commonAge)?.totalPortfolio ?? 0;
    const endB = projB.find(r => r.age === commonAge)?.totalPortfolio ?? 0;
    portfolioGap = { diff: endA - endB, age: commonAge };
  }

  return (
    <div className="card-base p-4 space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-900">What's Different?</h2>
        {portfolioGap && (
          <div className="text-sm text-gray-500">
            Portfolio gap at age {portfolioGap.age}:{' '}
            <span className={portfolioGap.diff >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {portfolioGap.diff >= 0 ? '+' : ''}{formatCurrency(portfolioGap.diff)}
            </span>
          </div>
        )}
      </div>

      {diffs.length === 0 ? (
        <p className="text-sm text-gray-500 italic">These scenarios have identical inputs.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {diffs.map(d => (
            <div key={d.key} className="flex items-center text-sm py-1 border-b border-gray-100 last:border-0">
              <span className="text-gray-600 min-w-0 truncate flex-1">{d.label}</span>
              <span className="flex items-center gap-1 ml-2 whitespace-nowrap">
                <span className="font-medium" style={{ color: SCENARIO_COLORS[0] }}>{d.fmtA}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium" style={{ color: SCENARIO_COLORS[1] }}>{d.fmtB}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
