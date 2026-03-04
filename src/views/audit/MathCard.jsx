import React, { useState } from 'react';

/**
 * Expandable "show me the math" card.
 * Collapsed: title + summary value. Expanded: detailed breakdown.
 */
export default function MathCard({ title, summary, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 truncate">{summary}</p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 text-xs text-gray-600 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

/** Simple row inside a MathCard: label on left, value on right */
export function MathRow({ label, value, bold, color }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-gray-900' : ''}`}>
      <span>{label}</span>
      <span style={color ? { color } : undefined} className={bold ? 'font-semibold' : ''}>
        {value}
      </span>
    </div>
  );
}
