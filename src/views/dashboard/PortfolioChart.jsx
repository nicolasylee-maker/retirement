import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import { COLORS, CHART_STYLE, CHART_COLORS } from '../../constants/designTokens';
import ChartLegend from '../../components/ChartLegend';
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters';
import { projectScenario } from '../../engines/projectionEngine';
import CustomTooltip from './PortfolioChartTooltip';
import { buildMilestones, buildPhaseAnnotations } from './portfolioChartHelpers';
import { responsiveChartHeight } from '../../utils/responsiveChartHeight';

// ---------------------------------------------------------------------------
// Account config for stacked-area "Accounts" view
// ---------------------------------------------------------------------------
const ACCOUNTS = [
  { key: 'rrspBalance', label: 'RRSP/RRIF', color: CHART_COLORS.rrsp },
  { key: 'tfsaBalance', label: 'TFSA', color: CHART_COLORS.tfsa },
  { key: 'nonRegBalance', label: 'Non-Registered', color: CHART_COLORS.nonReg },
  { key: 'otherBalance', label: 'Other', color: CHART_COLORS.other },
];

// ---------------------------------------------------------------------------
// Shared label components
// ---------------------------------------------------------------------------
const LABEL_DY = [-14, -28, -42];
const ACCT_LABELS = { tfsa: 'TFSA', nonReg: 'Non-reg', rrsp: 'RRSP', other: 'Other' };

function MilestoneLabel({ viewBox, label, color, level }) {
  const isMobile = window.innerWidth < 640;
  const hiddenOnMobile = ['RRIF convert', 'RRSP meltdown starts', 'RRSP empty'];
  if (isMobile && hiddenOnMobile.includes(label)) return null;
  const displayLabel = isMobile ? label.replace(' starts', '') : label;
  const { x, y } = viewBox;
  return (
    <text
      x={x} y={y + (LABEL_DY[Math.min(level, LABEL_DY.length - 1)] ?? -14)}
      fill={color} fontSize={10} fontWeight={600} textAnchor="middle"
    >
      {displayLabel}
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
      {a.line5 && <p className="text-indigo-600 mt-0.5 italic">{a.line5}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accounts-view tooltip
// ---------------------------------------------------------------------------
function AccountsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const total = ACCOUNTS.reduce((sum, a) => sum + (d[a.key] || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm min-w-[180px]">
      <p className="font-semibold text-gray-900 mb-1">Age {d.age}</p>
      {ACCOUNTS.map(({ key, label, color }) => (
        <p key={key} className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-gray-600">{label}:</span>
          <span className="font-medium text-gray-900">{formatCurrency(d[key])}</span>
        </p>
      ))}
      <div className="border-t border-gray-200 mt-1 pt-1">
        <p className="font-semibold text-gray-900">Total: {formatCurrency(total)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PortfolioChart({
  projectionData, scenario, forceView,
  chartHeight = responsiveChartHeight(window.innerWidth, 220, 360),
}) {
  if (!projectionData || projectionData.length === 0) return null;

  const [showNoDebt, setShowNoDebt] = useState(false);
  const [activeView, setActiveView] = useState(forceView || 'balance');
  const [assumptionsExpanded, setAssumptionsExpanded] = useState(false);
  const hasConsumerDebt = (scenario.consumerDebt || 0) + (scenario.otherDebt || 0) > 0;

  // ── Balance-view data ────────────────────────────────────────────────────
  const chartData = useMemo(() => projectionData.map(r => ({
    ...r,
    _portfolioDrain: Math.max(0,
      (r.rrspWithdrawal || 0) + (r.tfsaWithdrawal || 0)
      + (r.nonRegWithdrawal || 0) + (r.otherWithdrawal || 0)
      - (r.tfsaDeposit || 0) - (r.nonRegDeposit || 0)),
  })), [projectionData]);

  const noDebtData = useMemo(
    () => hasConsumerDebt ? projectScenario(scenario, { consumerDebt: 0, otherDebt: 0 }) : null,
    [scenario, hasConsumerDebt],
  );

  const mergedData = useMemo(() => {
    if (!noDebtData) return chartData;
    const map = new Map(noDebtData.map(r => [r.age, r.totalPortfolio]));
    return chartData.map(r => ({ ...r, noDebtPortfolio: map.get(r.age) ?? null }));
  }, [chartData, noDebtData]);

  // ── Shared chart infrastructure ──────────────────────────────────────────
  const lastRow = chartData[chartData.length - 1];
  const milestones = useMemo(() => buildMilestones(scenario, chartData), [scenario, chartData]);
  const depletionRow = chartData.find(r => r.totalPortfolio <= 0 && r.age > scenario.currentAge);
  const hasDrain = chartData.some(r => r._portfolioDrain > 0);
  const annotations = useMemo(() => buildPhaseAnnotations(scenario, chartData), [scenario, chartData]);

  const MilestoneLines = milestones.map(m => (
    <ReferenceLine
      key={m.label} x={m.age}
      stroke={m.color} strokeDasharray="6 4" strokeWidth={1.5}
      label={<MilestoneLabel label={m.label} color={m.color} level={m.level} />}
    />
  ));

  return (
    <div className="card-base p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {activeView === 'balance' ? 'Total Portfolio Over Time' : 'Portfolio by Account'}
        </h3>
        {!forceView && (
          <div className="flex items-center gap-3">
            {activeView === 'balance' && hasConsumerDebt && (
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={showNoDebt} onChange={e => setShowNoDebt(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-400" />
                Without consumer debt
              </label>
            )}
            <div className="flex rounded-full border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
              {['balance', 'accounts'].map(view => (
                <button key={view} type="button" onClick={() => setActiveView(view)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150',
                    activeView === view
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}>
                  {view === 'balance' ? 'Balance' : 'Accounts'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      {activeView === 'balance' ? (
        <ChartLegend items={[
          { color: COLORS.sunset.main, label: 'Portfolio' },
          ...(hasDrain ? [{ color: '#6366f1', label: 'Annual gap funded by portfolio' }] : []),
          ...(showNoDebt && hasConsumerDebt ? [{ color: '#9ca3af', label: 'Without consumer debt' }] : []),
        ]} />
      ) : (
        <ChartLegend items={[
          ...ACCOUNTS.map(a => ({ color: a.color, label: a.label })),
          { color: COLORS.gray[700], label: 'Total Portfolio', dashed: true },
        ]} />
      )}

      {/* ── Chart area with crossfade ──────────────────────────────────────── */}
      <div className="relative" style={{ height: chartHeight }}>
        {/* Balance view */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: activeView === 'balance' ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: activeView === 'balance' ? 'auto' : 'none',
          zIndex: activeView === 'balance' ? 1 : 0,
        }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={mergedData} margin={{ top: 46, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.sunset.main} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.sunset.main} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} vertical={false} />
              <XAxis dataKey="age" tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
                tickLine={false} axisLine={{ stroke: CHART_STYLE.gridColor }} />
              <YAxis tickFormatter={formatCurrencyShort}
                tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
                tickLine={false} axisLine={false} width={window.innerWidth < 640 ? 46 : 60} />
              {!forceView && <Tooltip content={<CustomTooltip scenario={scenario} />} />}
              {MilestoneLines}
              <ReferenceLine y={0} stroke={COLORS.gray[500]} strokeDasharray="4 4" />
              {showNoDebt && noDebtData && (
                <Line type="monotone" dataKey="noDebtPortfolio" stroke="#9ca3af" strokeWidth={1.5}
                  strokeDasharray="3 4" dot={false} activeDot={false} name="Without consumer debt" />
              )}
              <Area type="monotone" dataKey="totalPortfolio" stroke={COLORS.sunset.main} strokeWidth={2}
                fill="url(#portfolioGradient)" dot={false}
                activeDot={{ r: 5, fill: COLORS.sunset.main }} name="Portfolio" />
              {hasDrain && (
                <Line type="monotone" dataKey="_portfolioDrain" stroke="#6366f1" strokeWidth={1.5}
                  strokeDasharray="3 3" dot={false} activeDot={{ r: 3, fill: '#6366f1' }}
                  name="Annual gap funded by portfolio" />
              )}
              {depletionRow && (
                <ReferenceDot x={depletionRow.age} y={0} r={6}
                  fill={COLORS.danger} stroke="#fff" strokeWidth={2} />
              )}
              <ReferenceDot x={lastRow.age} y={lastRow.totalPortfolio} r={6}
                fill={lastRow.totalPortfolio > 0 ? COLORS.forest.main : COLORS.danger}
                stroke="#fff" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Accounts view */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: activeView === 'accounts' ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: activeView === 'accounts' ? 'auto' : 'none',
          zIndex: activeView === 'accounts' ? 1 : 0,
        }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={chartData} margin={{ top: 46, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} vertical={false} />
              <XAxis dataKey="age" tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
                tickLine={false} axisLine={{ stroke: CHART_STYLE.gridColor }} />
              <YAxis tickFormatter={formatCurrencyShort}
                tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
                tickLine={false} axisLine={false} width={window.innerWidth < 640 ? 46 : 60} />
              <Tooltip content={<AccountsTooltip />} />
              {MilestoneLines}
              {ACCOUNTS.map(({ key, label, color }) => (
                <Area key={key} type="monotone" dataKey={key} name={label} stackId="accounts"
                  stroke={color} fill={color} fillOpacity={0.6} dot={false} />
              ))}
              <Line type="monotone" dataKey="totalPortfolio" stroke={COLORS.gray[700]}
                strokeWidth={1.5} strokeDasharray="6 3" dot={false}
                activeDot={{ r: 3, fill: COLORS.gray[700] }} name="Total Portfolio" />
              {depletionRow && (
                <ReferenceDot x={depletionRow.age} y={0} r={6}
                  fill={COLORS.danger} stroke="#fff" strokeWidth={2} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Phase annotation cards ─────────────────────────────────────────── */}
      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {annotations.map(a => <AnnotationCard key={a.phase} annotation={a} />)}
        </div>
      )}

      {/* ── Key Assumptions ────────────────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Assumptions</p>
          <button type="button" onClick={() => setAssumptionsExpanded(e => !e)}
            className="text-xs text-purple-600 hover:text-purple-800 transition-colors">
            {assumptionsExpanded ? 'Collapse \u25B2' : 'See all \u25BC'}
          </button>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
          <span>Return: <strong className="text-gray-900">{(scenario.realReturn * 100).toFixed(1)}%</strong></span>
          <span>Inflation: <strong className="text-gray-900">{(scenario.inflationRate * 100).toFixed(1)}%</strong></span>
          <span>Expenses: <strong className="text-gray-900">${scenario.monthlyExpenses?.toLocaleString()}/mo</strong></span>
          <span>CPP: <strong className="text-gray-900">${scenario.cppMonthly?.toLocaleString()}/mo @ {scenario.cppStartAge}</strong></span>
          <span>OAS: <strong className="text-gray-900">${scenario.oasMonthly?.toLocaleString()}/mo @ {scenario.oasStartAge}</strong></span>
          {scenario.pensionType === 'db' && scenario.dbPensionAnnual > 0 && (
            <span>Pension: <strong className="text-gray-900">${scenario.dbPensionAnnual.toLocaleString()}/yr</strong></span>
          )}
          {scenario.rrspMeltdownEnabled && scenario.rrspMeltdownAnnual > 0 && (
            <span className="text-purple-600">
              RRSP meltdown: <strong>${scenario.rrspMeltdownAnnual.toLocaleString()}/yr (ages {scenario.rrspMeltdownStartAge ?? scenario.retirementAge}&ndash;{scenario.rrspMeltdownTargetAge})</strong>
            </span>
          )}
          {depletionRow && (
            <span className="text-red-600">Depleted at age <strong>{depletionRow.age}</strong></span>
          )}
          <span>Tax tables: <strong className="text-gray-900">2025 federal + provincial</strong></span>
        </div>

        {assumptionsExpanded && (
          <div className="mt-3 bg-indigo-50/70 border border-indigo-100 rounded-lg px-4 py-3 text-xs space-y-3">
            <div>
              <p className="font-semibold text-indigo-700 mb-1 uppercase tracking-wider">Your Inputs</p>
              <ul className="space-y-0.5 text-indigo-800">
                {scenario.stillWorking && (scenario.employmentIncome || 0) > 0 && (
                  <li>&bull; Salary: <strong>${(scenario.employmentIncome).toLocaleString()}/yr</strong> (grows with {(scenario.inflationRate * 100).toFixed(1)}% inflation until age {scenario.retirementAge})</li>
                )}
                <li>
                  &bull; Monthly expenses: <strong>${scenario.monthlyExpenses?.toLocaleString()}/mo</strong>
                  {(scenario.expenseReductionAtRetirement || 0) > 0 && (
                    <span> (drops {(scenario.expenseReductionAtRetirement * 100).toFixed(0)}% at retirement)</span>
                  )}
                </li>
                {(scenario.mortgageBalance || 0) > 0 && (
                  <li>&bull; Mortgage: <strong>${scenario.mortgageBalance.toLocaleString()}</strong> at <strong>{(scenario.mortgageRate * 100).toFixed(1)}%</strong>, paid off by age <strong>{scenario.currentAge + (scenario.mortgageYearsLeft || 0)}</strong></li>
                )}
                {(scenario.consumerDebt || 0) > 0 && (
                  <li>&bull; Consumer debt: <strong>${scenario.consumerDebt.toLocaleString()}</strong> at <strong>{(scenario.consumerDebtRate * 100).toFixed(1)}%</strong></li>
                )}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-indigo-700 mb-1 uppercase tracking-wider">Government Benefits</p>
              <ul className="space-y-0.5 text-indigo-800">
                <li>&bull; CPP: <strong>${scenario.cppMonthly}/mo</strong> starting at age <strong>{scenario.cppStartAge}</strong></li>
                <li>&bull; OAS: <strong>${scenario.oasMonthly}/mo</strong> starting at age <strong>{scenario.oasStartAge}</strong></li>
                <li>&bull; Both grow with inflation after they start</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-indigo-700 mb-1 uppercase tracking-wider">Investment Assumptions</p>
              <ul className="space-y-0.5 text-indigo-800">
                <li>&bull; Portfolio return: <strong>{(scenario.realReturn * 100).toFixed(1)}%</strong> (after inflation)</li>
                {scenario.tfsaReturn != null && scenario.tfsaReturn !== scenario.realReturn && (
                  <li>&bull; TFSA return: <strong>{(scenario.tfsaReturn * 100).toFixed(1)}%</strong></li>
                )}
                <li>&bull; Withdrawal order: <strong>{(scenario.withdrawalOrder || ['tfsa', 'nonReg', 'rrsp']).map(k => ACCT_LABELS[k] ?? k).join(' \u2192 ')}</strong></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-indigo-700 mb-1 uppercase tracking-wider">What's Not Included</p>
              <ul className="space-y-0.5 text-indigo-800">
                <li>&bull; No salary raises beyond inflation</li>
                <li>&bull; No part-time work in retirement</li>
                <li>&bull; No health care cost increases after 80</li>
                <li>&bull; House value stays flat (no appreciation)</li>
                <li>&bull; Tax brackets don't adjust for inflation</li>
                <li>&bull; No CPP survivor benefit (single filer)</li>
              </ul>
            </div>
            <button type="button" onClick={() => setAssumptionsExpanded(false)}
              className="text-purple-600 hover:text-purple-800 transition-colors">
              Collapse &#9650;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
