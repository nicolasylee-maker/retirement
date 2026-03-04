import React from 'react';
import { getPhaseRanges, computePhaseSummary, computePhaseStatus } from '../../utils/compareAnalysis';
import { SCENARIO_COLORS } from '../../constants/designTokens';
import { formatCurrencyShort } from '../../utils/formatters';

const STATUS_COLORS = {
  green: 'border-green-500',
  yellow: 'border-yellow-500',
  red: 'border-red-500',
  gray: 'border-gray-300',
};

const STATUS_BG = {
  green: 'bg-green-50',
  yellow: 'bg-yellow-50',
  red: 'bg-red-50',
  gray: 'bg-gray-50',
};

function PhaseCard({ scenario, projection, phase, colorIndex }) {
  if (!projection) {
    return (
      <div className="border-l-4 border-gray-300 bg-gray-50 rounded-r-lg p-3 flex items-center justify-center">
        <span className="text-sm text-gray-400 italic">N/A</span>
      </div>
    );
  }

  const summary = computePhaseSummary(projection, phase);
  if (!summary) {
    return (
      <div className="border-l-4 border-gray-300 bg-gray-50 rounded-r-lg p-3 flex items-center justify-center">
        <span className="text-sm text-gray-400 italic">N/A</span>
      </div>
    );
  }

  const status = computePhaseStatus(summary);

  return (
    <div className={`border-l-4 ${STATUS_COLORS[status]} ${STATUS_BG[status]} rounded-r-lg p-3 space-y-1.5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold truncate" style={{ color: SCENARIO_COLORS[colorIndex] }}>
          {scenario.name || 'Unnamed'}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
          status === 'green' ? 'bg-green-200 text-green-800' :
          status === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
          status === 'red' ? 'bg-red-200 text-red-800' :
          'bg-gray-200 text-gray-600'
        }`}>
          {status === 'green' ? 'Healthy' : status === 'yellow' ? 'Caution' : status === 'red' ? 'At Risk' : 'N/A'}
        </span>
      </div>

      <div className="text-xs text-gray-600 space-y-0.5">
        <div className="flex justify-between">
          <span>Portfolio start</span>
          <span className="font-medium text-gray-900">{formatCurrencyShort(summary.portfolioStart)}</span>
        </div>
        <div className="flex justify-between">
          <span>Portfolio end</span>
          <span className="font-medium text-gray-900">{formatCurrencyShort(summary.portfolioEnd)}</span>
        </div>
        <div className="flex justify-between">
          <span>{summary.avgAnnualSavings >= 0 ? 'Avg annual savings' : 'Avg annual draw'}</span>
          <span className={`font-medium ${summary.avgAnnualSavings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrencyShort(Math.abs(summary.avgAnnualSavings))}{summary.avgAnnualSavings < 0 ? '/yr' : '/yr'}
          </span>
        </div>
      </div>

      {summary.events.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {summary.events.map((e, i) => (
            <span key={i} className="text-[10px] bg-white/70 text-gray-700 border border-gray-200 rounded px-1.5 py-0.5">
              {e.label} @ {e.age}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PhaseComparison({ selectedScenarios, projections }) {
  if (!selectedScenarios || selectedScenarios.length === 0 || !projections || projections.length === 0) return null;

  // Compute phases per scenario, take union of phase IDs
  const allPhaseRanges = selectedScenarios.map(s => getPhaseRanges(s));
  const phaseIdSet = new Set();
  const phaseLabels = {};
  const phaseAges = {};

  for (const ranges of allPhaseRanges) {
    for (const p of ranges) {
      phaseIdSet.add(p.id);
      phaseLabels[p.id] = p.label;
      // Track min/max ages across scenarios for header
      if (!phaseAges[p.id]) phaseAges[p.id] = { start: p.startAge, end: p.endAge };
      else {
        phaseAges[p.id].start = Math.min(phaseAges[p.id].start, p.startAge);
        phaseAges[p.id].end = Math.max(phaseAges[p.id].end, p.endAge);
      }
    }
  }

  const phaseIds = ['working', 'early-retirement', 'rrif', 'estate'].filter(id => phaseIdSet.has(id));
  const gridCols = selectedScenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="card-base p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Life Phase Comparison</h2>

      <div className="space-y-4">
        {phaseIds.map(phaseId => {
          const ages = phaseAges[phaseId];
          return (
            <div key={phaseId}>
              <div className="text-sm font-medium text-gray-700 mb-1.5">
                {phaseLabels[phaseId]}
                <span className="text-gray-400 ml-1.5 font-normal">
                  (ages {ages.start}{ages.start !== ages.end ? `–${ages.end}` : ''})
                </span>
              </div>
              <div className={`grid ${gridCols} gap-2`}>
                {selectedScenarios.map((s, idx) => {
                  const scenarioPhase = allPhaseRanges[idx].find(p => p.id === phaseId);
                  return (
                    <PhaseCard
                      key={s.id}
                      scenario={s}
                      projection={scenarioPhase ? projections[idx] : null}
                      phase={scenarioPhase}
                      colorIndex={idx}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
