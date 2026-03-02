import React from 'react';
import SliderControl from '../components/SliderControl';
import Button from '../components/Button';

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
];

export default function WhatIfPanel({ scenario, overrides, onOverrideChange, onReset, expanded, onToggle }) {

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="card-base overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left
                   hover:bg-gray-50 transition-colors duration-150 focus:outline-none
                   focus:ring-2 focus:ring-sunset-400 focus:ring-inset"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sunset-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-sunset-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-900">What If?</span>
          {hasOverrides && (
            <span className="text-xs font-medium text-sunset-600 bg-sunset-50 px-2 py-0.5 rounded-full">
              Modified
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-5">
            Adjust assumptions to see how they affect your plan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {WHAT_IF_SLIDERS.map((slider) => {
              const raw = overrides[slider.key] ?? scenario[slider.key];
              const displayVal = slider.isRate ? raw * 100 : raw;
              return (
                <SliderControl
                  key={slider.key}
                  label={slider.label}
                  value={displayVal}
                  onChange={(val) => onOverrideChange(slider.key, slider.isRate ? val / 100 : val)}
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  format={slider.format}
                />
              );
            })}
          </div>

          {hasOverrides && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={onReset}>
                Reset to Defaults
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
