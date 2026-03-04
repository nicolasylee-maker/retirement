import React from 'react'

const INSIGHT_TYPES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'debt', label: 'Debt' },
  { key: 'estate', label: 'Estate' },
  { key: 'compare', label: 'Compare' },
  { key: 'optimize', label: 'Optimize' },
]

const PROVIDERS = [
  { key: 'openai', label: 'OpenAI' },
  { key: 'anthropic', label: 'Anthropic' },
  { key: 'openrouter', label: 'OpenRouter' },
  { key: 'xai', label: 'xAI' },
  { key: 'kimi', label: 'Kimi' },
]

export default function AiTestConfigPanel({
  insightType, onInsightTypeChange,
  userSearch, onUserSearch,
  users, usersLoading,
  selectedUser, onSelectUser,
  scenarios,
  selectedScenarioId, onSelectScenario,
  selectedScenarioId2, onSelectScenario2,
  provider, onProviderChange,
  apiKey, onApiKeyChange,
  model, onModelChange,
  availableModels, modelsFetching, modelsError,
  onFetchModels,
  onRunTest,
  running,
}) {
  const hasScenario = !!selectedScenarioId
  const needsSecondScenario = insightType === 'compare'
  const hasSecondScenario = !!selectedScenarioId2
  const canRun = selectedUser &&
    hasScenario &&
    model.trim() &&
    (!needsSecondScenario || hasSecondScenario)

  const compareScenario2Options = scenarios.filter(s => s.id !== selectedScenarioId)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-700">Test Configuration</h3>

      {/* Insight type selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Insight Type</label>
        <div className="flex gap-1.5 flex-wrap">
          {INSIGHT_TYPES.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => onInsightTypeChange(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                insightType === t.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* User search */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">User (search by email)</label>
        <input
          type="text"
          value={userSearch}
          onChange={e => onUserSearch(e.target.value)}
          placeholder="Enter email to search..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        {usersLoading && (
          <p className="text-xs text-gray-400 mt-1">Searching...</p>
        )}
        {!usersLoading && users.length > 0 && (
          <ul className="mt-1 border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
            {users.map(u => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onSelectUser(u)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    selectedUser?.id === u.id
                      ? 'bg-purple-50 text-purple-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {u.email}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedUser && (
          <p className="text-xs text-purple-600 mt-1 font-medium">
            Selected: {selectedUser.email}
          </p>
        )}
      </div>

      {/* Scenario picker */}
      {selectedUser && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Scenario</label>
          {scenarios.length === 0 ? (
            <p className="text-xs text-gray-400">No scenarios found for this user</p>
          ) : (
            <select
              value={selectedScenarioId}
              onChange={e => onSelectScenario(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full"
            >
              <option value="">Select a scenario...</option>
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>{s.name || 'Unnamed'}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Second scenario picker (compare only) */}
      {selectedUser && needsSecondScenario && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Second Scenario (Compare)</label>
          {compareScenario2Options.length === 0 ? (
            <p className="text-xs text-amber-600">Need at least 2 scenarios to run Compare</p>
          ) : (
            <select
              value={selectedScenarioId2}
              onChange={e => onSelectScenario2(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full"
            >
              <option value="">Select second scenario...</option>
              {compareScenario2Options.map(s => (
                <option key={s.id} value={s.id}>{s.name || 'Unnamed'}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Provider + API key */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Rival Provider</label>
          <select
            value={provider}
            onChange={e => onProviderChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full"
          >
            {PROVIDERS.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => onApiKeyChange(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full"
          />
        </div>
      </div>

      {/* Model fetch + input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Model</label>
        <div className="flex gap-2">
          <input
            type="text"
            list="ai-test-models"
            value={model}
            onChange={e => onModelChange(e.target.value)}
            placeholder="e.g. gpt-4o or type model name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <datalist id="ai-test-models">
            {availableModels.map(m => <option key={m} value={m} />)}
          </datalist>
          <button
            type="button"
            onClick={onFetchModels}
            disabled={modelsFetching || !apiKey.trim()}
            className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {modelsFetching ? 'Fetching...' : 'Fetch Models'}
          </button>
        </div>
        {modelsError && (
          <p className="text-xs text-red-500 mt-1">{modelsError}</p>
        )}
      </div>

      {/* Run button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onRunTest}
          disabled={!canRun || running}
          title={
            !selectedUser ? 'Select a user first' :
            !hasScenario ? 'Select a scenario' :
            needsSecondScenario && !hasSecondScenario ? 'Select 2 scenarios to compare' :
            !model.trim() ? 'Enter a model name' : ''
          }
          className="px-5 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors"
        >
          {running ? 'Running...' : 'Run Test'}
        </button>
        {needsSecondScenario && !hasSecondScenario && (
          <span className="text-xs text-amber-600">Select 2 scenarios to compare</span>
        )}
      </div>
    </div>
  )
}
