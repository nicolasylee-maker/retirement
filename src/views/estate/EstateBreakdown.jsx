import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { COLORS, CHART_STYLE } from '../../constants/designTokens';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters';

const TAX_COLORS = [COLORS.sunset.main, COLORS.lake.main, COLORS.gray[500]];

function TaxCompositionChart({ estateResult }) {
  const { capitalGainsTax, probateFees, totalEstateTax } = estateResult;
  if (totalEstateTax <= 0) return null;

  const deemedIncomeTax = Math.max(0, capitalGainsTax);
  const data = [
    { name: 'Deemed Income Tax', value: deemedIncomeTax },
    { name: 'Probate Fees', value: probateFees },
  ].filter(d => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Tax Composition</h4>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[500] }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: CHART_STYLE.fontSize, fill: COLORS.gray[700] }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: CHART_STYLE.tooltipBg,
              borderRadius: 8,
              fontSize: CHART_STYLE.fontSize,
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={TAX_COLORS[idx]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function EstateBreakdown({ estateResult }) {
  if (!estateResult) return null;

  const { breakdown } = estateResult;

  return (
    <div className="card-base p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Estate Breakdown
      </h3>

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 text-left text-sm font-semibold text-gray-700">Item</th>
            <th className="py-2 text-right text-sm font-semibold text-gray-700">Amount</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row, idx) => {
            if (row.label === '---') {
              return (
                <tr key={idx}>
                  <td colSpan={2} className="py-1">
                    <hr className="border-gray-200" />
                  </td>
                </tr>
              );
            }

            const isNegative = row.amount < 0;
            const isTotal = row.label === 'Gross estate' || row.label === 'Net to heirs';

            return (
              <tr key={idx} className="border-t border-gray-50">
                <td className={`py-2 text-sm ${isTotal ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {row.label}
                </td>
                <td className={`py-2 text-sm text-right tabular-nums
                  ${isTotal ? 'font-semibold text-gray-900' : ''}
                  ${isNegative ? 'text-red-500' : ''}`}
                >
                  {row.amount === 0 && !isTotal ? '--' : formatCurrency(row.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <TaxCompositionChart estateResult={estateResult} />
    </div>
  );
}
