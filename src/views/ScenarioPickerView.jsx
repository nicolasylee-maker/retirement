import React, { useMemo } from 'react';
import { calcSustainableWithdrawal } from '../engines/withdrawalCalc.js';
import { formatScenarioMeta } from '../utils/returningUserFlow.js';

function SafeSpend({ scenario }) {
  const amount = useMemo(() => {
    try {
      const { sustainableMonthly } = calcSustainableWithdrawal(scenario);
      return sustainableMonthly;
    } catch {
      return null;
    }
  }, [scenario]);

  if (amount == null) return null;

  return (
    <div className="text-right shrink-0">
      <div className="text-sm font-bold text-lake-700 tracking-tight">
        ${amount.toLocaleString('en-CA')}/mo
      </div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
        Safe spend
      </div>
    </div>
  );
}

function RecencyLabel({ scenario, isActive }) {
  const label = useMemo(() => {
    const raw = scenario.updatedAt || scenario.createdAt;
    if (!raw) return null;
    const diff = Date.now() - new Date(raw).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 14) return '1 week ago';
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} weeks ago`;
    return null;
  }, [scenario]);

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0
      ${isActive
        ? 'bg-sunset-500 text-white border-transparent'
        : 'bg-gray-100 text-gray-500 border-gray-200'
      }`}>
      {isActive ? 'Last opened' : (label ?? 'Older')}
    </span>
  );
}

export default function ScenarioPickerView({
  scenarios,
  action,
  activeScenarioId,
  onSelect,
  onCreateNew,
  onBack,
}) {
  const heading = action === 'results'
    ? 'Choose a scenario to view'
    : 'Choose a scenario to edit';
  const subheading = action === 'results'
    ? 'Select which plan to view results for'
    : 'Select which plan to open in the wizard';

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 w-8 h-8 rounded-lg border border-gray-200 bg-white shadow-sm
                       flex items-center justify-center shrink-0
                       hover:border-gray-300 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-sunset-400"
            aria-label="Back"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{heading}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subheading}</p>
          </div>
        </div>

        {/* Scenario list */}
        <div className="flex flex-col gap-2">
          {scenarios.map((scenario) => {
            const isActive = scenario.id === activeScenarioId;
            const { provinceLabel, agesLabel, coupleLabel } = formatScenarioMeta(scenario);

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelect(scenario.id)}
                className={`w-full flex items-center gap-3 rounded-xl p-4 text-left
                            border shadow-sm transition-all duration-150 group
                            focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-1
                            ${isActive
                              ? 'border-sunset-500 bg-gradient-to-r from-sunset-50 to-white'
                              : 'border-gray-200 bg-white hover:border-sunset-300 hover:shadow-md'
                            }`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0
                  ${isActive ? 'bg-sunset-50 border-sunset-200' : 'bg-gray-50 border-gray-200'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                       stroke={isActive ? '#ea580c' : '#9ca3af'}
                       strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {scenario.name || 'Unnamed Plan'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>{provinceLabel}</span>
                    <span className="text-gray-300">·</span>
                    <span>{agesLabel}</span>
                    <span className="text-gray-300">·</span>
                    <span>{coupleLabel}</span>
                  </p>
                </div>

                {/* Safe spend */}
                <SafeSpend scenario={scenario} />

                {/* Recency badge */}
                <RecencyLabel scenario={scenario} isActive={isActive} />

                {/* Chevron */}
                <svg className="w-4 h-4 text-gray-300 group-hover:text-sunset-400 shrink-0
                                group-hover:translate-x-0.5 transition-all duration-150"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                     strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>

        {/* Create new escape hatch */}
        <button
          type="button"
          onClick={onCreateNew}
          className="mt-3 w-full flex items-center gap-2 px-4 py-3
                     border border-dashed border-gray-300 rounded-xl
                     text-sm text-gray-500 font-medium
                     hover:border-sunset-400 hover:text-sunset-600 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-sunset-400"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
               strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Create a new plan instead
        </button>

      </div>
    </div>
  );
}
