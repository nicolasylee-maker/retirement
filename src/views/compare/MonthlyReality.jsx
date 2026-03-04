import React from 'react';
import { computeMonthlySnapshots, SNAPSHOT_AGES } from '../../utils/compareAnalysis';
import { SCENARIO_COLORS } from '../../constants/designTokens';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters';

function SnapshotCard({ age, scenarioData }) {
  return (
    <div className="card-base p-3 space-y-2">
      <div className="text-sm font-semibold text-gray-700">Age {age}</div>

      <div className="space-y-2">
        {scenarioData.map((item, idx) => {
          if (!item) {
            return (
              <div key={idx} className="text-xs text-gray-400 italic py-1">
                <span style={{ color: SCENARIO_COLORS[idx] }} className="font-medium">
                  {item?.name || `Scenario ${idx + 1}`}
                </span>{' '}
                — N/A
              </div>
            );
          }

          return (
            <div key={idx} className="text-xs space-y-0.5 py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium truncate" style={{ color: SCENARIO_COLORS[idx] }}>
                {item.name}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-gray-600">
                <span>Income</span>
                <span className="text-right font-medium text-gray-900">{formatCurrency(item.snapshot.monthlyIncome)}/mo</span>
                <span>Expenses</span>
                <span className="text-right font-medium text-gray-900">{formatCurrency(item.snapshot.monthlyExpenses)}/mo</span>
                <span>{item.snapshot.monthlySurplus >= 0 ? 'Surplus' : 'Shortfall'}</span>
                <span className={`text-right font-medium ${item.snapshot.monthlySurplus >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {item.snapshot.monthlySurplus >= 0 ? '+' : ''}{formatCurrency(item.snapshot.monthlySurplus)}/mo
                </span>
                <span>Portfolio</span>
                <span className="text-right font-medium text-gray-900">{formatCurrencyShort(item.snapshot.portfolioBalance)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MonthlyReality({ selectedScenarios, projections }) {
  if (!selectedScenarios || selectedScenarios.length === 0 || !projections || projections.length === 0) return null;

  // Compute snapshots per scenario
  const allSnapshots = selectedScenarios.map((s, idx) =>
    computeMonthlySnapshots(projections[idx])
  );

  // Find which snapshot ages have data in at least one scenario
  const activeAges = SNAPSHOT_AGES.filter(age =>
    allSnapshots.some(snaps => snaps.find(s => s.age === age))
  );

  if (activeAges.length === 0) return null;

  return (
    <div className="card-base p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Monthly Reality Check</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {activeAges.map(age => {
          const scenarioData = selectedScenarios.map((s, idx) => {
            const snapshot = allSnapshots[idx].find(snap => snap.age === age);
            if (!snapshot) return null;
            return { name: s.name || 'Unnamed', snapshot };
          });

          return <SnapshotCard key={age} age={age} scenarioData={scenarioData} />;
        })}
      </div>
    </div>
  );
}
