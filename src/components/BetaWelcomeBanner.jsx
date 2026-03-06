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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-sm w-full p-8 text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>

        {/* Days pill */}
        <span className="inline-block bg-purple-50 text-purple-700 text-sm font-medium rounded-full px-3 py-1 mb-3">
          {daysLabel}
        </span>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          You've unlocked{' '}
          <span className="text-sunset-600">RetirePlanner.ca</span>
        </h2>
        <p className="text-sm text-gray-500 mb-6">Everything in Pro is yours during beta.</p>

        {/* Feature list */}
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 text-left">
          What's included
        </p>
        <ul className="text-left space-y-2 mb-6">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
              <svg className="w-4 h-4 shrink-0 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white
                     bg-gradient-to-r from-sunset-500 to-sunset-600
                     hover:from-sunset-600 hover:to-sunset-700 transition-all"
        >
          Start Exploring →
        </button>
      </div>
    </div>,
    document.body
  );
}
