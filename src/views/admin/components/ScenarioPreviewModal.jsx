import React, { useMemo } from 'react'
import Dashboard from '../../dashboard/Dashboard'
import { projectScenario } from '../../../engines/projectionEngine'

export default function ScenarioPreviewModal({ scenario, userEmail, onClose }) {
  const projectionData = useMemo(() => projectScenario(scenario), [scenario])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-purple-600 mr-2">
            Admin Preview
          </span>
          <span className="text-sm font-semibold text-gray-900">{scenario.name}</span>
          <span className="text-xs text-gray-400 ml-2">· {userEmail}</span>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900
                     border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Close preview ✕
        </button>
      </div>

      {/* Scrollable dashboard body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Dashboard
          scenario={scenario}
          projectionData={projectionData}
          onScenarioChange={null}
          aiInsights={{}}
          onSaveInsight={null}
        />
      </div>
    </div>
  )
}
