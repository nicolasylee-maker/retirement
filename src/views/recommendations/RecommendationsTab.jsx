import React, { useState } from 'react'
import RecommendationCard from './RecommendationCard'

function SparklesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function SummaryBanner({ result }) {
  const { runCount, baselineDepletion, bestPossibleDepletion } = result
  const neverDepletes = baselineDepletion === null

  if (neverDepletes) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-green-800 mb-1">Your money outlasts you in the baseline scenario.</p>
        <p className="text-sm text-green-700">Recommendations focus on maximizing after-tax income and estate value.</p>
        <p className="text-xs text-green-500 mt-2">We tested {runCount} variations of your plan.</p>
      </div>
    )
  }

  const yearsGained = bestPossibleDepletion !== null && baselineDepletion !== null
    ? bestPossibleDepletion - baselineDepletion
    : null

  const pct = yearsGained && baselineDepletion
    ? Math.min(100, Math.round((yearsGained / (baselineDepletion - 60)) * 100))
    : 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs text-gray-400 mb-3">We tested {runCount} variations of your plan</p>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-600">Current plan runs out at <strong className="text-gray-900">age {baselineDepletion}</strong></span>
        {bestPossibleDepletion && yearsGained > 0 && (
          <span className="text-green-700 font-semibold">+{yearsGained} yrs possible</span>
        )}
      </div>
      {yearsGained > 0 && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-green-400 rounded-full transition-all"
            style={{ width: `${Math.max(5, pct)}%` }}
          />
        </div>
      )}
      {bestPossibleDepletion && yearsGained > 0 && (
        <p className="text-xs text-gray-400 mt-2">Best possible: runs out at age {bestPossibleDepletion}</p>
      )}
    </div>
  )
}

function UpgradeCta({ count, onUpgrade }) {
  return (
    <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-5 text-center">
      <p className="text-sm font-semibold text-indigo-900 mb-1">
        🔒 {count} more recommendation{count > 1 ? 's' : ''} found
      </p>
      <p className="text-xs text-indigo-700 mb-4">
        Unlock all recommendations, scenario comparison, estate planning, and detailed reporting.
      </p>
      <button
        onClick={onUpgrade}
        className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
      >
        Upgrade to Premium — $5/mo
      </button>
      <p className="text-xs text-indigo-400 mt-2">7-day free trial · Cancel anytime</p>
    </div>
  )
}

function AlreadyOptimalSection({ items }) {
  if (!items.length) return null
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Things you're already doing right</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.dimension} className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {item.label} is already optimal
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function RecommendationsTab({ result, isPaid, onScenarioChange, onUpgrade }) {
  const [appliedIds, setAppliedIds] = useState(new Set())

  if (!result) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading recommendations…
      </div>
    )
  }

  const { recommendations, alreadyOptimal } = result

  const handleApply = (rec) => {
    setAppliedIds(prev => new Set([...prev, rec.id]))
    onScenarioChange(rec.changes)
  }

  if (!recommendations.length && !alreadyOptimal.length) {
    return (
      <div className="space-y-4">
        <SummaryBanner result={result} />
        <div className="text-center py-10 text-gray-500 text-sm">
          We tested {result.runCount} variations — your current settings are the best combination.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700">
        <SparklesIcon />
        <h2 className="text-base font-semibold">Optimize My Plan</h2>
      </div>

      <SummaryBanner result={result} />

      {/* Recommendation cards */}
      {recommendations.map((rec, i) => (
        <React.Fragment key={rec.id}>
          <RecommendationCard
            rec={rec}
            isPaid={isPaid}
            isFirst={i === 0}
            onApply={() => handleApply(rec)}
            applied={appliedIds.has(rec.id)}
          />
          {/* Upgrade CTA after card 1 for free users */}
          {i === 0 && !isPaid && recommendations.length > 1 && (
            <UpgradeCta count={recommendations.length - 1} onUpgrade={onUpgrade} />
          )}
        </React.Fragment>
      ))}

      <AlreadyOptimalSection items={alreadyOptimal} />
    </div>
  )
}
