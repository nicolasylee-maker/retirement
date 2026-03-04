import React, { useState, useMemo } from 'react';
import AiInsight from '../../components/AiInsight';
import Button from '../../components/Button';
import { projectScenario } from '../../engines/projectionEngine';
import { buildCompareAiData } from '../../utils/buildAiData';
import { SCENARIO_COLORS } from '../../constants/designTokens';
import CompareChart from './CompareChart';
import CompareTable from './CompareTable';
import DifferenceDrivers from './DifferenceDrivers';
import PhaseComparison from './PhaseComparison';
import MonthlyReality from './MonthlyReality';

const MAX_COMPARE = 3;

export default function CompareView({ scenarios, onNavigate, aiInsights, onSaveInsight }) {
  const [selectedIds, setSelectedIds] = useState(() => {
    const initial = scenarios.slice(0, Math.min(2, scenarios.length)).map(s => s.id);
    return initial;
  });

  const handleSelect = (index, id) => {
    setSelectedIds(prev => {
      const next = [...prev];
      next[index] = id;
      return next;
    });
  };

  const addSlot = () => {
    if (selectedIds.length >= MAX_COMPARE) return;
    const unused = scenarios.find(s => !selectedIds.includes(s.id));
    if (unused) {
      setSelectedIds(prev => [...prev, unused.id]);
    }
  };

  const removeSlot = (index) => {
    if (selectedIds.length <= 1) return;
    setSelectedIds(prev => prev.filter((_, i) => i !== index));
  };

  const selectedScenarios = useMemo(
    () => selectedIds.map(id => scenarios.find(s => s.id === id)).filter(Boolean),
    [selectedIds, scenarios],
  );

  const projections = useMemo(
    () => selectedScenarios.map(s => projectScenario(s)),
    [selectedScenarios],
  );

  const scenarioNames = selectedScenarios.map(s => s.name || 'Unnamed');

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No scenarios to compare. Create at least two plans.
      </div>
    );
  }

  const aiData = useMemo(
    () => buildCompareAiData(selectedScenarios, projections),
    [selectedScenarios, projections],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Compare Scenarios</h1>

      {/* AI Insights — mobile */}
      {aiData && (
        <div className="xl:hidden">
          <AiInsight type="compare" data={aiData}
            savedInsight={aiInsights?.compare}
            onSave={(text, hash) => onSaveInsight?.('compare', text, hash)} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Scenario selectors */}
          <div className="card-base p-4">
            <div className="flex flex-wrap items-end gap-4">
              {selectedIds.map((id, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-1"
                        style={{ backgroundColor: SCENARIO_COLORS[idx] }}
                      />
                      Scenario {idx + 1}
                    </label>
                    <select
                      value={id}
                      onChange={(e) => handleSelect(idx, e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm
                                 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sunset-500"
                    >
                      {scenarios.map(s => (
                        <option key={s.id} value={s.id}>{s.name || 'Unnamed'}</option>
                      ))}
                    </select>
                  </div>
                  {selectedIds.length > 1 && (
                    <button
                      onClick={() => removeSlot(idx)}
                      className="text-gray-400 hover:text-red-500 text-sm pb-1.5"
                      title="Remove"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {selectedIds.length < MAX_COMPARE && scenarios.length > selectedIds.length && (
                <Button variant="secondary" size="sm" onClick={addSlot}>
                  + Add Scenario
                </Button>
              )}
            </div>
          </div>

          {/* Difference Drivers (2 scenarios only) */}
          <DifferenceDrivers selectedScenarios={selectedScenarios} projections={projections} />

          {/* Phase Comparison */}
          <PhaseComparison selectedScenarios={selectedScenarios} projections={projections} />

          {/* Monthly Reality Check */}
          <MonthlyReality selectedScenarios={selectedScenarios} projections={projections} />

          {/* Chart */}
          {projections.length > 0 && (
            <CompareChart
              projections={projections}
              scenarioNames={scenarioNames}
              colors={SCENARIO_COLORS}
            />
          )}

          {/* Table */}
          {projections.length > 0 && (
            <CompareTable
              projections={projections}
              scenarios={selectedScenarios}
            />
          )}
        </div>

        {/* AI Insights — desktop sticky sidebar */}
        {aiData && (
          <div className="hidden xl:block w-96 flex-shrink-0 sticky top-24">
            <AiInsight type="compare" data={aiData}
              savedInsight={aiInsights?.compare}
              onSave={(text, hash) => onSaveInsight?.('compare', text, hash)} />
          </div>
        )}
      </div>
    </div>
  );
}
