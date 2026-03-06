import React from 'react';

export default function ModePicker({ onSelectBasic, onSelectFull }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">How would you like to start?</h2>
          <p className="text-gray-500 mt-1.5 text-sm">You can always add more detail later.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Quick Start card */}
          <button
            type="button"
            onClick={onSelectBasic}
            className="text-left rounded-xl border-2 border-sunset-300 bg-sunset-50 p-5 hover:border-sunset-500 hover:bg-sunset-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sunset-400"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚡</span>
              <span className="font-bold text-gray-900 text-lg">Quick Start</span>
            </div>
            <p className="text-xs font-semibold text-sunset-600 uppercase tracking-wide mb-3">~2 minutes</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex items-start gap-1.5">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                10 key fields only
              </li>
              <li className="flex items-start gap-1.5">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Instant retirement snapshot
              </li>
              <li className="flex items-start gap-1.5">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Add more detail anytime
              </li>
              <li className="flex items-start gap-1.5">
                <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-gray-400">Solo only (no couples)</span>
              </li>
            </ul>
            <div className="mt-4 text-center">
              <span className="inline-block bg-sunset-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                Quick Start →
              </span>
            </div>
          </button>

          {/* Full Setup card */}
          <button
            type="button"
            onClick={onSelectFull}
            className="text-left rounded-xl border-2 border-gray-200 bg-white p-5 hover:border-indigo-300 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎯</span>
              <span className="font-bold text-gray-900 text-lg">Full Setup</span>
            </div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">~10 minutes</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex items-start gap-1.5">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                All 9 wizard steps
              </li>
              <li className="flex items-start gap-1.5">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Maximum accuracy
              </li>
              <li className="flex items-start gap-1.5">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Pensions, debt, estate &amp; more
              </li>
              <li className="flex items-start gap-1.5">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Couples supported
              </li>
            </ul>
            <div className="mt-4 text-center">
              <span className="inline-block bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                Full Setup →
              </span>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          You can always switch to Full Setup from the dashboard later.
        </p>
      </div>
    </div>
  );
}
