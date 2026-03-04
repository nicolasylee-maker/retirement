import React from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { INCOME_COLORS, CHART_STYLE, COLORS } from '../../constants/designTokens';
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters';
import ChartLegend from '../../components/ChartLegend';
import { responsiveChartHeight } from '../../utils/responsiveChartHeight';

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

  return (
    <div
      className="rounded-lg shadow-lg border border-gray-200 p-3 text-sm max-w-xs"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}
    >
      <p className="font-semibold text-gray-900 mb-1">
        Age {d.age} ({d.year})
      </p>
      <div className="space-y-0.5">
        {incomeItems.map(s => (
          <p key={s.key} style={{ color: s.color }}>
            {s.label}: {formatCurrency(d[s.key])}
          </p>
        ))}
      </div>
      <div className="mt-1 pt-1 border-t border-gray-100">
        <p className="text-gray-700 font-medium">
          Total income: {formatCurrency(totalIncome)}
        </p>
        <p className="text-red-600">
          Expenses: {formatCurrency(d.expenses)}
        </p>
        {d.debtPayments > 0 && (
          <p className="text-orange-600">
            Debt payments: {formatCurrency(d.debtPayments)}
          </p>
        )}
        <p className="text-gray-600">
          Tax: {formatCurrency(d.totalTax)}
        </p>
      </div>
    </div>
  );
}

export default function IncomeExpenseChart({ projectionData, scenario }) {
  if (!projectionData || projectionData.length === 0) return null;

  // Determine which income sources have non-zero values
  const activeSources = INCOME_SOURCES.filter(
    s => projectionData.some(r => (r[s.key] || 0) > 0),
  );
  const hasDebt = projectionData.some(r => (r.debtPayments || 0) > 0);

  if (activeSources.length === 0) return null;

  return (
    <div className="card-base p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Income vs Expenses Over Time
      </h3>
      <ChartLegend items={[
        ...activeSources.map(s => ({ color: s.color, label: s.label })),
        { color: INCOME_COLORS.expenses, label: 'Expenses' },
        ...(hasDebt ? [{ color: INCOME_COLORS.debtPayments, label: 'Debt Payments' }] : []),
      ]} />
      <p className="text-xs text-gray-500 mb-4">
        Stacked areas show where your money comes from each year; lines show where it goes.
        The gap between income and expenses is the portfolio drain (or surplus).
      </p>
      <ResponsiveContainer width="100%" height={responsiveChartHeight(window.innerWidth, 200, 320)}>
        <ComposedChart
          data={projectionData}
          margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_STYLE.gridColor}
            vertical={false}
          />
          <XAxis
            dataKey="age"
            tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
            tickLine={false}
            axisLine={{ stroke: CHART_STYLE.gridColor }}
          />
          <YAxis
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
            tickLine={false}
            axisLine={false}
            width={window.innerWidth < 640 ? 46 : 60}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Stacked income areas */}
          {activeSources.map(s => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId="income"
              fill={s.color}
              fillOpacity={0.7}
              stroke={s.color}
              strokeWidth={0}
              dot={false}
            />
          ))}

          {/* Expenses overlay line */}
          <Line
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke={INCOME_COLORS.expenses}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Debt payments overlay (dashed) */}
          {hasDebt && (
            <Line
              type="monotone"
              dataKey="debtPayments"
              name="Debt Payments"
              stroke={INCOME_COLORS.debtPayments}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
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
