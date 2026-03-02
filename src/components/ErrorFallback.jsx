import React from 'react';

export default function ErrorFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center">
        <div className="flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mx-auto mb-5">
          <svg
            className="w-7 h-7 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">
          We&apos;ve been notified and will look into it. Try reloading the page — your data is saved locally.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-sunset-500 hover:bg-sunset-600
                     text-white text-sm font-semibold rounded-lg transition-colors duration-150 shadow-sm"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
