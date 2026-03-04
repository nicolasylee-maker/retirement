import React, { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../../../services/adminService'
import { buildAiPrompt, getPromptTemplate } from '../../../utils/buildAiPrompt'
import {
  buildDashboardAiData,
  buildDebtAiData,
  buildEstateAiData,
  buildCompareAiData,
  buildOptimizeAiData,
} from '../../../utils/buildAiData'
import { projectScenario } from '../../../engines/projectionEngine'
import { runOptimization } from '../../../engines/optimizerEngine'

import AiTestConfigPanel from '../components/AiTestConfigPanel'
import AiTestResultPanel from '../components/AiTestResultPanel'

const SEARCH_DEBOUNCE_MS = 350

function buildContext(insightType, scenario, scenario2) {
  const proj = projectScenario(scenario)

  switch (insightType) {
    case 'dashboard':
      return buildDashboardAiData(scenario, proj)
    case 'debt':
      return buildDebtAiData(scenario, proj)
    case 'estate':
      return buildEstateAiData(scenario, proj, scenario.lifeExpectancy)
    case 'compare':
      return buildCompareAiData([scenario, scenario2])
    case 'optimize': {
      const optResult = runOptimization(scenario)
      return buildOptimizeAiData(optResult, scenario)
    }
    default:
      return {}
  }
}

export default function AiTestingSection() {
  // ─── Config ────────────────────────────────────────────────────────────────
  const [adminConfig, setAdminConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState(null)

  // ─── Insight type ──────────────────────────────────────────────────────────
  const [insightType, setInsightType] = useState('dashboard')

  // ─── User search ───────────────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const searchTimer = useRef(null)

  // ─── Scenarios ─────────────────────────────────────────────────────────────
  const [scenarios, setScenarios] = useState([])
  const [selectedScenarioId, setSelectedScenarioId] = useState('')
  const [selectedScenarioId2, setSelectedScenarioId2] = useState('')

  // ─── Provider / model ──────────────────────────────────────────────────────
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [availableModels, setAvailableModels] = useState([])
  const [modelsFetching, setModelsFetching] = useState(false)
  const [modelsError, setModelsError] = useState(null)

  // ─── Results ───────────────────────────────────────────────────────────────
  const [geminiText, setGeminiText] = useState('')
  const [rivalText, setRivalText] = useState('')
  const [resolvedPrompt, setResolvedPrompt] = useState('')
  const [rawTemplate, setRawTemplate] = useState('')
  const [geminiLoading, setGeminiLoading] = useState(false)
  const [rivalLoading, setRivalLoading] = useState(false)
  const [geminiError, setGeminiError] = useState(null)
  const [rivalError, setRivalError] = useState(null)

  // ─── Load admin config once ────────────────────────────────────────────────
  useEffect(() => {
    adminApi.getConfig()
      .then(d => { setAdminConfig(d); setConfigLoading(false) })
      .catch(e => { setConfigError(e.message); setConfigLoading(false) })
  }, [])

  // ─── User search (debounced) ───────────────────────────────────────────────
  const handleUserSearch = useCallback((q) => {
    setUserSearch(q)
    setSelectedUser(null)
    setScenarios([])
    setSelectedScenarioId('')
    setSelectedScenarioId2('')
    clearTimeout(searchTimer.current)
    if (!q.trim()) { setUsers([]); return }
    searchTimer.current = setTimeout(() => {
      setUsersLoading(true)
      adminApi.listUsers(1, 10, q)
        .then(d => { setUsers(d.users || []); setUsersLoading(false) })
        .catch(() => { setUsers([]); setUsersLoading(false) })
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  const handleSelectUser = useCallback((u) => {
    setSelectedUser(u)
    setUsers([])
    setUserSearch(u.email)
    setScenarios([])
    setSelectedScenarioId('')
    setSelectedScenarioId2('')
    adminApi.getUserScenarios(u.id)
      .then(d => { setScenarios(d.scenarios || []) })
      .catch(() => setScenarios([]))
  }, [])

  // ─── Reset second scenario when type changes away from compare ─────────────
  const handleInsightTypeChange = useCallback((t) => {
    setInsightType(t)
    if (t !== 'compare') setSelectedScenarioId2('')
  }, [])

  // ─── Reset models when provider changes ───────────────────────────────────
  const handleProviderChange = useCallback((p) => {
    setProvider(p)
    setAvailableModels([])
    setModel('')
    setModelsError(null)
  }, [])

  // ─── Fetch models ──────────────────────────────────────────────────────────
  const handleFetchModels = useCallback(async () => {
    setModelsFetching(true)
    setModelsError(null)
    try {
      const res = await adminApi.fetchAiModels(provider, apiKey || null)
      setAvailableModels(res.models || [])
    } catch (e) {
      setModelsError(e.message)
    } finally {
      setModelsFetching(false)
    }
  }, [provider, apiKey])

  // ─── Run Test ──────────────────────────────────────────────────────────────
  const handleRunTest = useCallback(async (target = 'both') => {
    if (!adminConfig) return
    const config = adminConfig.config || {}
    const geminiModel = config['gemini_model'] || 'gemini-2.0-flash'

    // Admin API returns { id, name, data, created_at } — unwrap .data but preserve name
    const rawScenario = scenarios.find(s => s.id === selectedScenarioId)
    const scenario = rawScenario ? { ...rawScenario.data, name: rawScenario.name } : null
    const rawScenario2 = insightType === 'compare'
      ? scenarios.find(s => s.id === selectedScenarioId2)
      : null
    const scenario2 = rawScenario2 ? { ...rawScenario2.data, name: rawScenario2.name } : null
    if (!scenario) return

    // Build context + resolved prompt (client-side, instant)
    let context
    try {
      context = buildContext(insightType, scenario, scenario2)
    } catch (e) {
      if (target !== 'rival') setGeminiError(`Context build failed: ${e.message}`)
      if (target !== 'gemini') setRivalError(`Context build failed: ${e.message}`)
      return
    }
    const prompt = buildAiPrompt(insightType, context, config)
    setResolvedPrompt(prompt)
    setRawTemplate(getPromptTemplate(insightType, config))

    // Reset only the columns we're running
    if (target !== 'rival') { setGeminiText(''); setGeminiError(null); setGeminiLoading(true) }
    if (target !== 'gemini') { setRivalText(''); setRivalError(null); setRivalLoading(true) }

    // Fire the selected calls
    const calls = []
    if (target !== 'rival') calls.push(adminApi.testAi('gemini', geminiModel, null, prompt))
    if (target !== 'gemini') calls.push(adminApi.testAi(provider, model, apiKey || null, prompt))

    const results = await Promise.allSettled(calls)
    let ri = 0

    if (target !== 'rival') {
      setGeminiLoading(false)
      const r = results[ri++]
      if (r.status === 'fulfilled') setGeminiText(r.value.text || '')
      else setGeminiError(r.reason?.message || 'Unknown error')
    }

    if (target !== 'gemini') {
      setRivalLoading(false)
      const r = results[ri++]
      if (r.status === 'fulfilled') setRivalText(r.value.text || '')
      else setRivalError(r.reason?.message || 'Unknown error')
    }
  }, [adminConfig, scenarios, selectedScenarioId, selectedScenarioId2, insightType, provider, model, apiKey])

  if (configLoading) return <p className="text-sm text-gray-400">Loading config...</p>
  if (configError) return <p className="text-sm text-red-600">Config error: {configError}</p>

  const geminiModel = adminConfig?.config?.['gemini_model'] || 'gemini-2.0-flash'
  const running = geminiLoading || rivalLoading

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">AI Testing</h2>

      <AiTestConfigPanel
        insightType={insightType}
        onInsightTypeChange={handleInsightTypeChange}
        userSearch={userSearch}
        onUserSearch={handleUserSearch}
        users={users}
        usersLoading={usersLoading}
        selectedUser={selectedUser}
        onSelectUser={handleSelectUser}
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={setSelectedScenarioId}
        selectedScenarioId2={selectedScenarioId2}
        onSelectScenario2={setSelectedScenarioId2}
        provider={provider}
        onProviderChange={handleProviderChange}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        model={model}
        onModelChange={setModel}
        availableModels={availableModels}
        modelsFetching={modelsFetching}
        modelsError={modelsError}
        onFetchModels={handleFetchModels}
        onRunTest={handleRunTest}
        running={running}
      />

      <AiTestResultPanel
        geminiModel={geminiModel}
        rivalProvider={provider}
        rivalModel={model}
        geminiText={geminiText}
        rivalText={rivalText}
        resolvedPrompt={resolvedPrompt}
        rawTemplate={rawTemplate}
        geminiLoading={geminiLoading}
        rivalLoading={rivalLoading}
        geminiError={geminiError}
        rivalError={rivalError}
      />
    </div>
  )
}
