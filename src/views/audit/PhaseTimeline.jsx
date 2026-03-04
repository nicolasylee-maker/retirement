import React from 'react';

/**
 * Horizontal phase timeline navigation bar.
 * Each phase is a clickable node with a connecting line.
 */
export default function PhaseTimeline({ phases, activePage, onNavigate }) {
  return (
    <div className="sticky top-12 z-10 flex items-center gap-0 px-4 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
      {phases.map((phase, i) => {
        const isActive = activePage === i;
        return (
          <React.Fragment key={phase.id}>
            {i > 0 && (
              <div className="w-8 h-px bg-gray-300 flex-shrink-0" />
            )}
            <button
              onClick={() => onNavigate(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${isActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-700'}`}
            >
              <span>{phase.icon}</span>
              <span className="hidden sm:inline">{phase.label}</span>
              <span className="sm:hidden">{phase.shortLabel || phase.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
