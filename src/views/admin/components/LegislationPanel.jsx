import React, { useState, useEffect } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { adminApi } from '../../../services/adminService'

function StatusBadge({ result }) {
  if (result.error) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Error</span>
  }
  if (result.changed) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Changed</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">OK</span>
}

export default function LegislationPanel() {
  const [lastCheck, setLastCheck] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState(null)

  async function loadLastCheck() {
    const { data } = await supabase
      .from('legislation_checks')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLastCheck(data ?? null)
    setLoading(false)
  }

  useEffect(() => { loadLastCheck() }, [])

  async function handleRunCheck() {
    setRunning(true)
    setRunError(null)
    try {
      const row = await adminApi.checkLegislation()
      setLastCheck(row)
    } catch (e) {
      setRunError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const results = lastCheck?.results ?? []
  const changedCount = results.filter(r => r.changed).length
  const errorCount = results.filter(r => r.error).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {loading
            ? 'Loading…'
            : lastCheck
              ? <>Last checked: <span className="text-gray-700">{new Date(lastCheck.checked_at).toLocaleString('en-CA')}</span></>
              : 'Never run'
          }
        </div>
        <button
          type="button"
          onClick={handleRunCheck}
          disabled={running}
          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {running ? 'Checking…' : 'Run Legislation Check'}
        </button>
      </div>

      {runError && <p className="text-xs text-red-600">{runError}</p>}

      {lastCheck?.summary && (
        <p className="text-xs text-gray-500">{lastCheck.summary}</p>
      )}

      {results.length > 0 && (
        <>
          {(changedCount > 0 || errorCount > 0) && (
            <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {changedCount > 0 && <span>{changedCount} act{changedCount !== 1 ? 's' : ''} may have changed — review and update JSON data if needed. </span>}
              {errorCount > 0 && <span>{errorCount} fetch error{errorCount !== 1 ? 's' : ''} — check network or CanLII URL changes.</span>}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-left">
                  <th className="pb-2 pr-3 font-medium">Prov</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Act</th>
                  <th className="pb-2 pr-3 font-medium">Last Known</th>
                  <th className="pb-2 pr-3 font-medium">Found</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-700">{r.province}</td>
                    <td className="py-2 pr-3 text-gray-500">{r.type}</td>
                    <td className="py-2 pr-3 text-gray-600 max-w-xs truncate">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 hover:underline" title={r.act}>
                        {r.act}
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{r.lastKnownAmendment}</td>
                    <td className="py-2 pr-3 text-gray-500">{r.foundYear ?? '—'}</td>
                    <td className="py-2"><StatusBadge result={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
