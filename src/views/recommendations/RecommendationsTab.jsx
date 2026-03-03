import React, { useState, useMemo } from 'react'
import AiInsight from '../../components/AiInsight'
import { buildOptimizeAiData } from '../../utils/buildAiData'
import RecommendationCard from './RecommendationCard'

function SparklesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function fmtK(n) {
  if (Math.abs(n) >= 1000000) return `$${(Math.abs(n) / 1000000).toFixed(1)}M`
  return `$${Math.round(Math.abs(n) / 1000)}K`
}

const DIMENSION_LABELS = {
  cpp: 'CPP Timing', oas: 'OAS Timing', withdrawalOrder: 'Withdrawal Order',
  meltdown: 'Gradual RRSP Transfer', debt: 'Debt Payoff', expenses: 'Expense Level',
  spouseCpp: 'Spouse CPP', spouseOas: 'Spouse OAS',
}

const OPTIMAL_REASONS = {
  cpp: 'Your current CPP start age maximizes lifetime benefits given your portfolio and life expectancy.',
  oas: 'Your OAS timing is optimal — deferring further would not improve after-tax income.',
  withdrawalOrder: 'Drawing accounts in your current order minimizes lifetime tax for your income profile.',
  meltdown: 'Your RRSP drawdown strategy already balances tax smoothing and long-term growth.',
  debt: 'Your current debt payoff timeline is already the most beneficial.',
  expenses: 'Your spending level is sustainable — no reduction is needed.',
  spouseCpp: 'Your spouse\'s CPP start age is already optimal.',
  spouseOas: 'Your spouse\'s OAS timing is already optimal.',
}

const CATEGORY_CONFIG = {
  plan:   { label: 'Extend Your Plan',  borderClass: 'border-l-green-400',  textClass: 'text-green-700' },
  tax:    { label: 'Tax Optimization',  borderClass: 'border-l-amber-400',  textClass: 'text-amber-700' },
  couple: { label: 'Couple Planning',   borderClass: 'border-l-indigo-400', textClass: 'text-indigo-700' },
}

const CATEGORY_ORDER = ['plan', 'tax', 'couple']

function SummaryBanner({ result }) {
  const { runCount, baselineDepletion, bestPossibleDepletion, lifeExpectancy, currentAge, recommendations } = result
  const neverDepletes = baselineDepletion === null

  if (neverDepletes) {
    const totalIncomeGained = recommendations.reduce((s, r) => s + r.impact.lifetimeIncomeGained, 0)
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-green-800 mb-1">
          ✓ Your plan outlasts you to age {lifeExpectancy}
        </p>
        <p className="text-sm text-green-700 mb-2">
          Recommendations focus on maximizing after-tax income
        </p>
        {recommendations.length > 0 && totalIncomeGained > 0 && (
          <p className="text-sm text-green-800">
            We found <strong>{recommendations.length}</strong> optimization{recommendations.length > 1 ? 's' : ''} adding up to{' '}
            <strong>+{fmtK(totalIncomeGained)}</strong> in lifetime after-tax income
          </p>
        )}
        <p className="text-xs text-green-500 mt-2">We tested {runCount} variations of your plan</p>
      </div>
    )
  }

  const yearsShort = lifeExpectancy != null && baselineDepletion != null
    ? lifeExpectancy - baselineDepletion
    : null
  const yearsGained = bestPossibleDepletion != null && baselineDepletion != null
    ? bestPossibleDepletion - baselineDepletion
    : null
  const bestIncomeGained = recommendations[0]?.impact?.lifetimeIncomeGained ?? 0
  const pct = yearsGained && baselineDepletion
    ? Math.min(100, Math.round((yearsGained / (baselineDepletion - currentAge)) * 100))
    : 0

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <p className="text-sm font-semibold text-amber-900 mb-1">
        ⚠ Your money runs out{yearsShort > 0 ? ` ${yearsShort} years` : ''} before age {lifeExpectancy}
      </p>
      <p className="text-xs text-amber-700 mb-3">
        Current plan depletes at age <strong>{baselineDepletion}</strong> · Life expectancy {lifeExpectancy}
      </p>
      {yearsGained > 0 && (
        <>
          <p className="text-xs text-amber-800 mb-2">
            Best possible with these changes: age <strong>{bestPossibleDepletion}</strong>
          </p>
          <div className="h-2 bg-amber-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-green-400 rounded-full transition-all"
              style={{ width: `${Math.max(5, pct)}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="text-green-700 font-semibold">+{yearsGained} yrs possible</span>
            {bestIncomeGained > 0 && (
              <span className="text-green-700 font-semibold">+{fmtK(bestIncomeGained)} lifetime income possible</span>
            )}
          </div>
        </>
      )}
      <p className="text-xs text-amber-500 mt-2">We tested {runCount} variations of your plan</p>
    </div>
  )
}

function UpgradeCta({ lockedRecs, onUpgrade }) {
  const count = lockedRecs.length
  const names = lockedRecs.map(r => DIMENSION_LABELS[r.dimension] || r.dimension).join(' · ')
  return (
    <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-5 text-center">
      <p className="text-sm font-semibold text-indigo-900 mb-1">
        🔒 {names} ({count} more)
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
      <ul className="space-y-3">
        {items.map(item => (
          <li key={item.dimension}>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {item.label} is already optimal
            </div>
            {OPTIMAL_REASONS[item.dimension] && (
              <p className="ml-6 text-xs text-gray-400 mt-0.5">{OPTIMAL_REASONS[item.dimension]}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function RecommendationsTab({ result, isPaid, onScenarioChange, onUpgrade, onViewDashboard, scenario, aiInsights, onSaveInsight }) {
  const [appliedIds, setAppliedIds] = useState(new Set())
  const aiData = useMemo(
    () => (result && scenario ? buildOptimizeAiData(result, scenario) : null),
    [result, scenario]
  )

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

  // Sort by category (plan → tax → couple), preserving impact order within each group
  const orderedRecs = CATEGORY_ORDER.flatMap(cat =>
    recommendations.filter(r => (r.category || 'plan') === cat)
  )
  const globalIdxMap = new Map(orderedRecs.map((rec, i) => [rec.id, i]))

  // Build sections: only include categories that have recs
  const sections = CATEGORY_ORDER
    .map(cat => ({ cat, items: recommendations.filter(r => (r.category || 'plan') === cat) }))
    .filter(({ items }) => items.length > 0)

  return (
    <div className="space-y-4">
      {/* Mobile AI Insights */}
      <div className="xl:hidden">
        {aiData && (
          <AiInsight type="optimize" data={aiData}
            savedInsight={aiInsights?.optimize}
            onSave={(text, hash) => onSaveInsight?.('optimize', text, hash)} />
        )}
      </div>

      {/* Two-column layout: content left, AI sticky right on xl+ */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-2 text-gray-700">
            <SparklesIcon />
            <h2 className="text-base font-semibold">Optimize My Plan</h2>
          </div>

          <SummaryBanner result={result} />

          {sections.map(({ cat, items }) => (
            <div key={cat} className="space-y-4">
              {/* Section header */}
              <div className={`border-l-4 pl-3 ${CATEGORY_CONFIG[cat].borderClass}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wide ${CATEGORY_CONFIG[cat].textClass}`}>
                  {CATEGORY_CONFIG[cat].label}
                </h3>
              </div>

              {items.map((rec) => {
                const globalIdx = globalIdxMap.get(rec.id)
                const isFirst = globalIdx === 0
                return (
                  <React.Fragment key={rec.id}>
                    <RecommendationCard
                      rec={rec}
                      isPaid={isPaid}
                      isFirst={isFirst}
                      onApply={() => handleApply(rec)}
                      applied={appliedIds.has(rec.id)}
                      onViewDashboard={onViewDashboard}
                    />
                    {isFirst && !isPaid && orderedRecs.length > 1 && (
                      <UpgradeCta lockedRecs={orderedRecs.slice(1)} onUpgrade={onUpgrade} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          ))}

          <AlreadyOptimalSection items={alreadyOptimal} />
        </div>

        <div className="hidden xl:block w-96 flex-shrink-0 sticky top-24">
          {aiData && (
            <AiInsight type="optimize" data={aiData}
              savedInsight={aiInsights?.optimize}
              onSave={(text, hash) => onSaveInsight?.('optimize', text, hash)} />
          )}
        </div>
      </div>
    </div>
  )
}
