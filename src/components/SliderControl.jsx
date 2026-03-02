import React from 'react';
import { formatCurrency } from '../utils/formatters';

const formatters = {
  currency: (v) => formatCurrency(v),
  percent: (v) => `${Number(v ?? 0).toFixed(1)}%`,
  number: (v) => String(v ?? 0),
};

export default function SliderControl({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format = 'currency',
  helper,
}) {
  const fmt = formatters[format] || formatters.number;

  const handleChange = (e) => {
    if (onChange) {
      onChange(Number(e.target.value));
    }
  };

  // Calculate fill percentage for gradient track
  const pct = max !== min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-sm font-medium text-gray-700">{label}</span>
        )}
        <span className="text-sm font-semibold text-sunset-600 tabular-nums">
          {fmt(value)}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          onChange={handleChange}
          className="w-full"
          style={{
            background: `linear-gradient(to right, #f97316 0%, #f97316 ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{fmt(min)}</span>
          <span>{fmt(max)}</span>
        </div>
      </div>

      {helper && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
}
