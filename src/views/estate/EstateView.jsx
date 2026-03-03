import React, { useState, useMemo } from 'react';
import AiInsight from '../../components/AiInsight';
import SliderControl from '../../components/SliderControl';
import { calcEstateImpact } from '../../engines/estateEngine';
import { buildEstateAiData } from '../../utils/buildAiData';
import { formatCurrency } from '../../utils/formatters';
import EstateSummaryCards from './EstateSummaryCards';
import EstateBreakdown from './EstateBreakdown';

export default function EstateView({ scenario, projectionData, onNavigate, lifeExpectancyOverride, onLifeExpectancyChange, aiInsights, onSaveInsight }) {
  // Use the what-if life expectancy override if present, otherwise scenario value
  const effectiveLifeExpectancy = lifeExpectancyOverride ?? scenario.lifeExpectancy ?? 90;
  const [ageAtDeath, setAgeAtDeath] = useState(
    () => Math.min(effectiveLifeExpectancy, 85),
  );
  const [hasWillOverride, setHasWillOverride] = useState(
    () => scenario.hasWill ?? true,
  );

  // Sync ageAtDeath when life expectancy override changes from What-If panel
  const prevLifeExp = React.useRef(effectiveLifeExpectancy);
  React.useEffect(() => {
    if (effectiveLifeExpectancy !== prevLifeExp.current) {
      setAgeAtDeath(Math.min(effectiveLifeExpectancy, 85));
      prevLifeExp.current = effectiveLifeExpectancy;
    }
  }, [effectiveLifeExpectancy]);

  const estateScenario = useMemo(
    () => ({ ...scenario, hasWill: hasWillOverride }),
    [scenario, hasWillOverride],
  );

  const estateResult = useMemo(
    () => calcEstateImpact(estateScenario, projectionData, ageAtDeath),
    [estateScenario, projectionData, ageAtDeath],
  );

  if (!scenario || !projectionData || projectionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No scenario data available.
      </div>
    );
  }

  const minAge = scenario.currentAge;
  const maxAge = 100;

  const aiData = useMemo(
    () => buildEstateAiData(estateScenario, projectionData, ageAtDeath),
    [estateScenario, projectionData, ageAtDeath],
  );

  const fmt = (v) => new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Estate Analysis</h1>

      {/* AI Insights — mobile */}
      <div className="xl:hidden">
        <AiInsight
          type="estate"
          data={aiData}
          savedInsight={aiInsights?.estate}
          onSave={(text, hash) => onSaveInsight?.('estate', text, hash)}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Controls */}
          <div className="card-base p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderControl
                label="Age at Death"
                value={ageAtDeath}
                onChange={(v) => {
                  setAgeAtDeath(v);
                  if (onLifeExpectancyChange) onLifeExpectancyChange(v);
                }}
                min={minAge}
                max={maxAge}
                step={1}
                format="number"
              />
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Has Will</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasWillOverride}
                  onClick={() => setHasWillOverride(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${hasWillOverride ? 'bg-sunset-500' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${hasWillOverride ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
                <span className="text-sm text-gray-500">
                  {hasWillOverride ? 'Yes' : 'No (intestacy rules apply)'}
                </span>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <EstateSummaryCards estateResult={estateResult} />

          {/* Breakdown table + chart */}
          <EstateBreakdown estateResult={estateResult} />

          {/* Distribution */}
          {estateResult.distribution && (
            <div className="card-base p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Distribution to Heirs
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {estateResult.distribution.spouse > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Spouse</p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">
                      {fmt(estateResult.distribution.spouse)}
                    </p>
                  </div>
                )}
                {estateResult.distribution.children > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Children</p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">
                      {fmt(estateResult.distribution.children)}
                    </p>
                  </div>
                )}
                {estateResult.distribution.other > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Other</p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">
                      {fmt(estateResult.distribution.other)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Insights — desktop sticky sidebar */}
        <div className="hidden xl:block w-96 flex-shrink-0 sticky top-24">
          <AiInsight
            type="estate"
            data={aiData}
            savedInsight={aiInsights?.estate}
            onSave={(text, hash) => onSaveInsight?.('estate', text, hash)}
          />
        </div>
      </div>
    </div>
  );
}
