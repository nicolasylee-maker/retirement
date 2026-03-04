import React from 'react'

/**
 * Visual Audit Report — placeholder.
 * Will become the interactive phase-by-phase audit with Sankey diagrams,
 * charts, and expandable math cards per VISUAL-AUDIT-EXCEL-SPEC.
 */
export default function VisualAudit({ scenario, projectionData, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-purple-600 mr-2">
            Visual Audit
          </span>
          <span className="text-sm font-semibold text-gray-900">{scenario?.name || 'Scenario'}</span>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900
                     border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Close ✕
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">📊</p>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Visual Audit Report</h2>
          <p className="text-sm text-gray-500">Coming soon — interactive phase-by-phase breakdown</p>
          <p className="text-xs text-gray-400 mt-1">Sankey diagrams · bar charts · expandable math cards</p>
        </div>
      </div>
    </div>
  )
}
