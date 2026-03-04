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
      {items.map(({ color, label, dashed }) => (
        <span key={label} className="flex items-center gap-1.5">
          {dashed ? (
            <svg width="14" height="3" className="flex-shrink-0">
              <line x1="0" y1="1.5" x2="14" y2="1.5"
                stroke={color} strokeWidth="2" strokeDasharray="3 2" />
            </svg>
          ) : (
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          {label}
        </span>
      ))}
    </div>
  );
}
