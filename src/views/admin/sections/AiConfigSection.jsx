import React, { useEffect, useState } from 'react'
import { adminApi } from '../../../services/adminService'

const PROVIDERS = ['openrouter', 'gemini', 'openai', 'anthropic', 'xai', 'kimi']

const MODEL_SUGGESTIONS = {
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct',
    'qwen/qwen-2.5-72b-instruct',
    'google/gemini-2.0-flash-001',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o-mini',
  ],
  gemini: ['gemini-2.5-pro-preview-05-06', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  xai: ['grok-3', 'grok-3-mini'],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
}

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

  // Per-provider key management
  const [keyStatus, setKeyStatus] = useState({}) // { openrouter: true/false, ... }
  const [keyInput, setKeyInput] = useState('')
  const [keySaving, setKeySaving] = useState(false)
  const [keyMsg, setKeyMsg] = useState(null) // { type: 'ok'|'err', text }

  // Fetched model list for current provider
  const [fetchedModels, setFetchedModels] = useState([]) // string[]
  const [modelsFetching, setModelsFetching] = useState(false)
  const [modelsMsg, setModelsMsg] = useState(null) // { type: 'ok'|'err', text }

  useEffect(() => {
    adminApi.getConfig()
      .then(d => { setConfig(d.config || {}); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
    adminApi.getProviderKeyStatus()
      .then(d => setKeyStatus(d.status || {}))
      .catch(() => {}) // non-fatal
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

  const handleFetchModels = async () => {
    setModelsFetching(true)
    setModelsMsg(null)
    try {
      const { models } = await adminApi.fetchProviderModels(selectedProvider)
      setFetchedModels(models || [])
      setModelsMsg({ type: 'ok', text: `${(models || []).length} models loaded` })
      setTimeout(() => setModelsMsg(null), 3000)
    } catch (e) {
      setModelsMsg({ type: 'err', text: e.message })
    } finally {
      setModelsFetching(false)
    }
  }

  const handleSaveKey = async () => {
    const provider = config['ai_provider'] ?? 'openrouter'
    if (!keyInput.trim()) return
    setKeySaving(true)
    setKeyMsg(null)
    try {
      await adminApi.setProviderKey(provider, keyInput.trim())
      setKeyStatus(prev => ({ ...prev, [provider]: true }))
      setKeyInput('')
      setKeyMsg({ type: 'ok', text: 'Key saved' })
      setTimeout(() => setKeyMsg(null), 3000)
    } catch (e) {
      setKeyMsg({ type: 'err', text: e.message })
    } finally {
      setKeySaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const selectedProvider = config['ai_provider'] ?? 'openrouter'
  const isGemini = selectedProvider === 'gemini'
  const providerHasKey = isGemini ? true : !!keyStatus[selectedProvider]

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

      {/* AI Provider section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700">AI Provider</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => { handleChange('ai_provider', e.target.value); setKeyMsg(null); setFetchedModels([]); setModelsMsg(null) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full"
            >
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Model</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                list="ai-models"
                value={config['ai_model'] ?? ''}
                onChange={(e) => handleChange('ai_model', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 flex-1"
                placeholder="model name"
              />
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={modelsFetching}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors whitespace-nowrap font-medium"
              >
                {modelsFetching ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
            <datalist id="ai-models">
              {(fetchedModels.length ? fetchedModels : MODEL_SUGGESTIONS[selectedProvider] || []).map(m => <option key={m} value={m} />)}
            </datalist>
            {modelsMsg && (
              <p className={`text-xs mt-1 ${modelsMsg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{modelsMsg.text}</p>
            )}
          </div>
        </div>

        {/* API Key management (not shown for gemini — uses server env var) */}
        {!isGemini && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-gray-600">API Key for {selectedProvider}:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${providerHasKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {providerHasKey ? 'Key set' : 'Not configured'}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={`${selectedProvider} API key`}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 flex-1 max-w-xs font-mono"
              />
              <button
                onClick={handleSaveKey}
                disabled={keySaving || !keyInput.trim()}
                className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors font-medium whitespace-nowrap"
              >
                {keySaving ? 'Saving...' : 'Save Key'}
              </button>
              {keyMsg && (
                <span className={`text-xs font-medium ${keyMsg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                  {keyMsg.text}
                </span>
              )}
            </div>
          </div>
        )}
        {isGemini && (
          <p className="text-xs text-gray-400">Gemini uses the server-side <code className="bg-gray-100 px-1 rounded">GEMINI_API_KEY</code> environment variable — no vault key needed.</p>
        )}
      </div>

      {/* Generation settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700">Generation Settings</h3>

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

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Gemini Fallback Model</label>
          <input
            type="text"
            list="gemini-models"
            value={config['gemini_model'] ?? ''}
            onChange={(e) => handleChange('gemini_model', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full max-w-xs"
            placeholder="gemini-2.0-flash"
          />
          <datalist id="gemini-models">
            {MODEL_SUGGESTIONS.gemini.map(m => <option key={m} value={m} />)}
          </datalist>
          <p className="text-xs text-gray-400 mt-1">Used as fallback if the primary provider fails.</p>
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
