import React, { useMemo, useState } from 'react'
import Dashboard from '../../dashboard/Dashboard'
import EstateView from '../../estate/EstateView'
import DebtView from '../../debt/DebtView'
import CompareView from '../../compare/CompareView'
import { projectScenario } from '../../../engines/projectionEngine'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'debt',      label: 'Debt' },
  { key: 'compare',   label: 'Compare' },
  { key: 'estate',    label: 'Estate' },
]

export default function ScenarioPreviewModal({ scenario, userEmail, onClose }) {
  const [tab, setTab] = useState('dashboard')
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

      {/* Tab nav */}
      <nav className="px-6 pb-0 pt-2 flex gap-1 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 border border-b-white border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'dashboard' && (
          <Dashboard
            scenario={scenario}
            projectionData={projectionData}
            onScenarioChange={null}
            aiInsights={{}}
            onSaveInsight={null}
          />
        )}
        {tab === 'estate' && (
          <EstateView
            scenario={scenario}
            projectionData={projectionData}
            onNavigate={setTab}
            aiInsights={{}}
            onSaveInsight={null}
          />
        )}
        {tab === 'debt' && (
          <DebtView
            scenario={scenario}
            projectionData={projectionData}
            onNavigate={setTab}
            aiInsights={{}}
            onSaveInsight={null}
          />
        )}
        {tab === 'compare' && (
          <CompareView
            scenarios={[scenario]}
            onNavigate={setTab}
            aiInsights={{}}
            onSaveInsight={null}
          />
        )}
      </div>
    </div>
  )
}
