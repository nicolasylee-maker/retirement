import React, { useEffect, useRef } from 'react';

function LockIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

export default function MobileMenu({ tabs, view, onTabClick, gatedTabs, isPaid, open, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  function handleTabSelect(key) {
    onTabClick(key);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 md:hidden transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl md:hidden
                    transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-base font-bold text-sunset-600">RetirePlanner.ca</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="py-2">
          {tabs.map((tab) => {
            const isGated = gatedTabs.has(tab.key) && !isPaid;
            const isActive = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabSelect(tab.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  tab.special
                    ? (isActive ? 'bg-purple-50 text-purple-700' : 'text-purple-500 hover:bg-purple-50 hover:text-purple-700')
                    : (isActive ? 'bg-sunset-50 text-sunset-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                }`}
              >
                {tab.icon}
                <span className="flex-1 text-left">{tab.label}</span>
                {isGated && <LockIcon />}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
