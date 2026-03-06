import React, { useEffect, useRef, useState } from 'react';
import { computeReadinessRank } from '../../engines/readinessEngine.js';

function formatCAD(n) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}

// SVG gauge constants
const CX = 120;   // center x
const CY = 108;   // center y (sits near the bottom of the SVG viewport)
const R = 90;     // radius
const STROKE = 14;
const DOT_R = 11; // needle dot radius
const SVG_W = 240;
const SVG_H = 122; // viewport: shows top half only, with room for dot at endpoints

// Full track path: top semicircle from left (CX-R, CY) to right (CX+R, CY)
// sweep=1 (clockwise in SVG/Y-down) traces through the top — confirmed visually.
const TRACK = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

// Convert fill fraction [0..1] to SVG (x, y) on the arc.
// fill=0 → left endpoint, fill=1 → right endpoint, fill=0.5 → topmost point.
// Formula: angle goes from π to 0 as fill goes 0 → 1.
// In SVG (Y-down): x = CX + R*cos(a), y = CY - R*sin(a)
function fillToXY(fill) {
  const a = Math.PI * (1 - fill); // π → 0
  return {
    x: CX + R * Math.cos(a),
    y: CY - R * Math.sin(a),
  };
}

// top-X% → fill fraction: lower percentile = closer to right (purple) end
function percentileToFill(p) {
  return (100 - p) / 99;
}

export default function ReadinessView({ scenario, onContinue }) {
  const rank = computeReadinessRank(scenario);
  const { percentile, bracket, userSavings, medianSavings, topDecileSavings, hasPension } = rank;

  const targetFill = percentileToFill(percentile);

  // Animate fill from 0 → targetFill and displayPct from 99 → percentile
  const [animFill, setAnimFill] = useState(0);
  const [displayPct, setDisplayPct] = useState(99);
  const animRef = useRef(null);
  const startRef = useRef(null);
  const DURATION = 1000;

  useEffect(() => {
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimFill(eased * targetFill);
      setDisplayPct(Math.round(99 - eased * (99 - percentile)));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [targetFill, percentile]);

  const needle = fillToXY(animFill);

  // Colored arc from left endpoint to needle position
  const coloredArc = animFill > 0.005
    ? `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${needle.x.toFixed(2)} ${needle.y.toFixed(2)}`
    : null;

  const isTopTier = percentile <= 10;
  const isBottomTier = percentile >= 85;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <p className="mb-10 text-xs font-medium tracking-widest uppercase text-gray-400">
        RetirePlanner.ca
      </p>

      {/* Headline */}
      <div className="text-center mb-8 max-w-xs">
        {isBottomTier ? (
          <>
            <h1 className="text-gray-900 text-3xl font-bold leading-tight">
              You're just getting started
            </h1>
            <p className="text-gray-500 text-base mt-2">
              Most Canadians in your age group are in the same position.
            </p>
          </>
        ) : (
          <h1 className="text-gray-900 text-3xl font-bold leading-snug">
            You're in the top{' '}
            <span className="bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
              {displayPct}%
            </span>
            {' '}of Canadians aged {bracket.label}
          </h1>
        )}
      </div>

      {/* Gauge */}
      <div className="mb-2">
        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          aria-label={`Retirement savings rank: top ${percentile}% of Canadians aged ${bracket.label}`}
        >
          <defs>
            <linearGradient id="rr-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          {/* Gray track (full arc) */}
          <path d={TRACK} fill="none" stroke="#e5e7eb" strokeWidth={STROKE} strokeLinecap="round" />

          {/* Gradient colored portion (left to needle) */}
          {coloredArc && (
            <path d={coloredArc} fill="none" stroke="url(#rr-grad)" strokeWidth={STROKE} strokeLinecap="round" />
          )}

          {/* Needle dot */}
          <circle
            cx={needle.x}
            cy={needle.y}
            r={DOT_R}
            fill="white"
            stroke="url(#rr-grad)"
            strokeWidth={3}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }}
          />
        </svg>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between w-full max-w-[240px] mb-8 px-1">
        <span className="text-xs text-gray-400">Lower savings</span>
        <span className="text-xs text-gray-400">Higher savings</span>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3 mb-5 w-full max-w-xs">
        <div className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-4 text-center shadow-sm">
          <p className="text-gray-900 text-lg font-bold">{formatCAD(userSavings)}</p>
          <p className="text-gray-500 text-xs mt-0.5">Your savings</p>
        </div>
        <div className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-4 text-center shadow-sm">
          <p className="text-gray-900 text-lg font-bold">{formatCAD(medianSavings)}</p>
          <p className="text-gray-500 text-xs mt-0.5">Canadian median</p>
        </div>
      </div>

      {/* Top decile context */}
      {!isTopTier && (
        <p className="text-gray-400 text-xs text-center mb-5 max-w-xs">
          Top 10% of Canadians aged {bracket.label} have saved {formatCAD(topDecileSavings)}+
        </p>
      )}

      {/* Pension disclaimer */}
      {hasPension && (
        <div className="mb-5 max-w-xs rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center">
          <p className="text-amber-700 text-xs">
            Have a DB pension? Your overall retirement picture is likely stronger than this savings rank suggests.
          </p>
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={onContinue}
        className="w-full max-w-xs bg-sunset-500 hover:bg-sunset-600 text-white font-semibold py-3.5 rounded-xl text-base transition-colors shadow-sm"
      >
        View My Plan &rarr;
      </button>

      {/* Fine print */}
      <p className="mt-6 text-gray-400 text-xs text-center max-w-xs leading-relaxed">
        Based on RRSP + TFSA balances. Source: Statistics Canada Survey of Financial Security (2023), Fidelity Canada (2024).
      </p>
    </div>
  );
}
