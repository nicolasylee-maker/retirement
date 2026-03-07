import React, { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { INCOME_COLORS, CHART_STYLE, COLORS } from '../../constants/designTokens';
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters';
import ChartLegend from '../../components/ChartLegend';
import { responsiveChartHeight } from '../../utils/responsiveChartHeight';

const TAX_COLOR = '#C4884D';

const INCOME_SOURCES = [
  { key: 'employmentIncome', label: 'Employment', color: INCOME_COLORS.employment },
  { key: 'cppIncome', label: 'CPP', color: INCOME_COLORS.cpp },
  { key: 'oasIncome', label: 'OAS', color: INCOME_COLORS.oas },
  { key: 'gisIncome', label: 'GIS', color: INCOME_COLORS.gis },
  { key: 'gainsIncome', label: 'GAINS', color: INCOME_COLORS.gains },
  { key: 'pensionIncome', label: 'Pension', color: INCOME_COLORS.pension },
  { key: 'rrspWithdrawal', label: 'RRSP/RRIF', color: INCOME_COLORS.rrspWithdrawal },
  { key: 'tfsaWithdrawal', label: 'TFSA', color: INCOME_COLORS.tfsaWithdrawal },
  { key: 'nonRegWithdrawal', label: 'Non-Reg', color: INCOME_COLORS.nonRegWithdrawal },
  { key: 'otherWithdrawal', label: 'Other', color: INCOME_COLORS.otherWithdrawal },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const incomeItems = INCOME_SOURCES.filter(s => (d[s.key] || 0) > 0);
  const totalIncome = incomeItems.reduce((sum, s) => sum + (d[s.key] || 0), 0);
  const totalOutflow = Math.abs(d._expenses || 0) + Math.abs(d._tax || 0) + Math.abs(d._debt || 0);

  return (
    <div className="rounded-lg shadow-lg border border-gray-200 p-3 text-sm max-w-xs"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}>
      <p className="font-semibold text-gray-900 mb-1">Age {d.age} ({d.year})</p>
      <div className="space-y-0.5">
        {incomeItems.map(s => (
          <p key={s.key} style={{ color: s.color }}>{s.label}: {formatCurrency(d[s.key])}</p>
        ))}
      </div>
      <p className="text-gray-700 font-medium mt-1">Total income: {formatCurrency(totalIncome)}</p>
      <div className="mt-1 pt-1 border-t border-gray-100 space-y-0.5">
        <p style={{ color: INCOME_COLORS.expenses }}>Expenses: {formatCurrency(Math.abs(d._expenses || 0))}</p>
        <p style={{ color: TAX_COLOR }}>Tax: {formatCurrency(Math.abs(d._tax || 0))}</p>
        {(d._debt || 0) < 0 && (
          <p style={{ color: INCOME_COLORS.debtPayments }}>Debt: {formatCurrency(Math.abs(d._debt))}</p>
        )}
        <p className="text-gray-700 font-medium">Total outflow: {formatCurrency(totalOutflow)}</p>
      </div>
      <div className="mt-1 pt-1 border-t border-gray-100">
        <p className={totalIncome - totalOutflow >= 0 ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
          Net: {formatCurrency(totalIncome - totalOutflow)}
        </p>
        <p className="text-gray-500">Portfolio: {formatCurrency(d.totalPortfolio)}</p>
      </div>
    </div>
  );
}

export default function IncomeExpenseChart({ projectionData, scenario }) {
  if (!projectionData || projectionData.length === 0) return null;

  const activeSources = INCOME_SOURCES.filter(
    s => projectionData.some(r => (r[s.key] || 0) > 0),
  );
  const hasDebt = projectionData.some(r => (r.debtPayments || 0) > 0);

  if (activeSources.length === 0) return null;

  const chartData = useMemo(() => projectionData.map(r => ({
    ...r,
    _expenses: -(r.expenses || 0),
    _tax: -(r.totalTax || 0),
    _debt: hasDebt ? -(r.debtPayments || 0) : 0,
  })), [projectionData, hasDebt]);

  const portfolioMax = Math.max(...projectionData.map(r => r.totalPortfolio || 0));

  return (
    <div className="card-base p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Income vs Expenses Over Time
      </h3>
      <ChartLegend items={[
        ...activeSources.map(s => ({ color: s.color, label: s.label })),
        { color: INCOME_COLORS.expenses, label: 'Expenses' },
        { color: TAX_COLOR, label: 'Tax' },
        ...(hasDebt ? [{ color: INCOME_COLORS.debtPayments, label: 'Debt Payments' }] : []),
        { color: COLORS.gray[500], label: 'Portfolio', dashed: true },
      ]} />
      <p className="text-xs text-gray-500 mb-4">
        Bars show income (above) and costs (below); line shows portfolio value.
      </p>
      <ResponsiveContainer width="100%" height={responsiveChartHeight(window.innerWidth, 280, 320)}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} vertical={false} />
          <XAxis dataKey="age" tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
            tickLine={false} axisLine={{ stroke: CHART_STYLE.gridColor }} />
          <YAxis yAxisId="left" tickFormatter={formatCurrencyShort}
            tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
            tickLine={false} axisLine={false} width={window.innerWidth < 640 ? 46 : 60} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrencyShort}
            tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[400] }}
            tickLine={false} axisLine={false} width={window.innerWidth < 640 ? 46 : 60}
            domain={[0, portfolioMax * 1.1]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine yAxisId="left" y={0} stroke={COLORS.gray[400]} strokeWidth={1} />

          {/* Income bars (positive, above zero) */}
          {activeSources.map(s => (
            <Bar key={s.key} yAxisId="left" dataKey={s.key} name={s.label} stackId="income"
              fill={s.color} fillOpacity={0.85} maxBarSize={40} />
          ))}

          {/* Outflow bars (negative, below zero) */}
          <Bar yAxisId="left" dataKey="_expenses" name="Expenses" stackId="outflow"
            fill={INCOME_COLORS.expenses} fillOpacity={0.85} maxBarSize={40} />
          <Bar yAxisId="left" dataKey="_tax" name="Tax" stackId="outflow"
            fill={TAX_COLOR} fillOpacity={0.85} maxBarSize={40} />
          {hasDebt && (
            <Bar yAxisId="left" dataKey="_debt" name="Debt Payments" stackId="outflow"
              fill={INCOME_COLORS.debtPayments} fillOpacity={0.85} maxBarSize={40} />
          )}

          {/* Portfolio line on right axis */}
          <Line yAxisId="right" type="monotone" dataKey="totalPortfolio" name="Portfolio"
            stroke={COLORS.gray[500]} strokeWidth={1.5} strokeDasharray="6 3"
            dot={false} activeDot={{ r: 3, fill: COLORS.gray[500] }} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Key assumptions */}
      {scenario && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Key Assumptions
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
            <span>Return: <strong className="text-gray-900">{(scenario.realReturn * 100).toFixed(1)}%</strong></span>
            <span>Inflation: <strong className="text-gray-900">{(scenario.inflationRate * 100).toFixed(1)}%</strong></span>
            <span>Expenses: <strong className="text-gray-900">${scenario.monthlyExpenses?.toLocaleString()}/mo</strong></span>
            <span>CPP: <strong className="text-gray-900">${scenario.cppMonthly?.toLocaleString()}/mo @ {scenario.cppStartAge}</strong></span>
            <span>OAS: <strong className="text-gray-900">${scenario.oasMonthly?.toLocaleString()}/mo @ {scenario.oasStartAge}</strong></span>
            {scenario.pensionType === 'db' && scenario.dbPensionAnnual > 0 && (
              <span>Pension: <strong className="text-gray-900">${scenario.dbPensionAnnual.toLocaleString()}/yr</strong></span>
            )}
            <span>Tax tables: <strong className="text-gray-900">2025 federal + provincial</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
