import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { INCOME_COLORS, CHART_STYLE } from '../../constants/designTokens';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters';
import ChartLegend from '../../components/ChartLegend';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div
      className="rounded-lg shadow-lg border border-gray-200 p-3 text-xs max-w-xs"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}
    >
      <p className="font-semibold text-gray-900 mb-1">Age {d.age} ({d.year})</p>
      {d.employmentIncome > 0 && <p style={{ color: INCOME_COLORS.employment }}>Employment: {formatCurrency(d.employmentIncome)}</p>}
      {d.cppIncome > 0 && <p style={{ color: INCOME_COLORS.cpp }}>CPP: {formatCurrency(d.cppIncome)}</p>}
      {d.oasIncome > 0 && <p style={{ color: INCOME_COLORS.oas }}>OAS: {formatCurrency(d.oasIncome)}</p>}
      {d.pensionIncome > 0 && <p style={{ color: INCOME_COLORS.pension }}>Pension: {formatCurrency(d.pensionIncome)}</p>}
      {d.rrspWithdrawal > 0 && <p style={{ color: INCOME_COLORS.rrspWithdrawal }}>RRSP/RRIF: {formatCurrency(d.rrspWithdrawal)}</p>}
      {d.tfsaWithdrawal > 0 && <p style={{ color: INCOME_COLORS.tfsaWithdrawal }}>TFSA: {formatCurrency(d.tfsaWithdrawal)}</p>}
      {d.nonRegWithdrawal > 0 && <p style={{ color: INCOME_COLORS.nonRegWithdrawal }}>Non-Reg: {formatCurrency(d.nonRegWithdrawal)}</p>}
      <div className="mt-1 pt-1 border-t border-gray-100">
        <p className="text-red-600">Expenses: {formatCurrency(d.negExpenses ? -d.negExpenses : d.expenses)}</p>
        <p className="text-amber-600">Tax: {formatCurrency(d.negTax ? -d.negTax : d.totalTax)}</p>
        {d.debtPayments > 0 && <p className="text-orange-600">Debt: {formatCurrency(d.negDebt ? -d.negDebt : d.debtPayments)}</p>}
      </div>
    </div>
  );
}

/**
 * Stacked bar chart — income above axis, expenses+tax below.
 * @param {Array} data - Projection data rows (filtered to phase)
 * @param {number} [height=280]
 */
export default function IncomeExpenseBar({ data, height = 280 }) {
  if (!data?.length) return null;

  const chartData = data.map(d => ({
    ...d,
    negExpenses: -(d.expenses || 0),
    negTax: -(d.totalTax || 0),
    negDebt: -(d.debtPayments || 0),
  }));

  const legend = [
    { color: INCOME_COLORS.employment, label: 'Employment' },
    { color: INCOME_COLORS.cpp, label: 'CPP' },
    { color: INCOME_COLORS.oas, label: 'OAS' },
    { color: INCOME_COLORS.rrspWithdrawal, label: 'RRSP/RRIF' },
    { color: INCOME_COLORS.tfsaWithdrawal, label: 'TFSA' },
    { color: '#ef4444', label: 'Expenses' },
    { color: '#f59e0b', label: 'Tax' },
  ];

  return (
    <div>
      <ChartLegend items={legend} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} stackOffset="sign" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#9ca3af" />
          {/* Income (positive) */}
          <Bar dataKey="employmentIncome" stackId="stack" fill={INCOME_COLORS.employment} />
          <Bar dataKey="cppIncome" stackId="stack" fill={INCOME_COLORS.cpp} />
          <Bar dataKey="oasIncome" stackId="stack" fill={INCOME_COLORS.oas} />
          <Bar dataKey="pensionIncome" stackId="stack" fill={INCOME_COLORS.pension} />
          <Bar dataKey="rrspWithdrawal" stackId="stack" fill={INCOME_COLORS.rrspWithdrawal} />
          <Bar dataKey="tfsaWithdrawal" stackId="stack" fill={INCOME_COLORS.tfsaWithdrawal} />
          <Bar dataKey="nonRegWithdrawal" stackId="stack" fill={INCOME_COLORS.nonRegWithdrawal} />
          {/* Expenses (negative) */}
          <Bar dataKey="negExpenses" stackId="stack" fill="#ef4444" />
          <Bar dataKey="negTax" stackId="stack" fill="#f59e0b" />
          <Bar dataKey="negDebt" stackId="stack" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
