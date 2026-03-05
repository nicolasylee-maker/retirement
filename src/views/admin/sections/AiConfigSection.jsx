import React, { useEffect, useState } from 'react'
import { adminApi } from '../../../services/adminService'

const PROMPT_FIELDS = [
  { key: 'prompt_base', label: 'Base System Prompt', variables: '(no variables — this is the base instructions)' },
  { key: 'prompt_dashboard', label: 'Dashboard Prompt', variables: '{currentAge}, {retirementAge}, {lifeExpectancy}, {inflationRatePct}, {monthlyExpenses}, {expReductionPct}, {expensesAtRetirement}, {expensesMonthlyToday}, {portfolioAtRetirement}, {portfolioAtRetirementToday}, {netWorthAtRetirement}, {annualIncome}, {annualTax}, {annualShortfall}, {shortfallMonthlyToday}, {sustainableMonthly}, {sustainableMonthlyToday}, {portfolioAtEnd}, {portfolioAtEndToday}, {rrspBalance}, {tfsaBalance}, {nonRegBalance}, {cppMonthly}, {cppStartAge}, {cppAtRetirement}, {cppMonthlyToday}, {oasMonthly}, {oasStartAge}, {oasAtRetirement}, {oasMonthlyToday}, {pensionLine}, {depletionAge}, {portfolioDepleted}, {postDepletionIncome}, {postDepletionIncomeToday}, {postDepletionExpenses}, {postDepletionExpensesToday}, {yearsToRetirement}, {workingYearsWithWithdrawals}, {tfsaDepletedWhileWorking}, {primaryOasAtRetirement}, {primaryOasClawbackAmount}, {spouseOasAtRetirement}, {spouseOasClawbackAmount}, {primaryIncomeAtRetirement}, {spouseIncomeAtRetirement}, {isCouple}, {spouseAge}, {spouseRetirementAge}, {spouseEmploymentIncome}, {spouseRrspBalance}, {spouseTfsaBalance}, {spouseCppMonthly}, {spouseCppStartAge}, {spouseOasMonthly}, {spouseOasStartAge}, {spousePensionIncome}' },
  { key: 'prompt_compare', label: 'Compare Prompt', variables: '{inflationRatePct}, {scenarioLines}, {diffLines}, {phaseLines}, {monthlyLines} (all pre-built multi-line strings)' },
  { key: 'prompt_estate', label: 'Estate Prompt', variables: '{ageAtDeath}, {inflationRatePct}, {yearsToDeath}, {grossEstate}, {grossEstateToday}, {totalTax}, {deemedIncomeTax}, {capitalGainsTax}, {probateFees}, {deemedIncomeTaxToday}, {capitalGainsTaxToday}, {probateFeesToday}, {netToHeirs}, {netToHeirsToday}, {hasWill}, {primaryBeneficiary}, {rrspBalance}, {rrspBalanceToday}, {spouseRollover}, {spouseRrspBalance}, {spouseTfsaBalance}' },
  { key: 'prompt_debt', label: 'Debt Prompt', variables: '{totalDebt}, {totalInterest}, {consumerDebt}, {consumerRatePct}, {mortgageBalance}, {mortgageRatePct}, {currentAge}, {retirementAge}, {debtFreeAge}, {monthlyPayments}' },
  { key: 'prompt_optimize', label: 'Optimize Prompt', variables: '{planStatus}, {currentAge}, {lifeExpectancy}, {monthlyExpenses}, {recommendationCount}, {totalMonthlyGain}, {recommendationLines} (pre-built numbered list), {alreadyOptimalLines} (pre-built comma list)' },
]

export default function AiConfigSection() {
  const [config, setConfig] = useState({})
  const [dirty, setDirty] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    adminApi.getConfig()
      .then(d => { setConfig(d.config || {}); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setDirty(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (Object.keys(dirty).length === 0) return
    setSaving(true)
    try {
      await adminApi.updateConfig(dirty)
      setDirty({})
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    } catch (e) {
      alert(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">AI Config</h2>
        <div className="flex items-center gap-3">
          {savedMsg && <span className="text-sm text-green-600 font-medium">Saved!</span>}
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(dirty).length === 0}
            className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Model + generation settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700">Model Settings</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Gemini Model</label>
          <input
            type="text"
            list="gemini-models"
            value={config['gemini_model'] ?? ''}
            onChange={(e) => handleChange('gemini_model', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full max-w-xs"
          />
          <datalist id="gemini-models">
            <option value="gemini-3-flash-preview" />
            <option value="gemini-2.0-flash" />
            <option value="gemini-1.5-pro" />
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Temperature: <span className="text-purple-700 font-semibold">{config['temperature'] ?? '0.7'}</span>
          </label>
          <input
            type="range" min="0" max="2" step="0.05"
            value={config['temperature'] ?? '0.7'}
            onChange={(e) => handleChange('temperature', e.target.value)}
            className="w-full max-w-xs accent-purple-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Output Tokens</label>
          <input
            type="number" min="256" max="8192" step="256"
            value={config['max_output_tokens'] ?? '4096'}
            onChange={(e) => handleChange('max_output_tokens', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-32"
          />
        </div>
      </div>

      {/* Prompt editors */}
      <div className="space-y-4">
        {PROMPT_FIELDS.map(({ key, label, variables }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
              {Object.prototype.hasOwnProperty.call(dirty, key) && (
                <span className="text-xs text-amber-600 font-medium">Unsaved</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-2">Variables: {variables}</p>
            <textarea
              value={config[key] ?? ''}
              onChange={(e) => handleChange(key, e.target.value)}
              rows={key === 'prompt_base' ? 12 : 8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
