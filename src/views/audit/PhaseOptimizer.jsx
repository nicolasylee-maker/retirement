import React from 'react';
import MathCard, { MathRow } from './MathCard';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters';

const DIM_ICONS = {
  cpp: '🇨🇦',
  oas: '🍁',
  withdrawalOrder: '📊',
  meltdown: '🔥',
  debt: '💳',
  expenses: '💰',
  spouseCpp: '👫',
  spouseOas: '👫',
};

/**
 * Page 6: Optimizer — what could be better.
 * Shows optimization results if available, otherwise a prompt to run the optimizer.
 */
export default function PhaseOptimizer({ scenario, optimizationResult }) {
  if (!optimizationResult) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-lg font-bold text-gray-900">Optimizer</h2>
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-3xl mb-3">✨</p>
          <p className="text-sm text-gray-600 mb-2">
            Run the optimizer from the Optimize tab to see recommendations here.
          </p>
          <p className="text-xs text-gray-400">
            The optimizer tests hundreds of strategy variations to find the best combination of CPP timing,
            OAS timing, withdrawal order, and RRSP meltdown settings.
          </p>
        </div>
      </div>
    );
  }

  const { recommendations, alreadyOptimal, runCount, baselineDepletion, baselineLifetimeIncome } = optimizationResult;

  const totalYearsGained = recommendations.reduce((s, r) => s + (r.impact?.depletionYearsGained || 0), 0);
  const totalIncomeGained = recommendations.reduce((s, r) => s + (r.impact?.lifetimeIncomeGained || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-lg font-bold text-gray-900">
        Optimizer Results <span className="text-sm font-normal text-gray-500">{runCount} variations tested</span>
      </h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Baseline Depletion</p>
          <p className="text-lg font-bold text-gray-900">{baselineDepletion ? `Age ${baselineDepletion}` : 'Never'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Baseline Income</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrencyShort(baselineLifetimeIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Potential Years Gained</p>
          <p className="text-lg font-bold text-green-600">+{totalYearsGained}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Potential Income Gained</p>
          <p className="text-lg font-bold text-green-600">+{formatCurrencyShort(totalIncomeGained)}</p>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Recommendations</p>
          {recommendations.map(rec => (
            <MathCard
              key={rec.id || rec.dimension}
              title={rec.title}
              summary={rec.description}
              icon={DIM_ICONS[rec.dimension] || '💡'}
            >
              <MathRow label="Current setting" value={rec.before?.label || '—'} />
              <MathRow label="Recommended" value={rec.after?.label || '—'} bold color="#22c55e" />
              {rec.impact?.depletionYearsGained > 0 && (
                <MathRow label="Years gained" value={`+${rec.impact.depletionYearsGained}`} color="#22c55e" />
              )}
              {rec.impact?.lifetimeIncomeGained > 0 && (
                <MathRow label="Lifetime income gained" value={formatCurrency(rec.impact.lifetimeIncomeGained)} color="#22c55e" />
              )}
              {rec.impact?.monthlyImpact > 0 && (
                <MathRow label="Monthly impact" value={`+${formatCurrency(rec.impact.monthlyImpact)}/mo`} color="#22c55e" />
              )}
              {rec.reasoning && <p className="text-gray-500 mt-1">{rec.reasoning}</p>}
            </MathCard>
          ))}
        </div>
      )}

      {/* Already optimal */}
      {alreadyOptimal?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Already Optimal</p>
          <div className="flex flex-wrap gap-2">
            {alreadyOptimal.map(ao => (
              <span
                key={ao.dimension}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200"
              >
                {DIM_ICONS[ao.dimension] || '✓'} {ao.label || ao.dimension}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
