import React, { useMemo, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import { COLORS, CHART_STYLE } from '../../constants/designTokens';
import { formatCurrencyShort } from '../../utils/formatters';
import { projectScenario } from '../../engines/projectionEngine';
import CustomTooltip from './PortfolioChartTooltip';
import { buildMilestones, buildPhaseAnnotations } from './portfolioChartHelpers';

// dy offsets (px above chart top) for stagger levels 0 / 1 / 2
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

export default function PortfolioChart({ projectionData, scenario }) {
  if (!projectionData || projectionData.length === 0) return null;

  const [showNoDebt, setShowNoDebt] = useState(false);
  const hasConsumerDebt = (scenario.consumerDebt || 0) + (scenario.otherDebt || 0) > 0;

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

  const lastRow       = chartData[chartData.length - 1];
  const milestones    = useMemo(() => buildMilestones(scenario, chartData), [scenario, chartData]);
  const depletionRow  = chartData.find(r => r.totalPortfolio <= 0 && r.age > scenario.currentAge);
  const hasDrain      = chartData.some(r => r._portfolioDrain > 0);
  const annotations   = useMemo(() => buildPhaseAnnotations(scenario, chartData), [scenario, chartData]);

  return (
    <div className="card-base p-6">
      {/* Title + no-debt toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Total Portfolio Over Time</h3>
        {hasConsumerDebt && (
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showNoDebt}
              onChange={e => setShowNoDebt(e.target.checked)}
              className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-400"
            />
            Show without consumer debt
          </label>
        )}
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={360}>
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

            {/* Milestone reference lines — staggered labels */}
            {milestones.map(m => (
              <ReferenceLine
                key={m.label} x={m.age}
                stroke={m.color} strokeDasharray="6 4" strokeWidth={1.5}
                label={<MilestoneLabel label={m.label} color={m.color} level={m.level} />}
              />
            ))}

            <ReferenceLine y={0} stroke={COLORS.gray[500]} strokeDasharray="4 4" />

            {/* "Without consumer debt" reference line */}
            {showNoDebt && noDebtData && (
              <Line
                type="monotone" dataKey="noDebtPortfolio"
                stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 4"
                dot={false} activeDot={false}
                name="Without consumer debt" legendType="none"
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

      {/* Legend chips */}
      {(hasDrain || (showNoDebt && hasConsumerDebt)) && (
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
          {hasDrain && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 border-t-2 border-dotted border-indigo-400" />
              annual gap funded by portfolio
            </span>
          )}
          {showNoDebt && hasConsumerDebt && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 border-t-2 border-dotted border-gray-400" />
              without consumer debt
            </span>
          )}
        </div>
      )}

      {/* Phase annotation cards */}
      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {annotations.map(a => <AnnotationCard key={a.phase} annotation={a} />)}
        </div>
      )}

      {/* Key assumptions */}
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
