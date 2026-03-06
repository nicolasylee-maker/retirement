import React, { useEffect, useRef, useState } from 'react';
import { computeReadinessRank } from '../../engines/readinessEngine.js';

function formatCAD(n) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}

// SVG arc gauge constants
const RADIUS = 90;
const STROKE = 14;
const CENTER = 110;
// Arc spans 180 degrees (left to right, top half of circle)
const ARC_LENGTH = Math.PI * RADIUS; // circumference of half-circle

function describeArc(cx, cy, r, startAngle, endAngle) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// percentile = top-X%, so lower number = better = arc fills more to the right
// top 1% -> full arc; top 99% -> tiny arc
function percentileToFill(percentile) {
  return (100 - percentile) / 99; // 0..1
}

export default function ReadinessView({ scenario, onContinue }) {
  const rank = computeReadinessRank(scenario);
  const { percentile, bracket, userSavings, medianSavings, topDecileSavings, hasPension } = rank;

  const targetFill = percentileToFill(percentile);
  const [fill, setFill] = useState(0);
  const [displayPct, setDisplayPct] = useState(percentile > 50 ? 99 : 1);
  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const DURATION = 1100; // ms

  useEffect(() => {
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      setFill(eased * targetFill);

      // Animate the displayed percentile number
      const fromPct = percentile > 50 ? 99 : 1;
      const diff = percentile - fromPct;
      setDisplayPct(Math.round(fromPct + diff * eased));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [targetFill, percentile]);

  // Arc path: 180° from left (180°) to right (0°), drawn along the top
  const trackPath = describeArc(CENTER, CENTER, RADIUS, 180, 0);
  const filledEndAngle = 180 - fill * 180;
  const filledPath = fill > 0.001 ? describeArc(CENTER, CENTER, RADIUS, 180, 180 - fill * 180) : null;

  const svgWidth = CENTER * 2;
  const svgHeight = CENTER + STROKE + 8;

  const isTopTier = percentile <= 10;
  const isBottomTier = percentile >= 85;

  let headlineAdj = 'in the';
  let headlineRank = `top ${displayPct}%`;
  if (isBottomTier) {
    headlineAdj = 'just getting';
    headlineRank = 'started';
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-gray-500 text-sm font-medium tracking-widest uppercase">
        RetirePlanner.ca
      </div>

      {/* Headline */}
      <div className="text-center mb-6 max-w-sm">
        {isBottomTier ? (
          <>
            <p className="text-white text-3xl font-bold leading-tight">
              You're just getting started
            </p>
            <p className="text-gray-400 text-lg mt-2">
              Most Canadians in your bracket are in the same boat.
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-300 text-2xl font-semibold leading-snug">
              You're {headlineAdj} the
            </p>
            <p className="text-4xl font-extrabold mt-1 leading-none bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
              top {displayPct}%
            </p>
            <p className="text-gray-300 text-2xl font-semibold mt-1">
              of Canadians aged
            </p>
            <p className="text-white text-2xl font-bold">
              {bracket.label}
            </p>
          </>
        )}
      </div>

      {/* Arc Gauge */}
      <div className="relative mb-8">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          aria-label={`Retirement savings gauge: top ${percentile}% of Canadians ${bracket.label}`}
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          {/* Track (full arc, dark) */}
          <path
            d={trackPath}
            fill="none"
            stroke="#1f2937"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />

          {/* Filled arc */}
          {filledPath && (
            <path
              d={filledPath}
              fill="none"
              stroke="url(#arcGradient)"
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          )}

          {/* Center label */}
          {!isBottomTier && (
            <>
              <text
                x={CENTER}
                y={CENTER - 8}
                textAnchor="middle"
                className="fill-white"
                style={{ fill: 'white', fontSize: 32, fontWeight: 800 }}
              >
                {displayPct}%
              </text>
              <text
                x={CENTER}
                y={CENTER + 16}
                textAnchor="middle"
                style={{ fill: '#9ca3af', fontSize: 13 }}
              >
                Age {bracket.label}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Stat Cards */}
      <div className="flex gap-4 mb-6 w-full max-w-xs">
        <div className="flex-1 rounded-xl bg-white/10 backdrop-blur px-4 py-4 text-center">
          <p className="text-white text-xl font-bold">{formatCAD(userSavings)}</p>
          <p className="text-gray-400 text-xs mt-1">Your savings</p>
        </div>
        <div className="flex-1 rounded-xl bg-white/10 backdrop-blur px-4 py-4 text-center">
          <p className="text-white text-xl font-bold">{formatCAD(medianSavings)}</p>
          <p className="text-gray-400 text-xs mt-1">Canadian median</p>
        </div>
      </div>

      {/* Top decile context */}
      {!isTopTier && (
        <p className="text-gray-500 text-xs text-center mb-4 max-w-xs">
          Top 10% of Canadians aged {bracket.label} have saved {formatCAD(topDecileSavings)}+
        </p>
      )}

      {/* Pension disclaimer */}
      {hasPension && (
        <div className="mb-6 max-w-xs rounded-lg bg-indigo-900/40 border border-indigo-700/40 px-4 py-3 text-center">
          <p className="text-indigo-300 text-xs">
            Have a DB pension? Your overall retirement picture is likely stronger than this savings rank suggests.
          </p>
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={onContinue}
        className="w-full max-w-xs bg-white text-gray-900 font-bold py-3.5 rounded-xl text-base hover:bg-gray-100 transition-colors shadow-lg"
      >
        View My Plan &rarr;
      </button>

      {/* Fine print */}
      <p className="mt-6 text-gray-600 text-xs text-center max-w-xs">
        Based on RRSP + TFSA balances. Source: Statistics Canada Survey of Financial Security (2023), Fidelity Canada (2024).
      </p>
    </div>
  );
}
