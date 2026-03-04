import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getAiRecommendation, QuotaExceededError } from '../services/geminiService'
import { useSubscription } from '../contexts/SubscriptionContext'
import { renderMarkdownText } from '../utils/renderMarkdownText'
import UpgradePrompt from './UpgradePrompt'

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
  )
}

function ShimmerLines() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 rounded w-3/4 shimmer-line" />
      <div className="h-4 rounded w-full shimmer-line" />
      <div className="h-4 rounded w-5/6 shimmer-line" />
      <div className="h-4 rounded w-2/3 shimmer-line" />
    </div>
  )
}

/** Deterministic 32-bit polynomial hash of an object, base-36 encoded */
export function computeHash(data) {
  const str = JSON.stringify(data)
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/** Format a relative time string from an ISO timestamp */
function relativeTime(isoString) {
  if (!isoString) return null
  const diff = Date.now() - new Date(isoString).getTime()
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/**
 * AiInsight card.
 *
 * Props:
 *   type        – 'dashboard' | 'debt' | 'compare' | 'estate'
 *   data        – current aiData object (used for hash + API call)
 *   savedInsight – { text, hash, generatedAt? } | null  — persisted insight from scenario
 *   onSave      – (text, hash) => void    — called after a successful fetch
 */
export default function AiInsight({ type, data, savedInsight, onSave }) {
  const { isPaid } = useSubscription()
  const dataHash = computeHash(data)

  // Detect auto-generation loading marker from App.jsx
  const autoGenLoading = savedInsight?._loading === true

  const isStale = !autoGenLoading && savedInsight != null && savedInsight.hash !== dataHash
  const initialText = savedInsight?.text || ''

  const [recommendation, setRecommendation] = useState(initialText)
  const [stale, setStale] = useState(isStale)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quotaInfo, setQuotaInfo] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Sync when savedInsight or data changes (tab switch, WhatIf change, estate slider)
  useEffect(() => {
    if (savedInsight?._loading) return // auto-gen in-flight, don't reset state
    if (savedInsight == null) {
      setRecommendation('')
      setStale(false)
    } else if (savedInsight.hash === dataHash) {
      setRecommendation(savedInsight.text)
      setStale(false)
    } else {
      // Keep old text visible; show stale badge
      setRecommendation(savedInsight.text)
      setStale(true)
    }
  }, [dataHash, savedInsight]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecommendation = useCallback(async () => {
    setLoading(true)
    setError('')
    setQuotaInfo(null)
    setStale(false)
    try {
      const result = await getAiRecommendation(type, data, true)
      setRecommendation(result)
      onSave?.(result, dataHash)
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setQuotaInfo({ used: e.used, limit: e.limit, resetAt: e.resetAt })
      } else if (e.message !== 'subscription_required') {
        setError(e.message || 'Failed to get recommendation')
      }
    } finally {
      setLoading(false)
    }
  }, [type, data, dataHash, onSave])

  const handleGenerate = isPaid ? fetchRecommendation : () => setUpgradeOpen(true)

  return (
    <>
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
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!(loading || autoGenLoading) && !quotaInfo && (
          <button
            onClick={(e) => { e.stopPropagation(); handleGenerate() }}
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
        {(loading || autoGenLoading) && (
          <div className="p-1.5 flex-shrink-0">
            <svg className="w-4 h-4 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {!collapsed && (<>
        <div className="px-5 pb-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
          {(loading || autoGenLoading) && <ShimmerLines />}

          {stale && !(loading || autoGenLoading) && (
            <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2
                            bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <div>
                <span>Inputs have changed</span>
                {savedInsight?.generatedAt && (
                  <span className="block text-xs text-gray-400 mt-0.5">
                    Generated {relativeTime(savedInsight.generatedAt)}
                  </span>
                )}
              </div>
              <button
                onClick={handleGenerate}
                className="font-semibold text-amber-900 underline underline-offset-2
                           hover:text-amber-700 whitespace-nowrap"
              >
                Regenerate
              </button>
            </div>
          )}

          {quotaInfo && (
            <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              You've used all {quotaInfo.limit} AI insights this month.
              {quotaInfo.resetAt && (
                <span> Resets {new Date(quotaInfo.resetAt + 'T00:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}.</span>
              )}
            </div>
          )}
          {error && !quotaInfo && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
              <button onClick={fetchRecommendation} className="ml-2 text-red-700 underline font-medium">Retry</button>
            </div>
          )}
          {recommendation && !(loading || autoGenLoading) && (
            <div className="ai-fade-in">
              {renderMarkdownText(recommendation)}
              {!stale && savedInsight?.generatedAt && (
                <p className="flex items-center gap-1 mt-3 text-xs text-green-600">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Up to date &middot; Generated {relativeTime(savedInsight.generatedAt)}
                </p>
              )}
            </div>
          )}
          {!recommendation && !(loading || autoGenLoading) && !quotaInfo && !error && (
            <button
              onClick={handleGenerate}
              className="w-full py-3 text-sm font-medium text-purple-600 bg-purple-50
                         hover:bg-purple-100 rounded-lg transition-colors
                         flex items-center justify-center gap-2"
            >
              <SparkleIcon />
              Generate Insights
            </button>
          )}
        </div>
        {recommendation && !(loading || autoGenLoading) && (
          <p className="px-5 pt-2 pb-3 mt-0 text-[9px] italic text-gray-400 border-t border-gray-200">
            AI-generated insights for educational purposes only. Not financial advice. Consult a qualified advisor before making financial decisions.
          </p>
        )}
      </>)}
    </div>

    {upgradeOpen && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget) setUpgradeOpen(false) }}
      >
        <div className="relative mx-4">
          <button
            type="button"
            onClick={() => setUpgradeOpen(false)}
            className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
          <UpgradePrompt variant="full" featureName="AI Insights" modal />
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
