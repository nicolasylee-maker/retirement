import React, { useMemo, useState } from 'react';
import {
  ComposedChart, BarChart, Bar,
  Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import { COLORS, CHART_STYLE } from '../../constants/designTokens';
import ChartLegend from '../../components/ChartLegend';
import { formatCurrencyShort } from '../../utils/formatters';
import { projectScenario } from '../../engines/projectionEngine';
import CustomTooltip from './PortfolioChartTooltip';
import { buildMilestones, buildPhaseAnnotations } from './portfolioChartHelpers';
import { responsiveChartHeight } from '../../utils/responsiveChartHeight';
import {
  buildWaterfallData,
  buildWaterfallInsight,
  buildDriversAnnotations,
  WATERFALL_COLORS,
} from './waterfallChartHelpers';

// ---------------------------------------------------------------------------
// Shared label components
// ---------------------------------------------------------------------------

const LABEL_DY = [-14, -28, -42];

function MilestoneLabel({ viewBox, label, color, level }) {
  const { x, y } = viewBox;
  return (
    <text
      x={x}
      y={y + (LABEL_DY[Math.min(level, LABEL_DY.length - 1)] ?? -14)}
      fill={color}
      fontSize={10}
      fontWeight={600}
      textAnchor="middle"
    >
      {label}
    </text>
  );
}

function PhaseLabel({ viewBox, label }) {
  const { x, y } = viewBox;
  return (
    <text x={x + 4} y={y + 14} fill={COLORS.gray[500]} fontSize={9} fontWeight={500}>
      {label} →
    </text>
  );
}

// ---------------------------------------------------------------------------
// Annotation card (shared by both views)
// ---------------------------------------------------------------------------

function AnnotationCard({ annotation: a }) {
  return (
    <div className="flex-1 min-w-[220px] bg-indigo-50/70 border border-indigo-100
                    rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-indigo-700 mb-0.5">Ages {a.ages}</p>
      <p className="text-indigo-900">{a.line1}</p>
      <p className="text-indigo-800">{a.line2}</p>
      {a.line3 && <p className="text-indigo-800">{a.line3}</p>}
      {a.line4 && <p className="text-indigo-600 mt-0.5 italic">{a.line4}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waterfall tooltip
// ---------------------------------------------------------------------------

function WaterfallTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const fmtSigned = (n) =>
    n >= 0
      ? `+${formatCurrencyShort(n)}`
      : `−${formatCurrencyShort(Math.abs(n))}`;

  if (row.isPostDepletion) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs min-w-[180px]">
        <p className="font-semibold text-gray-900 mb-1">Age {row.age}</p>
        <p className="text-red-700">Unfunded shortfall: {formatCurrencyShort(row._shortfallRaw)}</p>
        <p className="text-gray-400 italic mt-1">Portfolio depleted</p>
      </div>
    );
  }

  const net = row.portfolioChange;
  const segments = [
    { sign: '+', label: 'Growth',       val: row._growthRaw,      color: 'text-emerald-700', show: true },
    { sign: '+', label: 'Salary surplus', val: row._surplusRaw,   color: 'text-emerald-600', show: row._surplusRaw > 0 },
    { sign: '−', label: 'Expense gap',  val: row._expenseGapRaw,  color: 'text-rose-700',    show: true },
    { sign: '−', label: 'Debt',         val: row._debtPaymentRaw, color: 'text-red-700',     show: row._debtPaymentRaw > 0 },
    { sign: '−', label: 'Tax',          val: row._taxDrainRaw,    color: 'text-orange-600',  show: true },
    { sign: '−', label: 'Meltdown tax', val: row._meltdownTaxRaw, color: 'text-amber-600',   show: row._meltdownTaxRaw > 0 },
  ].filter(s => s.show);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs min-w-[200px]">
      <p className="font-semibold text-gray-900 mb-2">Age {row.age}</p>
      <div className="space-y-0.5">
        {segments.map(s => (
          <p key={s.label} className={s.color}>
            {s.sign} {s.label}:{' '}
            {s.sign === '+' ? fmtSigned(s.val) : `−${formatCurrencyShort(s.val)}`}
          </p>
        ))}
      </div>
      <div className="border-t border-gray-200 mt-2 pt-2">
        <p className={`font-semibold ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          Net: {fmtSigned(net)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waterfall legend
// ---------------------------------------------------------------------------

function WaterfallLegend({ hasDebt, hasMeltdown, hasSurplus, hasShortfall }) {
  const items = [
    { color: WATERFALL_COLORS.growth,      label: 'Investment growth',   show: true },
    { color: WATERFALL_COLORS.surplus,     label: 'Salary surplus',      show: hasSurplus },
    { color: WATERFALL_COLORS.expenseGap,  label: 'Expense gap',         show: true },
    { color: WATERFALL_COLORS.debtPayment, label: 'Debt payments',       show: hasDebt },
    { color: WATERFALL_COLORS.taxDrain,    label: 'Tax',                 show: true },
    { color: WATERFALL_COLORS.meltdownTax, label: 'Meltdown tax leakage', show: hasMeltdown },
    { color: WATERFALL_COLORS.shortfall,   label: 'Unfunded shortfall',  show: hasShortfall },
  ].filter(i => i.show);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-gray-500">
      {items.map(i => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PortfolioChart({ projectionData, scenario, forceView, chartHeight = responsiveChartHeight(window.innerWidth, 220, 360) }) {
  if (!projectionData || projectionData.length === 0) return null;

  const [showNoDebt,  setShowNoDebt]  = useState(false);
  const [activeView,  setActiveView]  = useState(forceView || 'balance'); // 'balance' | 'drivers'
  const hasConsumerDebt = (scenario.consumerDebt || 0) + (scenario.otherDebt || 0) > 0;

  // ── Balance-view data ──────────────────────────────────────────────────────
  const chartData = useMemo(() => projectionData.map(r => ({
    ...r,
    _portfolioDrain: Math.max(0,
      (r.rrspWithdrawal || 0) + (r.tfsaWithdrawal || 0)
      + (r.nonRegWithdrawal || 0) + (r.otherWithdrawal || 0)
      - (r.tfsaDeposit || 0) - (r.nonRegDeposit || 0)),
  })), [projectionData]);

  const noDebtData = useMemo(
    () => hasConsumerDebt
      ? projectScenario(scenario, { consumerDebt: 0, otherDebt: 0 })
      : null,
    [scenario, hasConsumerDebt],
  );

  const mergedData = useMemo(() => {
    if (!noDebtData) return chartData;
    const map = new Map(noDebtData.map(r => [r.age, r.totalPortfolio]));
    return chartData.map(r => ({ ...r, noDebtPortfolio: map.get(r.age) ?? null }));
  }, [chartData, noDebtData]);

  // ── Drivers-view data (lazy — only computed when Drivers tab is active) ───
  // O(n) extra calcTotalTax() calls; keep behind the activeView guard.
  // When forceView='drivers' is set, compute unconditionally on mount.
  const waterfallData = useMemo(
    () => (activeView === 'drivers' || forceView === 'drivers')
      ? buildWaterfallData(scenario, projectionData)
      : null,
    [activeView, forceView, scenario, projectionData],
  );

  // ── Shared chart infrastructure ───────────────────────────────────────────
  const lastRow      = chartData[chartData.length - 1];
  const milestones   = useMemo(() => buildMilestones(scenario, chartData), [scenario, chartData]);
  const depletionRow = chartData.find(r => r.totalPortfolio <= 0 && r.age > scenario.currentAge);
  const hasDrain     = chartData.some(r => r._portfolioDrain > 0);

  // ── Annotations (view-specific) ──────────────────────────────────────────
  const balanceAnnotations = useMemo(
    () => buildPhaseAnnotations(scenario, chartData),
    [scenario, chartData],
  );
  const driversAnnotations = useMemo(
    () => activeView === 'drivers' && waterfallData
      ? buildDriversAnnotations(scenario, waterfallData, projectionData)
      : null,
    [activeView, waterfallData, scenario, projectionData],
  );
  const annotations = activeView === 'balance' ? balanceAnnotations : (driversAnnotations ?? []);

  // ── Waterfall-specific flags ──────────────────────────────────────────────
  const waterfallInsight = useMemo(
    () => waterfallData
      ? buildWaterfallInsight(scenario, waterfallData, projectionData)
      : '',
    [waterfallData, scenario, projectionData],
  );
  const wfHasDebt      = waterfallData?.some(r => r._debtPaymentRaw > 0) ?? false;
  const wfHasMeltdown  = waterfallData?.some(r => r._meltdownTaxRaw > 0) ?? false;
  const wfHasSurplus   = waterfallData?.some(r => r._surplusRaw > 0)     ?? false;
  const wfHasShortfall = waterfallData?.some(r => r.isPostDepletion)     ?? false;

  // ── Shared milestone lines (rendered in both views) ────────────────────────
  const MilestoneLines = milestones.map(m => (
    <ReferenceLine
      key={m.label} x={m.age}
      stroke={m.color} strokeDasharray="6 4" strokeWidth={1.5}
      label={<MilestoneLabel label={m.label} color={m.color} level={m.level} />}
    />
  ));

  // ── Phase separator lines for waterfall ──────────────────────────────────
  const PhaseSeparators = activeView === 'drivers' ? [
    <ReferenceLine
      key="retire-sep" x={scenario.retirementAge}
      stroke={COLORS.gray[200]} strokeDasharray="2 3" strokeWidth={1}
      label={<PhaseLabel label="Retired" />}
    />,
    ...(depletionRow ? [
      <ReferenceLine
        key="deplete-sep" x={depletionRow.age}
        stroke={COLORS.danger} strokeDasharray="2 3" strokeWidth={1} opacity={0.4}
        label={<PhaseLabel label="Benefits only" />}
      />,
    ] : []),
  ] : [];

  return (
    <div className="card-base p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {activeView === 'balance' ? 'Total Portfolio Over Time' : "What's Driving the Change?"}
        </h3>

        {!forceView && (
          <div className="flex items-center gap-3">
            {/* No-debt toggle — balance view only */}
            {activeView === 'balance' && hasConsumerDebt && (
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showNoDebt}
                  onChange={e => setShowNoDebt(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-400"
                />
                Without consumer debt
              </label>
            )}

            {/* Segmented control — Balance / Drivers */}
            <div className="flex rounded-full border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
              {['balance', 'drivers'].map(view => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150',
                    activeView === view
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {view === 'balance' ? 'Balance' : 'Drivers'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Legend — below title, view-specific ──────────────────────────── */}
      {activeView === 'balance' && (
        <ChartLegend items={[
          { color: COLORS.sunset.main, label: 'Portfolio' },
          ...(hasDrain ? [{ color: '#6366f1', label: 'Annual gap funded by portfolio' }] : []),
          ...(showNoDebt && hasConsumerDebt ? [{ color: '#9ca3af', label: 'Without consumer debt' }] : []),
        ]} />
      )}
      {activeView === 'drivers' && waterfallData && (
        <WaterfallLegend
          hasDebt={wfHasDebt}
          hasMeltdown={wfHasMeltdown}
          hasSurplus={wfHasSurplus}
          hasShortfall={wfHasShortfall}
        />
      )}

      {/* ── Waterfall insight line ─────────────────────────────────────────── */}
      {activeView === 'drivers' && waterfallInsight && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-1.5 mb-3 italic">
          {waterfallInsight}
        </p>
      )}

      {/* ── Chart area with crossfade ──────────────────────────────────────── */}
      <div className="relative" style={{ height: chartHeight }}>

        {/* Balance view */}
        <div
          style={{
            position: 'absolute', inset: 0,
            opacity: activeView === 'balance' ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: activeView === 'balance' ? 'auto' : 'none',
            zIndex: activeView === 'balance' ? 1 : 0,
          }}
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={mergedData} margin={{ top: 46, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.sunset.main} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.sunset.main} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} vertical={false} />
              <XAxis
                dataKey="age"
                tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
                tickLine={false}
                axisLine={{ stroke: CHART_STYLE.gridColor }}
              />
              <YAxis
                tickFormatter={formatCurrencyShort}
                tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
                tickLine={false} axisLine={false} width={60}
              />
              <Tooltip content={<CustomTooltip />} />

              {MilestoneLines}
              <ReferenceLine y={0} stroke={COLORS.gray[500]} strokeDasharray="4 4" />

              {showNoDebt && noDebtData && (
                <Line
                  type="monotone" dataKey="noDebtPortfolio"
                  stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 4"
                  dot={false} activeDot={false}
                  name="Without consumer debt"
                />
              )}

              <Area
                type="monotone" dataKey="totalPortfolio"
                stroke={COLORS.sunset.main} strokeWidth={2}
                fill="url(#portfolioGradient)" dot={false}
                activeDot={{ r: 5, fill: COLORS.sunset.main }}
                name="Portfolio"
              />

              {hasDrain && (
                <Line
                  type="monotone" dataKey="_portfolioDrain"
                  stroke="#6366f1" strokeWidth={1.5} strokeDasharray="3 3"
                  dot={false} activeDot={{ r: 3, fill: '#6366f1' }}
                  name="Annual gap funded by portfolio"
                />
              )}

              {depletionRow && (
                <ReferenceDot x={depletionRow.age} y={0} r={6}
                  fill={COLORS.danger} stroke="#fff" strokeWidth={2} />
              )}
              <ReferenceDot
                x={lastRow.age} y={lastRow.totalPortfolio} r={6}
                fill={lastRow.totalPortfolio > 0 ? COLORS.forest.main : COLORS.danger}
                stroke="#fff" strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Drivers view — only mounted once waterfallData is ready */}
        <div
          style={{
            position: 'absolute', inset: 0,
            opacity: activeView === 'drivers' ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: activeView === 'drivers' ? 'auto' : 'none',
            zIndex: activeView === 'drivers' ? 1 : 0,
          }}
        >
          {waterfallData && (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={waterfallData} margin={{ top: 46, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} vertical={false} />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
                  tickLine={false}
                  axisLine={{ stroke: CHART_STYLE.gridColor }}
                />
                <YAxis
                  tickFormatter={formatCurrencyShort}
                  tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
                  tickLine={false} axisLine={false} width={65}
                />
                <Tooltip content={<WaterfallTooltip />} />

                {MilestoneLines}
                {PhaseSeparators}
                <ReferenceLine y={0} stroke={COLORS.gray[500]} strokeDasharray="4 4" />

                {/* Green stack: growth and salary surplus */}
                <Bar stackId="pos" dataKey="_growth"  fill={WATERFALL_COLORS.growth}  name="Growth"         maxBarSize={40} />
                <Bar stackId="pos" dataKey="_surplus" fill={WATERFALL_COLORS.surplus} name="Salary surplus"  maxBarSize={40} />

                {/* Red stack: negative values (displayed below x-axis) */}
                <Bar stackId="neg" dataKey="_expenseGap"  fill={WATERFALL_COLORS.expenseGap}  name="Expense gap"         maxBarSize={40} />
                <Bar stackId="neg" dataKey="_debtPayment" fill={WATERFALL_COLORS.debtPayment} name="Debt payments"        maxBarSize={40} />
                <Bar stackId="neg" dataKey="_taxDrain"    fill={WATERFALL_COLORS.taxDrain}    name="Tax"                  maxBarSize={40} />
                <Bar stackId="neg" dataKey="_meltdownTax" fill={WATERFALL_COLORS.meltdownTax} name="Meltdown tax leakage" maxBarSize={40} />
                <Bar stackId="neg" dataKey="_shortfall"   fill={WATERFALL_COLORS.shortfall}   name="Unfunded shortfall"   maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Phase annotation cards ─────────────────────────────────────────── */}
      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {annotations.map(a => <AnnotationCard key={a.phase} annotation={a} />)}
        </div>
      )}

      {/* ── Key assumptions ────────────────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Key Assumptions
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
          <span>Return: <strong className="text-gray-900">{(scenario.realReturn * 100).toFixed(1)}%</strong></span>
          <span>Inflation: <strong className="text-gray-900">{(scenario.inflationRate * 100).toFixed(1)}%</strong></span>
          <span>Expenses: <strong className="text-gray-900">${scenario.monthlyExpenses?.toLocaleString()}/mo</strong></span>
          <span>CPP: <strong className="text-gray-900">${scenario.cppMonthly}/mo @ {scenario.cppStartAge}</strong></span>
          <span>OAS: <strong className="text-gray-900">${scenario.oasMonthly}/mo @ {scenario.oasStartAge}</strong></span>
          {scenario.pensionType === 'db' && scenario.dbPensionAnnual > 0 && (
            <span>Pension: <strong className="text-gray-900">${scenario.dbPensionAnnual.toLocaleString()}/yr</strong></span>
          )}
          {scenario.rrspMeltdownEnabled && scenario.rrspMeltdownAnnual > 0 && (
            <span className="text-purple-600">
              RRSP meltdown: <strong>${scenario.rrspMeltdownAnnual.toLocaleString()}/yr (ages {scenario.rrspMeltdownStartAge ?? scenario.retirementAge}–{scenario.rrspMeltdownTargetAge})</strong>
            </span>
          )}
          {depletionRow && (
            <span className="text-red-600">Depleted at age <strong>{depletionRow.age}</strong></span>
          )}
        </div>
      </div>
    </div>
  );
}
