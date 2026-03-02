import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAiRecommendation,
  hasApiKey,
  setApiKey,
} from '../services/geminiService';

function SparkleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        fill="currentColor"
      />
      <path
        d="M18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25z"
        fill="currentColor"
        opacity={0.6}
      />
    </svg>
  );
}

function ShimmerLines() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 rounded w-3/4 shimmer-line" />
      <div className="h-4 rounded w-full shimmer-line" />
      <div className="h-4 rounded w-5/6 shimmer-line" />
      <div className="h-4 rounded w-2/3 shimmer-line" />
    </div>
  );
}

function ApiKeyPrompt({ onSubmit }) {
  const [key, setKey] = useState('');
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Connect your Gemini API key for personalized AI retirement insights.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          placeholder="Paste your Gemini API key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && key.trim()) {
              setApiKey(key.trim());
              onSubmit();
            }
          }}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-purple-200
                     focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
        />
        <button
          onClick={() => { if (key.trim()) { setApiKey(key.trim()); onSubmit(); } }}
          disabled={!key.trim()}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg
                     bg-gradient-to-r from-purple-600 to-indigo-600
                     hover:from-purple-700 hover:to-indigo-700
                     disabled:opacity-40 transition-all whitespace-nowrap"
        >
          Connect AI
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Free key at{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
          className="text-purple-500 hover:text-purple-700 underline">
          Google AI Studio
        </a>
      </p>
    </div>
  );
}

/** Parse bold markdown and return React nodes */
function parseBold(text) {
  // Handle **bold** patterns
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    // Strip stray ** that didn't close
    return part.replace(/\*\*/g, '');
  });
}

function renderText(text) {
  // First, normalize: join lines that are continuations (not numbered, not bullets, not blank)
  const rawLines = text.split('\n');
  const merged = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) { merged.push(''); continue; }
    // Start of a new block: numbered item, bullet, or "Overall Assessment"
    if (/^\d+[\.\)]/.test(trimmed) || /^[-•]/.test(trimmed) || /^Overall/.test(trimmed)) {
      merged.push(trimmed);
    } else if (merged.length > 0 && merged[merged.length - 1] !== '') {
      // Continue the previous line
      merged[merged.length - 1] += ' ' + trimmed;
    } else {
      merged.push(trimmed);
    }
  }

  return merged.map((line, i) => {
    if (!line) return null;
    // Numbered items
    const numMatch = line.match(/^(\d+[\.\)])\s*(.*)/);
    if (numMatch) {
      return (
        <p key={i} className="ml-1 mb-3 flex gap-2">
          <span className="text-purple-400 font-semibold flex-shrink-0">{numMatch[1]}</span>
          <span className="text-sm text-gray-700 leading-relaxed">{parseBold(numMatch[2])}</span>
        </p>
      );
    }
    // Bullets
    if (/^[-•]/.test(line)) {
      return (
        <p key={i} className="ml-3 mb-1.5 flex gap-2">
          <span className="text-purple-400">{'•'}</span>
          <span className="text-sm text-gray-700">{parseBold(line.slice(1).trim())}</span>
        </p>
      );
    }
    // Regular paragraph (including "Overall Assessment")
    return <p key={i} className="mb-2 text-sm text-gray-700 leading-relaxed">{parseBold(line)}</p>;
  }).filter(Boolean);
}

// Module-level cache to survive component re-mounts (tab switches)
const resultCache = new Map();

export default function AiInsight({ type, data, scenarioKey }) {
  const dataHash = JSON.stringify(data);
  const cacheKey = `${type}:${dataHash.slice(0, 200)}`;

  const [recommendation, setRecommendation] = useState(() => resultCache.get(cacheKey) || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [needsKey, setNeedsKey] = useState(!hasApiKey());
  const lastKey = useRef(recommendation ? cacheKey : '');

  // Restore cached result when inputs change (no fetch)
  useEffect(() => {
    if (resultCache.has(cacheKey)) {
      setRecommendation(resultCache.get(cacheKey));
    } else if (cacheKey !== lastKey.current) {
      // Inputs changed and no cache — clear stale result
      setRecommendation('');
    }
    lastKey.current = cacheKey;
  }, [cacheKey]);

  const fetchRecommendation = useCallback(async () => {
    if (!hasApiKey()) { setNeedsKey(true); return; }
    resultCache.delete(cacheKey);
    setLoading(true);
    setError('');
    setRecommendation('');
    try {
      const result = await getAiRecommendation(type, data, true);
      setRecommendation(result);
      resultCache.set(cacheKey, result);
    } catch (e) {
      if (e.message === 'NO_API_KEY' || e.message === 'INVALID_API_KEY') {
        setError('Invalid API key. Please check and re-enter.');
        setNeedsKey(true);
      } else {
        setError(e.message || 'Failed to get recommendation');
      }
    } finally {
      setLoading(false);
    }
  }, [type, cacheKey, data]);

  return (
    <div className="ai-insight-card">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 rounded-t-[0.75rem]" />

      <div className="flex items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <SparkleIcon />
          </div>
          <span className="font-semibold text-gray-900">AI Insights</span>
          <span className="text-xs text-purple-500 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
            Gemini
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!needsKey && !loading && (
          <button
            onClick={(e) => { e.stopPropagation(); fetchRecommendation(); }}
            title={recommendation ? 'Refresh insights' : 'Generate insights'}
            className="p-1.5 rounded-lg text-purple-500 hover:text-purple-700 hover:bg-purple-50
                       transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        )}
        {loading && (
          <div className="p-1.5 flex-shrink-0">
            <svg className="w-4 h-4 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-5 pb-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
          {needsKey && <ApiKeyPrompt onSubmit={() => setNeedsKey(false)} />}
          {loading && <ShimmerLines />}
          {error && !needsKey && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
              <button onClick={fetchRecommendation} className="ml-2 text-red-700 underline font-medium">
                Retry
              </button>
            </div>
          )}
          {recommendation && !loading && (
            <div className="ai-fade-in">{renderText(recommendation)}</div>
          )}
          {!recommendation && !loading && !needsKey && !error && (
            <button
              onClick={fetchRecommendation}
              className="w-full py-3 text-sm font-medium text-purple-600 bg-purple-50
                         hover:bg-purple-100 rounded-lg transition-colors
                         flex items-center justify-center gap-2"
            >
              <SparkleIcon />
              Generate Insights
            </button>
          )}
        </div>
      )}
    </div>
  );
}
