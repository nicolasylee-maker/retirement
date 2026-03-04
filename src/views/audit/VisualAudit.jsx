import React, { useState, useMemo } from 'react';
import PhaseTimeline from './PhaseTimeline';
import AuditSummaryPage from './AuditSummaryPage';
import PhasePreRetirement from './PhasePreRetirement';
import PhaseEarlyRetirement from './PhaseEarlyRetirement';
import PhaseRRIF from './PhaseRRIF';
import PhaseEstate from './PhaseEstate';
import PhaseOptimizer from './PhaseOptimizer';

const ALL_PHASES = [
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
  const [activeIdx, setActiveIdx] = useState(0);

  // Filter phases based on scenario — only show phases that have data
  const phases = useMemo(() => {
    if (!scenario) return ALL_PHASES;
    const s = scenario;
    return ALL_PHASES.filter(p => {
      if (p.id === 'working') return s.currentAge < s.retirementAge;
      if (p.id === 'early-ret') return s.retirementAge <= 71 && s.retirementAge < s.lifeExpectancy;
      if (p.id === 'rrif') return s.lifeExpectancy >= 72;
      return true; // summary, estate, optimize always show
    });
  }, [scenario]);

  // Navigate by phase ID (used by AuditSummaryPage)
  const navigateToId = (id) => {
    const idx = phases.findIndex(p => p.id === id);
    if (idx >= 0) setActiveIdx(idx);
  };

  if (!scenario || !projectionData?.length) {
    return onClose ? (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white">
        <p className="text-sm text-gray-500">No scenario data available.</p>
      </div>
    ) : (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-gray-500">No scenario data available.</p>
      </div>
    );
  }

  const activePhase = phases[activeIdx]?.id;

  const renderPage = () => {
    switch (activePhase) {
      case 'summary': return <AuditSummaryPage scenario={scenario} projectionData={projectionData} onNavigate={navigateToId} phases={phases} />;
      case 'working': return <PhasePreRetirement scenario={scenario} projectionData={projectionData} />;
      case 'early-ret': return <PhaseEarlyRetirement scenario={scenario} projectionData={projectionData} />;
      case 'rrif': return <PhaseRRIF scenario={scenario} projectionData={projectionData} />;
      case 'estate': return <PhaseEstate scenario={scenario} projectionData={projectionData} />;
      case 'optimize': return <PhaseOptimizer scenario={scenario} optimizationResult={optimizationResult} />;
      default: return null;
    }
  };

  const content = (
    <>
      {/* Header — only in modal mode */}
      {onClose && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600 mr-2">
              Deep Dive
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
      )}

      {/* Phase timeline */}
      <PhaseTimeline phases={phases} activePage={activeIdx} onNavigate={setActiveIdx} />

      {/* Page content */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-10${onClose ? '' : ' pb-20 md:pb-4'}`}>
        {renderPage()}
      </div>
    </>
  );

  // Modal mode (admin preview) vs inline tab mode
  if (onClose) {
    return <div className="fixed inset-0 z-[60] flex flex-col bg-white overflow-hidden">{content}</div>;
  }

  return <div className="flex flex-col min-h-[calc(100vh-10rem)]">{content}</div>;
}
