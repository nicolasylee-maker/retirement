import React, { useState } from 'react';
import PhaseTimeline from './PhaseTimeline';
import AuditSummaryPage from './AuditSummaryPage';
import PhasePreRetirement from './PhasePreRetirement';
import PhaseEarlyRetirement from './PhaseEarlyRetirement';
import PhaseRRIF from './PhaseRRIF';
import PhaseEstate from './PhaseEstate';
import PhaseOptimizer from './PhaseOptimizer';

const PHASES = [
  { id: 'summary', label: 'Summary', shortLabel: 'Sum', icon: '📋' },
  { id: 'working', label: 'Working Years', shortLabel: 'Work', icon: '💼' },
  { id: 'early-ret', label: 'Early Retirement', shortLabel: 'Retire', icon: '🌅' },
  { id: 'rrif', label: 'Age 72+', shortLabel: '72+', icon: '📋' },
  { id: 'estate', label: 'Estate', shortLabel: 'Estate', icon: '🏦' },
  { id: 'optimize', label: 'Optimize', shortLabel: 'Opt', icon: '✨' },
];

/**
 * Visual Audit Report — interactive phase-by-phase breakdown
 * with Sankey diagrams, charts, and expandable math cards.
 */
export default function VisualAudit({ scenario, projectionData, optimizationResult, onClose }) {
  const [activePage, setActivePage] = useState(0);

  if (!scenario || !projectionData?.length) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white">
        <p className="text-sm text-gray-500">No scenario data available.</p>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 0: return <AuditSummaryPage scenario={scenario} projectionData={projectionData} onNavigate={setActivePage} />;
      case 1: return <PhasePreRetirement scenario={scenario} projectionData={projectionData} />;
      case 2: return <PhaseEarlyRetirement scenario={scenario} projectionData={projectionData} />;
      case 3: return <PhaseRRIF scenario={scenario} projectionData={projectionData} />;
      case 4: return <PhaseEstate scenario={scenario} projectionData={projectionData} />;
      case 5: return <PhaseOptimizer scenario={scenario} optimizationResult={optimizationResult} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
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
          Close
        </button>
      </div>

      {/* Phase timeline */}
      <PhaseTimeline phases={PHASES} activePage={activePage} onNavigate={setActivePage} />

      {/* Page content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {renderPage()}
      </div>
    </div>
  );
}
