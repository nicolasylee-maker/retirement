import React, { useState } from 'react'

const BADGE_STYLES = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  blue:  'bg-blue-100 text-blue-700',
}

function fmtIncome(n) {
  if (Math.abs(n) >= 1000000) return `$${(Math.abs(n) / 1000000).toFixed(1)}M`
  return `$${Math.round(Math.abs(n) / 1000)}K`
}

function fmt(n) {
  return Math.abs(n) >= 1000
    ? `$${(Math.abs(n) / 1000).toFixed(0)}K`
    : `$${Math.abs(n)}`
}

function ImpactPill({ value, label, color }) {
  if (!value) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      +{typeof value === 'number' && value < 1000 ? value : fmt(value)} {label}
    </span>
  )
}

const CHANGE_LABELS = {
  cppStartAge: 'CPP start age',
  oasStartAge: 'OAS start age',
  spouseCppStartAge: 'Spouse CPP start age',
  spouseOasStartAge: 'Spouse OAS start age',
  withdrawalOrder: 'Withdrawal order',
  rrspMeltdownEnabled: 'Gradual RRSP transfer',
  rrspMeltdownAnnual: 'Transfer amount',
  rrspMeltdownTargetAge: 'Transfer end age',
  consumerDebtPayoffAge: 'Debt-free age',
  expenseReductionAtRetirement: 'Spending reduction',
}

function formatChanges(changes) {
  if (changes.rrspMeltdownEnabled !== undefined) {
    if (changes.rrspMeltdownEnabled) {
      const amt = changes.rrspMeltdownAnnual
      const endAge = changes.rrspMeltdownTargetAge
      return amt && endAge ? `Gradual RRSP transfer → $${Math.round(amt / 1000)}K/yr until ${endAge}` : 'Gradual RRSP transfer → Enabled'
    }
    return 'Gradual RRSP transfer → Disabled'
  }
  if (changes.withdrawalOrder) {
    return `Withdrawal order → ${changes.withdrawalOrder.slice(0, 3).join(' → ')}`
  }
  if (changes.expenseReductionAtRetirement !== undefined) {
    return `Spending reduction → ${Math.round(changes.expenseReductionAtRetirement * 100)}%`
  }
  const entry = Object.entries(changes).find(([k]) => CHANGE_LABELS[k])
  if (!entry) return null
  const [key, val] = entry
  let displayVal = String(val)
  if (key === 'rrspMeltdownAnnual') displayVal = `$${Math.round(val / 1000)}K/yr`
  else if (key === 'rrspMeltdownTargetAge') displayVal = `until ${val}`
  return `${CHANGE_LABELS[key]} → ${displayVal}`
}

function ChangesLine({ changes }) {
  const text = formatChanges(changes)
  if (!text) return null
  return (
    <p className="text-xs text-gray-400 mb-2">
      What changes: <span className="font-medium text-gray-500">{text}</span>
    </p>
  )
}

function BeforeAfter({ before, after }) {
  const monthlyDelta = (after.monthlyAvgIncome || 0) - (before.monthlyAvgIncome || 0)

  return (
    <div className="flex gap-2 text-xs mt-3">
      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
        <p className="text-gray-400 font-medium mb-0.5">Before</p>
        <p className="text-gray-700 font-semibold">{before.label}</p>
        {before.depletionAge !== null && before.depletionAge && (
          <p className="text-gray-500 mt-0.5">Money runs out at {before.depletionAge}</p>
        )}
        {before.monthlyAvgIncome > 0 && (
          <p className="text-gray-400 mt-0.5">${before.monthlyAvgIncome.toLocaleString()}/mo avg</p>
        )}
      </div>
      <div className="flex items-center text-gray-300 self-center">→</div>
      <div className="flex-1 bg-green-50 rounded-lg px-3 py-2">
        <p className="text-green-500 font-medium mb-0.5">After</p>
        <p className="text-gray-700 font-semibold">{after.label}</p>
        {after.depletionAge !== null && after.depletionAge && (
          <p className="text-green-600 mt-0.5">Money lasts to age {after.depletionAge}</p>
        )}
        {after.depletionAge === null && before.depletionAge !== null && (
          <p className="text-green-600 mt-0.5">Money lasts your whole life ✓</p>
        )}
        {after.monthlyAvgIncome > 0 && (
          <p className="text-green-600 mt-0.5">
            ${after.monthlyAvgIncome.toLocaleString()}/mo avg{monthlyDelta > 0 ? ` ↑$${monthlyDelta.toLocaleString()}/mo` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default function RecommendationCard({ rec, isPaid, isFirst, onApply, applied, onViewDashboard }) {
  const [confirming, setConfirming] = useState(false)
  const blurred = !isPaid && !isFirst

  const handleApplyClick = () => {
    if (applied) return
    setConfirming(true)
  }

  const handleConfirm = () => {
    setConfirming(false)
    onApply(rec.changes)
  }

  return (
    <div className={`relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${blurred ? 'blur-sm pointer-events-none select-none opacity-60' : ''}`}>
      {/* colour accent strip */}
      <div className={`h-1 w-full ${rec.badgeColor === 'green' ? 'bg-green-400' : rec.badgeColor === 'amber' ? 'bg-amber-400' : 'bg-blue-400'}`} />

      <div className="p-5">
        {/* badge + title */}
        <div className="flex items-start gap-3 mb-3">
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_STYLES[rec.badgeColor] || BADGE_STYLES.green}`}>
            {rec.badge}
          </span>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{rec.title}</h3>
        </div>

        {/* impact pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {rec.impact.depletionYearsGained > 0 && (
            <ImpactPill value={rec.impact.depletionYearsGained} label="yrs longer" color="bg-green-100 text-green-800" />
          )}
          {rec.impact.lifetimeIncomeGained > 0 && (
            <ImpactPill value={rec.impact.lifetimeIncomeGained} label="lifetime income" color="bg-amber-100 text-amber-800" />
          )}
          {rec.impact.lifetimeTaxSaved > 0 && (
            <ImpactPill value={rec.impact.lifetimeTaxSaved} label="tax saved" color="bg-violet-100 text-violet-800" />
          )}
          {rec.impact.monthlyImpact > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-800">
              +${rec.impact.monthlyImpact.toLocaleString()}/mo
            </span>
          )}
        </div>

        {/* reasoning callout */}
        <div className="border-l-2 border-amber-300 pl-3 text-xs text-gray-600 mb-3">
          {rec.reasoning}
        </div>

        {/* what changes */}
        <ChangesLine changes={rec.changes} />

        {/* description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-1">{rec.description}</p>

        {/* before / after */}
        <BeforeAfter before={rec.before} after={rec.after} />

        {/* apply button */}
        <div className="mt-4">
          {applied ? (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 font-medium text-green-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Applied
              </div>
              {onViewDashboard && (
                <button
                  onClick={onViewDashboard}
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                >
                  View updated dashboard →
                </button>
              )}
            </div>
          ) : confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Apply this change to your plan?</span>
              <button onClick={handleConfirm}
                className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirming(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleApplyClick}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
            >
              Apply this to my plan →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
