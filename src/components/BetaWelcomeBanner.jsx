import React from 'react';
import { createPortal } from 'react-dom';

const FEATURES = [
  'AI-powered insights on every tab',
  'Compare multiple scenarios',
  'Estate planning & heir distribution',
  'Deep Dive phase analysis',
  'Optimize 8 AI-ranked strategies',
  'Excel & PDF reports',
];

export default function BetaWelcomeBanner({ overrideDaysRemaining, onDismiss }) {
  const daysLabel = overrideDaysRemaining != null
    ? `${overrideDaysRemaining} days of full access`
    : 'Full access during beta';

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-sunset-500 to-purple-600 px-6 py-5 text-white">
          <div className="text-2xl mb-1">Beta Access Unlocked!</div>
          <p className="text-sm text-white/80">{daysLabel}</p>
        </div>

        {/* Feature list */}
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Everything included in your beta access:</p>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                <svg className="w-4 h-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-sunset-500 to-sunset-600
                       hover:from-sunset-600 hover:to-sunset-700 transition-all"
          >
            Start Exploring →
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
