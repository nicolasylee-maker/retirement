import React from 'react';

export function PulsingDot({ id, dismissed, onDismiss }) {
  if (dismissed) return null;
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onDismiss(id); }}
      className="relative inline-flex ml-1.5 cursor-pointer align-middle"
      title="Important field — click to dismiss"
    >
      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  );
}
