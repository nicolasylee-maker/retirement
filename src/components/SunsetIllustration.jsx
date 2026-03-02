import React from 'react';

export default function SunsetIllustration({ className = '' }) {
  return (
    <svg
      viewBox="0 0 800 400"
      className={`w-full h-auto ${className}`}
      aria-label="Sunset over a lake with rolling hills"
      role="img"
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c2d12" />
          <stop offset="30%" stopColor="#c2410c" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="75%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0369a1" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="800" height="400" fill="url(#sky)" />

      {/* Sun glow */}
      <circle cx="400" cy="260" r="120" fill="url(#sunGlow)" />

      {/* Sun - half circle on horizon */}
      <circle cx="400" cy="270" r="45" fill="#fbbf24" opacity="0.9" />

      {/* Sun reflection on water */}
      <ellipse cx="400" cy="330" rx="60" ry="8" fill="#fbbf24" opacity="0.3" />
      <ellipse cx="400" cy="350" rx="40" ry="5" fill="#fbbf24" opacity="0.2" />
      <ellipse cx="400" cy="365" rx="25" ry="3" fill="#fbbf24" opacity="0.15" />

      {/* Far hills */}
      <path d="M0 280 Q100 230 200 260 Q300 220 400 250 Q500 215 600 245 Q700 225 800 260 L800 300 L0 300Z"
            fill="#14532d" opacity="0.7" />

      {/* Mid hills */}
      <path d="M0 290 Q150 250 280 275 Q380 245 500 270 Q620 240 750 265 L800 270 L800 310 L0 310Z"
            fill="#15803d" opacity="0.8" />

      {/* Near hills */}
      <path d="M0 300 Q120 275 250 290 Q400 265 550 285 Q680 270 800 285 L800 320 L0 320Z"
            fill="#166534" opacity="0.9" />

      {/* Lake */}
      <rect x="0" y="310" width="800" height="90" fill="url(#lake)" />

      {/* Shoreline */}
      <path d="M0 310 Q200 305 400 310 Q600 315 800 308 L800 318 Q600 325 400 318 Q200 312 0 318Z"
            fill="#166534" opacity="0.6" />
    </svg>
  );
}
