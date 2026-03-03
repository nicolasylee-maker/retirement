import React, { useState, useEffect } from 'react'
import { useTaxData } from '../../../contexts/TaxDataContext'
import { adminApi } from '../../../services/adminService'

const PROVINCE_OPTIONS = ['federal', 'ON', 'BC', 'AB', 'SK', 'MB', 'NB', 'NS', 'NL', 'PE']
const CURRENT_YEAR = new Date().getFullYear()

// ---------------------------------------------------------------------------
// Pure helpers — exported for unit tests
// ---------------------------------------------------------------------------

/**
 * Parse a raw JSON string, validating it is a non-null object.
 * Returns { data, error } where error is a string message or null.
 */
export function parseTaxJson(raw) {
  if (!raw || !raw.trim()) return { data: null, error: 'JSON cannot be empty' }
  try {
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { data: null, error: 'JSON must be a non-null object (not an array or primitive)' }
    }
    return { data: parsed, error: null }
  } catch (e) {
    return { data: null, error: e.message }
  }
}

/**
 * Run a gross-bracket smoke test on the provided federal + province data.
 * Throws if data is structurally invalid.
 * Does not use module-level tax tables — pure calculation from supplied data.
 *
 * @param {object} federalData
 * @param {object} provinceData
 * @param {number} [income=100000]
 * @returns {{ federalTax: number, provincialTax: number }}
 */
export function runTaxSmokeTest(federalData, provinceData, income = 100000) {
  if (!federalData) throw new Error('federalData is required')
  if (!federalData.brackets?.length) throw new Error('federalData.brackets must be a non-empty array')
  if (!provinceData?.brackets) throw new Error('provinceData.brackets is required')

  function normalizeBrackets(brackets) {
    return brackets.map(b => ({ ...b, max: b.max ?? Infinity }))
  }

  function applyBrackets(inc, brackets) {
    if (inc <= 0) return 0
    let tax = 0
    for (const { min, max, rate } of brackets) {
      if (inc <= min) break
      tax += (Math.min(inc, max) - min) * rate
    }
    return tax
  }

  const fedBrackets = normalizeBrackets(federalData.brackets)
  const provBrackets = normalizeBrackets(provinceData.brackets)

  return {
    federalTax:   applyBrackets(income, fedBrackets),
    provincialTax: applyBrackets(income, provBrackets),
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TaxDataEditor() {
  const { bundledProvinces, bundledFederal } = useTaxData()
  const [province, setProvince] = useState('ON')
  const [taxYear, setTaxYear] = useState(CURRENT_YEAR)
  const [rawJson, setRawJson] = useState('')
  const [parseError, setParseError] = useState(null)
  const [smokeResult, setSmokeResult] = useState(null)
  const [smokeError, setSmokeError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [seeding, setSeeding] = useState(false)

  // Load current data when province or year changes
  useEffect(() => {
    const source = province === 'federal' ? bundledFederal : bundledProvinces?.[province]
    setRawJson(source ? JSON.stringify(source, null, 2) : '')
    setParseError(null)
    setSmokeResult(null)
    setSmokeError(null)
    setSaveMsg(null)
  }, [province, taxYear, bundledProvinces, bundledFederal])

  function handleChange(e) {
    const val = e.target.value
    setRawJson(val)
    setSaveMsg(null)
    setSmokeResult(null)
    setSmokeError(null)
    const { error } = parseTaxJson(val)
    setParseError(error)
  }

  async function handleSave() {
    const { data, error } = parseTaxJson(rawJson)
    if (error) return

    // Smoke test
    const fedData = province === 'federal' ? data : bundledFederal
    const provData = province === 'federal' ? bundledProvinces?.ON : data
    try {
      const result = runTaxSmokeTest(fedData, provData)
      setSmokeResult(result)
      setSmokeError(null)
    } catch (e) {
      setSmokeError(e.message)
      return
    }

    setSaving(true)
    try {
      await adminApi.upsertTaxData(province, taxYear, data)
      setSaveMsg('Saved successfully')
    } catch (e) {
      setSaveMsg(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const payload = { federal: bundledFederal, ...bundledProvinces }
      await adminApi.seedAllTaxData(payload)
      setSaveMsg('Seeded all 10 province/federal rows')
    } catch (e) {
      setSaveMsg(`Seed failed: ${e.message}`)
    } finally {
      setSeeding(false)
    }
  }

  const canSave = !parseError && rawJson.trim()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={province}
          onChange={e => setProvince(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {PROVINCE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="number"
          value={taxYear}
          onChange={e => setTaxYear(Number(e.target.value))}
          min={2020}
          max={2035}
          className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding}
          className="ml-auto px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {seeding ? 'Seeding…' : 'Seed from bundled JSON'}
        </button>
      </div>

      <textarea
        value={rawJson}
        onChange={handleChange}
        spellCheck={false}
        className={`w-full h-96 font-mono text-xs p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y ${parseError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
      />

      {parseError && (
        <p className="text-xs text-red-600">{parseError}</p>
      )}

      {smokeResult && !smokeError && (
        <p className="text-xs text-green-700">
          Parse OK — Gross tax on $100K: federal ${smokeResult.federalTax.toLocaleString('en-CA', { maximumFractionDigits: 0 })} / provincial ${smokeResult.provincialTax.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
        </p>
      )}

      {smokeError && (
        <p className="text-xs text-red-600">Engine error: {smokeError} — save blocked</p>
      )}

      {saveMsg && (
        <p className={`text-xs ${saveMsg.startsWith('Save failed') || saveMsg.startsWith('Seed failed') ? 'text-red-600' : 'text-green-700'}`}>
          {saveMsg}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || saving}
        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save Province Data'}
      </button>
    </div>
  )
}
