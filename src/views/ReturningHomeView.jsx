import React from 'react';

export default function ReturningHomeView({ userName, onViewResults, onEditPlan, onCreateNew }) {
  const firstName = userName?.split(' ')[0] || userName || null;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        {firstName && (
          <p className="text-xs font-semibold text-sunset-600 uppercase tracking-widest mb-2">
            Welcome back, {firstName}
          </p>
        )}
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
          What would you like to do?
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Pick up where you left off, or start something new.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* View Results — primary */}
          <button
            type="button"
            onClick={onViewResults}
            className="relative bg-white border-2 border-sunset-500 rounded-xl p-5 text-left
                       hover:shadow-md transition-all duration-150 group
                       focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2"
            style={{ background: 'linear-gradient(145deg, #fff7ed 0%, #fff 55%)' }}
          >
            <span className="absolute top-3 right-3 text-[9px] font-semibold text-sunset-600
                             bg-sunset-50 border border-sunset-200 px-2 py-0.5 rounded-full
                             uppercase tracking-wide">
              Most used
            </span>
            <div className="w-9 h-9 rounded-lg bg-sunset-50 flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#ea580c" strokeWidth={1.8}
                   strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">View My Results</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              See projections, safe spend, and estate for your saved scenarios.
            </p>
            <div className="mt-4 flex justify-end">
              <svg className="w-4 h-4 text-sunset-400 group-hover:text-sunset-600 group-hover:translate-x-0.5
                              transition-all duration-150" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </button>

          {/* Edit a Plan */}
          <button
            type="button"
            onClick={onEditPlan}
            className="bg-white border border-gray-200 rounded-xl p-5 text-left shadow-sm
                       hover:border-sunset-300 hover:shadow-md transition-all duration-150 group
                       focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth={1.8}
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Edit a Plan</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Update income, savings, or expenses in an existing scenario.
            </p>
            <div className="mt-4 flex justify-end">
              <svg className="w-4 h-4 text-gray-300 group-hover:text-sunset-400 group-hover:translate-x-0.5
                              transition-all duration-150" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </button>

          {/* Create New */}
          <button
            type="button"
            onClick={onCreateNew}
            className="bg-white border border-gray-200 rounded-xl p-5 text-left shadow-sm
                       hover:border-sunset-300 hover:shadow-md transition-all duration-150 group
                       focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2"
          >
            <div className="w-9 h-9 rounded-lg bg-forest-50 flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={1.8}
                   strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Create New Plan</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Start fresh with new assumptions or a different scenario.
            </p>
            <div className="mt-4 flex justify-end">
              <svg className="w-4 h-4 text-gray-300 group-hover:text-sunset-400 group-hover:translate-x-0.5
                              transition-all duration-150" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
