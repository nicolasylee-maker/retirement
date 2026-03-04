import React, { useEffect, useState } from 'react'
import { adminApi } from '../../../services/adminService'
import ScenarioPreviewModal from './ScenarioPreviewModal'

export default function UserScenariosPanel({ userId, userEmail, onClose }) {
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previewScenario, setPreviewScenario] = useState(null)

  useEffect(() => {
    setLoading(true)
    adminApi.getUserScenarios(userId)
      .then(d => { setScenarios(d.scenarios || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />
      {/* Panel */}
      <div className="w-96 bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Scenarios</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <p className="text-sm text-gray-400">Loading...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && scenarios.length === 0 && (
            <p className="text-sm text-gray-400">No scenarios.</p>
          )}
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => setPreviewScenario({ id: s.id, name: s.name, ...s.data })}
              className="w-full text-left mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200
                         hover:border-purple-300 hover:bg-purple-50/40 transition-colors cursor-pointer"
            >
              <p className="font-medium text-gray-800 text-sm mb-1">{s.name}</p>
              <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('en-CA')}</p>
              <p className="text-xs text-purple-500 mt-1">Click to preview →</p>
            </button>
          ))}
        </div>
      </div>
      {previewScenario && (
        <ScenarioPreviewModal
          scenario={previewScenario}
          userEmail={userEmail}
          onClose={() => setPreviewScenario(null)}
        />
      )}
    </div>
  )
}
