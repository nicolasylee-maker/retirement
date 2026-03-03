import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { CHART_COLORS, CHART_STYLE, COLORS } from '../../constants/designTokens';
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters';
import ChartLegend from '../../components/ChartLegend';
import { responsiveChartHeight } from '../../utils/responsiveChartHeight';

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg shadow-lg border border-gray-200 p-3 text-sm"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}
    >
      <p className="font-semibold text-gray-900 mb-1">Age {d.age} ({d.year})</p>
      {d.rrspWithdrawal > 0 && (
        <p className="text-orange-600">RRSP/RRIF: {formatCurrency(d.rrspWithdrawal)}</p>
      )}
      {d.tfsaWithdrawal > 0 && (
        <p className="text-green-600">TFSA: {formatCurrency(d.tfsaWithdrawal)}</p>
      )}
      {d.nonRegWithdrawal > 0 && (
        <p className="text-sky-600">Non-Reg: {formatCurrency(d.nonRegWithdrawal)}</p>
      )}
      {d.otherWithdrawal > 0 && (
        <p className="text-purple-600">Other: {formatCurrency(d.otherWithdrawal)}</p>
      )}
      {d.rrspWithdrawal + d.tfsaWithdrawal + d.nonRegWithdrawal + d.otherWithdrawal === 0 && (
        <p className="text-gray-500">No withdrawals this year</p>
      )}
    </div>
  );
}

export default function WithdrawalChart({ projectionData, scenario }) {
  if (!projectionData || projectionData.length === 0) return null;

  // Only show from retirement onward where there are withdrawals
  const data = projectionData.filter(
    r => r.age >= scenario.retirementAge - 2 &&
      (r.rrspWithdrawal > 0 || r.tfsaWithdrawal > 0 || r.nonRegWithdrawal > 0 || r.otherWithdrawal > 0 || r.age >= scenario.retirementAge),
  );

  if (data.length === 0) return null;

  const hasRrsp = data.some(r => r.rrspWithdrawal > 0);
  const hasTfsa = data.some(r => r.tfsaWithdrawal > 0);
  const hasNonReg = data.some(r => r.nonRegWithdrawal > 0);
  const hasOther = data.some(r => r.otherWithdrawal > 0);

  return (
    <div className="card-base p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Annual Withdrawals by Account
      </h3>
      <ChartLegend items={[
        ...(hasRrsp   ? [{ color: CHART_COLORS.rrsp,   label: 'RRSP/RRIF' }] : []),
        ...(hasTfsa   ? [{ color: CHART_COLORS.tfsa,   label: 'TFSA' }]      : []),
        ...(hasNonReg ? [{ color: CHART_COLORS.nonReg, label: 'Non-Reg' }]   : []),
        ...(hasOther  ? [{ color: CHART_COLORS.other,  label: 'Other' }]     : []),
      ]} />
      <ResponsiveContainer width="100%" height={responsiveChartHeight(window.innerWidth, 180, 280)}>
        <BarChart
          data={data}
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

          {/* RRIF convert reference line */}
          {scenario.rrspBalance > 0 && 72 >= scenario.currentAge && (
            <ReferenceLine x={72} stroke="#d97706" strokeDasharray="5 5"
              label={{ value: 'RRIF', position: 'top', fill: '#d97706', fontSize: 10 }} />
          )}

          {hasRrsp && (
            <Bar dataKey="rrspWithdrawal" name="RRSP/RRIF" stackId="w"
              fill={CHART_COLORS.rrsp} radius={[0, 0, 0, 0]} />
          )}
          {hasTfsa && (
            <Bar dataKey="tfsaWithdrawal" name="TFSA" stackId="w"
              fill={CHART_COLORS.tfsa} />
          )}
          {hasNonReg && (
            <Bar dataKey="nonRegWithdrawal" name="Non-Reg" stackId="w"
              fill={CHART_COLORS.nonReg} />
          )}
          {hasOther && (
            <Bar dataKey="otherWithdrawal" name="Other" stackId="w"
              fill={CHART_COLORS.other} />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Key assumptions legend */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Key Assumptions
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
          <span>
            Return: <strong className="text-gray-900">{(scenario.realReturn * 100).toFixed(1)}%</strong>
          </span>
          <span>
            Inflation: <strong className="text-gray-900">{(scenario.inflationRate * 100).toFixed(1)}%</strong>
          </span>
          <span>
            Expenses: <strong className="text-gray-900">${scenario.monthlyExpenses?.toLocaleString()}/mo</strong>
          </span>
          <span>
            CPP: <strong className="text-gray-900">${scenario.cppMonthly}/mo @ {scenario.cppStartAge}</strong>
          </span>
          <span>
            OAS: <strong className="text-gray-900">${scenario.oasMonthly}/mo @ {scenario.oasStartAge}</strong>
          </span>
          {scenario.pensionType === 'db' && scenario.dbPensionAnnual > 0 && (
            <span>
              Pension: <strong className="text-gray-900">${scenario.dbPensionAnnual.toLocaleString()}/yr</strong>
            </span>
          )}
          {scenario.rrspMeltdownEnabled && scenario.rrspMeltdownAnnual > 0 && (
            <span className="text-purple-600">
              RRSP meltdown: <strong>${scenario.rrspMeltdownAnnual.toLocaleString()}/yr</strong>
            </span>
          )}
          <span>
            Order: <strong className="text-gray-900">
              {(scenario.withdrawalOrder || ['tfsa', 'nonReg', 'rrsp', 'other'])
                .map(k => ({ tfsa: 'TFSA', nonReg: 'Non-Reg', rrsp: 'RRSP', other: 'Other' }[k]))
                .join(' → ')}
            </strong>
          </span>
        </div>
        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
          <p>Withdrawals increase over time because expenses grow with inflation while CPP/OAS stay flat in this model (conservative).</p>
          <p>After age 72, RRIF minimum withdrawal percentages rise (5.28% → 20%), forcing larger taxable withdrawals.</p>
          <p>When one account is depleted, the next in your withdrawal order takes over.</p>
        </div>
      </div>
    </div>
  );
}
