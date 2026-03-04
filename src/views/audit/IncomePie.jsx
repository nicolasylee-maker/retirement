import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { INCOME_COLORS, CHART_STYLE } from '../../constants/designTokens';
import { formatCurrency } from '../../utils/formatters';

const SOURCE_CONFIG = [
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
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg shadow-lg border border-gray-200 p-2 text-xs" style={{ backgroundColor: CHART_STYLE.tooltipBg }}>
      <p className="font-semibold" style={{ color: d.payload.color }}>{d.name}</p>
      <p className="text-gray-700">{formatCurrency(d.value)} ({((d.value / d.payload.total) * 100).toFixed(0)}%)</p>
    </div>
  );
}

const RADIAN = Math.PI / 180;
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) {
  if (percent < 0.05) return null;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      className="text-[10px] fill-gray-600">
      {name} {(percent * 100).toFixed(0)}%
    </text>
  );
}

/**
 * Pie chart of income sources at a given age.
 * @param {Object} row - Single projection year row
 * @param {number} [size=220]
 */
export default function IncomePie({ row, size = 220 }) {
  if (!row) return null;

  const total = SOURCE_CONFIG.reduce((s, c) => s + (row[c.key] || 0), 0);
  const data = SOURCE_CONFIG
    .filter(c => (row[c.key] || 0) > 0)
    .map(c => ({ name: c.label, value: row[c.key], color: c.color, total }));

  if (data.length === 0) return <p className="text-xs text-gray-400 text-center">No income this year</p>;

  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={size * 0.32}
          innerRadius={size * 0.18}
          dataKey="value"
          label={renderLabel}
          labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
