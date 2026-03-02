import React from 'react';

function formatDate(isoString) {
  if (!isoString) return 'Unknown date';
  try {
    return new Date(isoString).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

export default function MyPlansView({ scenarios, onSelect, onStartNew }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Plans</h1>
          <button
            type="button"
            onClick={onStartNew}
            className="flex items-center gap-2 px-4 py-2 bg-sunset-500 hover:bg-sunset-600
                       text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Plan
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5
                         flex items-center justify-between gap-4 hover:border-sunset-300
                         hover:shadow-md transition-all"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{scenario.name || 'Unnamed Plan'}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  Created {formatDate(scenario.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(scenario.id)}
                className="shrink-0 px-4 py-2 bg-gray-100 hover:bg-sunset-50 hover:text-sunset-700
                           text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
