import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import SliderControl from '../components/SliderControl';
import Button from '../components/Button';
import { formatCurrency } from '../utils/formatters';

const WHAT_IF_SLIDERS = [
  {
    key: 'realReturn',
    label: 'Investment Return',
    min: 0,
    max: 10,
    step: 0.5,
    format: 'percent',
    isRate: true,
  },
  {
    key: 'inflationRate',
    label: 'Inflation Rate',
    min: 0,
    max: 6,
    step: 0.5,
    format: 'percent',
    isRate: true,
  },
  {
    key: 'monthlyExpenses',
    label: 'Monthly Expenses',
    min: 1000,
    max: 15000,
    step: 250,
    format: 'currency',
  },
  {
    key: 'lifeExpectancy',
    label: 'Life Expectancy',
    min: 75,
    max: 105,
    step: 1,
    format: 'number',
  },
  {
    key: 'retirementAge',
    label: 'Retirement Age',
    min: 30,
    max: 100,
    step: 1,
    format: 'number',
    dynamic: true,
  },
];

function SliderList({ scenario, overrides, onOverrideChange, onReset, onEditAssumptions }) {
  const hasOverrides = Object.keys(overrides).length > 0;
  const effectiveLifeExpectancy = overrides.lifeExpectancy ?? scenario.lifeExpectancy;
  const alreadyRetired = scenario.currentAge >= scenario.retirementAge;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {WHAT_IF_SLIDERS.map((slider) => {
          // Skip retirement age slider if already retired
          if (slider.key === 'retirementAge' && alreadyRetired) return null;

          const raw = overrides[slider.key] ?? scenario[slider.key];
          const displayVal = slider.isRate ? raw * 100 : raw;

          // Dynamic bounds for retirement age
          let sliderMin = slider.min;
          let sliderMax = slider.max;
          if (slider.key === 'retirementAge') {
            sliderMin = scenario.currentAge + 1;
            sliderMax = effectiveLifeExpectancy - 1;
          }

          let subtitle;
          if (slider.key === 'monthlyExpenses') {
            const reduction = scenario.expenseReductionAtRetirement || 0;
            const effectiveRetAge = overrides.retirementAge ?? scenario.retirementAge;
            const isPreRetirement = scenario.currentAge < effectiveRetAge;
            if (isPreRetirement && reduction > 0) {
              const reduced = Math.round(raw * (1 - reduction));
              const pct = Math.round(reduction * 100);
              subtitle = `${formatCurrency(reduced)}/mo after ${pct}% retirement reduction`;
            }
          } else if (slider.key === 'retirementAge') {
            const yearsUntil = raw - scenario.currentAge;
            subtitle = `Retire in ${yearsUntil} year${yearsUntil !== 1 ? 's' : ''}`;
            if (scenario.rrspMeltdownEnabled && scenario.rrspMeltdownStartAge === scenario.retirementAge && raw !== scenario.retirementAge) {
              subtitle += ' · RRSP meltdown start age will also shift';
            }
          }
          return (
            <SliderControl
              key={slider.key}
              label={slider.label}
              value={displayVal}
              onChange={(val) => onOverrideChange(slider.key, slider.isRate ? val / 100 : val)}
              min={sliderMin}
              max={sliderMax}
              step={slider.step}
              format={slider.format}
              subtitle={subtitle}
              subtitleClassName={slider.key === 'retirementAge' && subtitle?.includes('meltdown') ? 'text-amber-600' : undefined}
            />
          );
        })}
      </div>
      {alreadyRetired && (
        <p className="text-sm text-gray-400 mt-2 italic">
          Already retired — retirement age cannot be changed.
        </p>
      )}
      {hasOverrides && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <Button variant="secondary" size="sm" onClick={onReset}>
            Reset to saved values
          </Button>
          {onEditAssumptions && (
            <button
              type="button"
              onClick={onEditAssumptions}
              className="text-sm font-medium text-sunset-600 hover:text-sunset-800 underline underline-offset-2"
            >
              Make changes permanent &rarr;
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function WhatIfPanel({ scenario, overrides, onOverrideChange, onReset, expanded, onToggle, onEditAssumptions }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasOverrides = Object.keys(overrides).length > 0;

  const panelIcon = (
    <svg className="w-4 h-4 text-sunset-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
    </svg>
  );

  return (
    <>
      {/* ── Desktop: inline collapsible card (md+) ── */}
      <div className="hidden md:block card-base overflow-hidden">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center px-6 py-4 text-left
                     hover:bg-gray-50 transition-colors duration-150 focus:outline-none
                     focus:ring-2 focus:ring-sunset-400 focus:ring-inset"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-8 h-8 rounded-full bg-sunset-100 flex items-center justify-center">
              {panelIcon}
            </div>
            <div>
              <span className="text-lg font-semibold text-gray-900">What If?</span>
              {!expanded && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Adjust return, inflation, expenses, life expectancy &amp; retirement age to stress-test your plan
                </p>
              )}
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {hasOverrides && (
              <span className="text-xs font-medium text-sunset-600 bg-sunset-50 px-2 py-0.5 rounded-full">
                Modified
              </span>
            )}
          </div>
        </button>

        {expanded && (
          <div className="px-6 pb-6 pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-5">
              Adjust assumptions to see how they affect your plan.
            </p>
            <SliderList scenario={scenario} overrides={overrides}
              onOverrideChange={onOverrideChange} onReset={onReset}
              onEditAssumptions={onEditAssumptions} />
          </div>
        )}
      </div>

      {/* ── Mobile: sticky bottom bar + portal drawer (< md) ── */}
      <div className="md:hidden">
        {/* Sticky bottom trigger bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3
                       focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-inset"
            aria-label="Open What If panel"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sunset-100 flex items-center justify-center">
                {panelIcon}
              </div>
              <span className="text-sm font-semibold text-gray-900">What If?</span>
              {hasOverrides && (
                <span className="w-2 h-2 rounded-full bg-sunset-500 ml-0.5" aria-label="Modified" />
              )}
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {/* Portal drawer */}
        {drawerOpen && createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            {/* Sheet */}
            <div
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl
                         max-h-[85vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="What If panel"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-sunset-100 flex items-center justify-center">
                    {panelIcon}
                  </div>
                  <span className="text-base font-semibold text-gray-900">What If?</span>
                  {hasOverrides && (
                    <span className="text-xs font-medium text-sunset-600 bg-sunset-50 px-2 py-0.5 rounded-full">
                      Modified
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Slider content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="text-sm text-gray-500 mb-4">
                  Adjust assumptions to see how they affect your plan.
                </p>
                <SliderList scenario={scenario} overrides={overrides}
                  onOverrideChange={onOverrideChange} onReset={onReset} />
                {/* Extra bottom padding so sliders aren't hidden behind the system home bar */}
                <div className="h-6" />
              </div>
            </div>
          </>,
          document.body,
        )}
      </div>
    </>
  );
}
