import React, { useState, useRef, useCallback } from 'react';

export default function HelpIcon({ text }) {
  const [show, setShow] = useState(false);
  const [above, setAbove] = useState(true);
  const btnRef = useRef(null);

  const handleShow = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // If button is in top 120px of viewport, show tooltip below instead
      setAbove(rect.top > 120);
    }
    setShow(true);
  }, []);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        ref={btnRef}
        type="button"
        className="w-4 h-4 rounded-full border border-gray-400 text-gray-400
                   text-xs leading-none flex items-center justify-center
                   hover:border-sunset-400 hover:text-sunset-500
                   focus:outline-none focus:ring-1 focus:ring-sunset-400
                   transition-colors duration-150"
        onMouseEnter={handleShow}
        onMouseLeave={() => setShow(false)}
        onFocus={handleShow}
        onBlur={() => setShow(false)}
        aria-label="Help"
      >
        ?
      </button>

      {show && (
        <div
          className={`absolute z-50 ${
            above
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : 'top-full left-1/2 -translate-x-1/2 mt-2'
          }`}
          role="tooltip"
        >
          {/* Arrow (top if below, bottom if above) */}
          {!above && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px">
              <div className="w-2 h-2 bg-gray-800 rotate-45 transform translate-y-1" />
            </div>
          )}
          <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3
                          w-64 shadow-lg whitespace-normal leading-relaxed">
            {text}
          </div>
          {above && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 bg-gray-800 rotate-45 transform" />
            </div>
          )}
        </div>
      )}
    </span>
  );
}
