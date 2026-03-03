import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SCENARIO_COLORS, CHART_STYLE, COLORS } from '../../constants/designTokens';
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters';
import ChartLegend from '../../components/ChartLegend';
import { responsiveChartHeight } from '../../utils/responsiveChartHeight';

function buildChartData(projections) {
  const ageMap = new Map();

  projections.forEach((proj, idx) => {
    for (const row of proj) {
      if (!ageMap.has(row.age)) {
        ageMap.set(row.age, { age: row.age });
      }
      ageMap.get(row.age)[`scenario${idx}`] = row.totalPortfolio;
    }
  });

  return Array.from(ageMap.values()).sort((a, b) => a.age - b.age);
}

function CustomTooltip({ active, payload, scenarioNames }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div
      className="rounded-lg shadow-lg border border-gray-200 p-3 text-sm"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}
    >
      <p className="font-semibold text-gray-900 mb-1">Age {d.age}</p>
      {scenarioNames.map((name, idx) => {
        const value = d[`scenario${idx}`];
        if (value == null) return null;
        return (
          <p key={idx} className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: SCENARIO_COLORS[idx] }}
            />
            <span className="text-gray-600">{name}:</span>
            <span className="font-medium">{formatCurrency(value)}</span>
          </p>
        );
      })}
    </div>
  );
}

export default function CompareChart({ projections, scenarioNames, colors }) {
  if (!projections || projections.length === 0) return null;

  const chartData = buildChartData(projections);
  const lineColors = colors || SCENARIO_COLORS;

  return (
    <div className="card-base p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Portfolio Comparison
      </h3>
      <ChartLegend items={scenarioNames.map((label, idx) => ({ color: lineColors[idx], label }))} />
      <ResponsiveContainer width="100%" height={responsiveChartHeight(window.innerWidth, 240, 400)}>
        <LineChart
          data={chartData}
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
          <Tooltip content={<CustomTooltip scenarioNames={scenarioNames} />} />

          {scenarioNames.map((name, idx) => (
            <Line
              key={idx}
              type="monotone"
              dataKey={`scenario${idx}`}
              name={name}
              stroke={lineColors[idx]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
