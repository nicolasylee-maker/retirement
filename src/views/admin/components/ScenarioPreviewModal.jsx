import React, { useMemo, useState, useRef, useEffect } from 'react'
import Dashboard from '../../dashboard/Dashboard'
import EstateView from '../../estate/EstateView'
import DebtView from '../../debt/DebtView'
import CompareView from '../../compare/CompareView'
import { projectScenario } from '../../../engines/projectionEngine'
import { openPrintReport } from '../../../utils/openPrintReport'
import { downloadAudit } from '../../../utils/downloadAudit'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'debt',      label: 'Debt' },
  { key: 'compare',   label: 'Compare' },
  { key: 'estate',    label: 'Estate' },
]

export default function ScenarioPreviewModal({ scenario, userEmail, onClose }) {
  const [tab, setTab] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const projectionData = useMemo(() => projectScenario(scenario), [scenario])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleExport = () => {
    const payload = { version: 3, scenarios: [scenario], exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scenario.name || 'scenario'}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMenuOpen(false)
  }

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

        <div className="flex items-center gap-2">
          {/* 3-dots menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className={`p-1.5 rounded-lg transition-colors ${
                menuOpen ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Actions menu"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-10">
                <button
                  onClick={() => { openPrintReport(scenario, projectionData, scenario.name); setMenuOpen(false) }}
                  className="menu-item w-full text-left"
                >
                  PDF Report
                </button>
                <button
                  onClick={() => { downloadAudit(scenario, projectionData); setMenuOpen(false) }}
                  className="menu-item w-full text-left"
                >
                  Calculation Audit
                </button>
                <div className="border-t border-gray-100 my-1.5 mx-3" />
                <button onClick={handleExport} className="menu-item w-full text-left">
                  Export
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900
                       border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close preview ✕
          </button>
        </div>
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
