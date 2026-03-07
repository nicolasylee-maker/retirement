import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, CHART_STYLE, COLORS } from '../../constants/designTokens';
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters';
import ChartLegend from '../../components/ChartLegend';
import { responsiveChartHeight } from '../../utils/responsiveChartHeight';

const ACCOUNTS = [
  { key: 'rrspBalance', label: 'RRSP/RRIF', color: CHART_COLORS.rrsp },
  { key: 'tfsaBalance', label: 'TFSA', color: CHART_COLORS.tfsa },
  { key: 'nonRegBalance', label: 'Non-Registered', color: CHART_COLORS.nonReg },
  { key: 'otherBalance', label: 'Other', color: CHART_COLORS.other },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div
      className="rounded-lg shadow-lg border border-gray-200 p-3 text-sm"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}
    >
      <p className="font-semibold text-gray-900 mb-1">Age {d.age}</p>
      {ACCOUNTS.map(({ key, label, color }) => (
        <p key={key} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-gray-600">{label}:</span>
          <span className="font-medium text-gray-900">{formatCurrency(d[key])}</span>
        </p>
      ))}
    </div>
  );
}

export default function AccountChart({ projectionData, scenario }) {
  if (!projectionData || projectionData.length === 0) return null;

  return (
    <div className="card-base p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Account Balances
      </h3>
      <ChartLegend items={ACCOUNTS.map(({ color, label }) => ({ color, label }))} />
      <ResponsiveContainer width="100%" height={responsiveChartHeight(window.innerWidth, 280, 320)}>
        <AreaChart
          data={projectionData}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
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

          {ACCOUNTS.map(({ key, label, color }) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stackId="accounts"
              stroke={color}
              fill={color}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
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
            <span>
              Order: <strong className="text-gray-900">
                {(scenario.withdrawalOrder || ['tfsa', 'nonReg', 'rrsp', 'other'])
                  .map(k => ({ tfsa: 'TFSA', nonReg: 'Non-Reg', rrsp: 'RRSP', other: 'Other' }[k]))
                  .join(' → ')}
              </strong>
            </span>
            <span>Tax tables: <strong className="text-gray-900">2025 federal + provincial</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
