import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '../utils/formatters';

/**
 * Rich tooltip popover for KPI breakdowns.
 * Uses portal + fixed positioning to escape parent overflow/uppercase.
 *
 * Props:
 *   title       - Header text
 *   subtitle    - Plain-English sentence explaining the KPI
 *   sections    - Array of { heading?, items: [{ label, value, sub?, color?, negative? }] }
 *   bar         - Optional stacked bar: [{ label, value, color }]
 */
export default function RichTooltip({ title, subtitle, sections, bar }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const POP_WIDTH = 380;

  const handleOpen = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      let top = rect.bottom + 10;
      if (top + 420 > vh && rect.top > 420) {
        top = rect.top - 420;
      }
      let left = rect.left + rect.width / 2 - POP_WIDTH / 2;
      left = Math.max(8, Math.min(left, vw - POP_WIDTH - 8));

      setCoords({ top, left });
    }
    setOpen(o => !o);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Close on scroll (any scrollable parent)
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [open]);

  const barTotal = bar ? bar.reduce((sum, b) => sum + Math.abs(b.value), 0) : 0;

  const fmtVal = (v) => typeof v === 'number' ? formatCurrency(v) : v;

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        ref={btnRef}
        type="button"
        className="w-4 h-4 rounded-full border border-gray-400 text-gray-400
                   text-[10px] leading-none flex items-center justify-center
                   hover:border-purple-500 hover:text-purple-500 hover:bg-purple-50
                   focus:outline-none focus:ring-1 focus:ring-purple-400
                   transition-all duration-150"
        onClick={handleOpen}
        aria-label="Show details"
      >
        ?
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="fixed z-[9999]"
          style={{ top: coords.top, left: coords.left, width: POP_WIDTH }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden
                          text-left normal-case tracking-normal font-normal"
               style={{ fontFamily: 'inherit' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-3">
              <p className="text-white text-base font-semibold">{title}</p>
              {subtitle && (
                <p className="text-gray-300 text-xs mt-0.5 leading-relaxed">{subtitle}</p>
              )}
            </div>

            <div className="max-h-[65vh] overflow-y-auto">
              {/* Stacked bar visual */}
              {bar && barTotal > 0 && (
                <div className="px-5 pt-4 pb-2">
                  <div className="flex h-4 rounded-full overflow-hidden shadow-inner">
                    {bar.map((b, i) => {
                      const pct = Math.max(2, (Math.abs(b.value) / barTotal) * 100);
                      return (
                        <div
                          key={i}
                          style={{ width: `${pct}%`, backgroundColor: b.color }}
                          title={`${b.label}: ${formatCurrency(b.value)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {bar.map((b, i) => (
                      <span key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: b.color }}
                        />
                        {b.label}
                        <span className="font-semibold text-gray-800 tabular-nums">
                          {formatCurrency(b.value)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections with headings */}
              {sections && sections.map((section, si) => (
                <div key={si} className="px-5 py-3 border-t border-gray-100">
                  {section.heading && (
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {section.heading}
                    </p>
                  )}
                  <div className="space-y-2">
                    {section.items.map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-sm text-gray-700">
                            {item.color && (
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                            )}
                            {item.label}
                          </span>
                          <span className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                            item.negative ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {fmtVal(item.value)}
                          </span>
                        </div>
                        {item.sub && (
                          <p className="text-[11px] text-gray-400 ml-4 mt-0.5 leading-snug">
                            {item.sub}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-2 flex justify-between items-center bg-gray-50/50">
              <span className="text-[10px] text-gray-300">Press Esc or click outside</span>
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}
