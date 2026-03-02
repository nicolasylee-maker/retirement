import React from 'react';

/**
 * Horizontal color-dot legend strip, rendered as HTML below a chart title.
 * Replace Recharts <Legend> with this to decouple legend positioning from chart internals.
 *
 * @param {{ items: Array<{ color: string, label: string }> }} props
 */
export default function ChartLegend({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 mb-3 text-xs text-gray-500">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
