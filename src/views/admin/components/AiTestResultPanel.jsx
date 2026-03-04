import React, { useCallback } from 'react'

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
      <svg className="animate-spin w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Generating...
    </div>
  )
}

function ResultColumn({ header, text, loading, error }) {
  if (!text && !loading && !error) return null

  return (
    <div className="overflow-y-auto max-h-[70vh]">
      {loading && <Spinner />}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <span className="font-medium">Error: </span>{error}
        </div>
      )}
      {text && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      )}
    </div>
  )
}

export default function AiTestResultPanel({
  geminiModel,
  rivalProvider,
  rivalModel,
  geminiText,
  rivalText,
  resolvedPrompt,
  geminiLoading,
  rivalLoading,
  geminiError,
  rivalError,
}) {
  const idle = !geminiText && !rivalText && !resolvedPrompt &&
    !geminiLoading && !rivalLoading && !geminiError && !rivalError

  const handleCopy = useCallback(() => {
    if (resolvedPrompt) {
      navigator.clipboard.writeText(resolvedPrompt).catch(() => {})
    }
  }, [resolvedPrompt])

  if (idle) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">Configure above and click <span className="font-medium text-gray-600">Run Test</span> to see results</p>
      </div>
    )
  }

  const providerLabel = rivalProvider
    ? rivalProvider.charAt(0).toUpperCase() + rivalProvider.slice(1)
    : 'Rival'

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Column 1: Gemini */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          Gemini — {geminiModel || '…'}
        </h3>
        <ResultColumn
          text={geminiText}
          loading={geminiLoading}
          error={geminiError}
        />
        {!geminiText && !geminiLoading && !geminiError && (
          <p className="text-xs text-gray-300 italic">Waiting...</p>
        )}
      </div>

      {/* Column 2: Rival */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          {providerLabel} — {rivalModel || '…'}
        </h3>
        <ResultColumn
          text={rivalText}
          loading={rivalLoading}
          error={rivalError}
        />
        {!rivalText && !rivalLoading && !rivalError && (
          <p className="text-xs text-gray-300 italic">Waiting...</p>
        )}
      </div>

      {/* Column 3: Raw prompt */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Raw Prompt</h3>
          {resolvedPrompt && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
            >
              Copy
            </button>
          )}
        </div>
        {resolvedPrompt ? (
          <div className="overflow-y-auto max-h-[70vh]">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
              {resolvedPrompt}
            </pre>
          </div>
        ) : (
          <p className="text-xs text-gray-300 italic">Prompt will appear here after running</p>
        )}
      </div>
    </div>
  )
}
