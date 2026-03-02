import React from 'react';

export default function QuickFillPills({ presets = [], onSelect, activeKey }) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={`px-3 py-1 text-sm rounded-full font-medium transition-colors duration-150
            ${activeKey === key
              ? 'bg-sunset-500 text-white shadow-sm'
              : 'border border-gray-300 text-gray-600 hover:border-sunset-400 hover:text-sunset-600'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
