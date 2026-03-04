import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters';
import { WATERFALL_COLORS } from '../dashboard/waterfallChartHelpers';
import { CHART_STYLE } from '../../constants/designTokens';

/**
 * Compute single-year investment returns as the algebraic residual:
 *   returns = portfolioChange + withdrawals - deposits
 */
export function computeYearReturns(row, prevTotalPortfolio) {
  const portfolioChange = (row.totalPortfolio || 0) - (prevTotalPortfolio || 0);
  const W = (row.rrspWithdrawal || 0) + (row.tfsaWithdrawal || 0)
          + (row.nonRegWithdrawal || 0) + (row.otherWithdrawal || 0);
  const D = (row.tfsaDeposit || 0) + (row.nonRegDeposit || 0);
  return portfolioChange + W - D;
}

/** Initial portfolio from scenario fields. */
function scenarioStartPortfolio(s) {
  return (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0)
       + (s.liraBalance || 0) + (s.tfsaBalance || 0) + (s.nonRegInvestments || 0)
       + (s.cashSavings || 0) + (s.otherAssets || 0);
}

const BAR_COLORS = {
  start: '#3b82f6',
  returns: WATERFALL_COLORS.growth,
  deposits: '#7BC4A8',
  withdrawals: WATERFALL_COLORS.expenseGap,
  end: '#3b82f6',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-xs"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}>
      <p className="font-semibold text-gray-900">{d.label}</p>
      <p className="text-gray-600">{formatCurrency(d.displayValue)}</p>
    </div>
  );
}

/**
 * Portfolio Waterfall — shows starting portfolio, returns, deposits/withdrawals, ending portfolio.
 */
export default function PortfolioWaterfall({ projectionData, startAge, endAge, scenario }) {
  const bars = useMemo(() => {
    const phaseData = projectionData.filter(d => d.age >= startAge && d.age <= endAge);
    if (phaseData.length === 0) return [];

    const firstIdx = projectionData.indexOf(phaseData[0]);
    const prevPortfolio = firstIdx > 0
      ? projectionData[firstIdx - 1].totalPortfolio
      : scenarioStartPortfolio(scenario);

    const startPort = prevPortfolio;
    const endPort = phaseData[phaseData.length - 1]?.totalPortfolio || 0;

    let totalReturns = 0, totalDeposits = 0, totalWithdrawals = 0;
    let prevP = prevPortfolio;
    for (const row of phaseData) {
      totalReturns += computeYearReturns(row, prevP);
      totalDeposits += (row.tfsaDeposit || 0) + (row.nonRegDeposit || 0);
      totalWithdrawals += (row.rrspWithdrawal || 0) + (row.tfsaWithdrawal || 0)
                        + (row.nonRegWithdrawal || 0) + (row.otherWithdrawal || 0);
      prevP = row.totalPortfolio;
    }

    // Build waterfall: each bar = [invisible base, visible segment]
    const items = [];
    let running = 0;

    items.push({ label: 'Starting Portfolio', base: 0, value: startPort, color: BAR_COLORS.start, displayValue: startPort, labelText: formatCurrencyShort(startPort) });
    running = startPort;

    if (totalReturns !== 0) {
      const base = totalReturns >= 0 ? running : running + totalReturns;
      const sign = totalReturns >= 0 ? '+' : '';
      items.push({ label: 'Investment Returns', base, value: Math.abs(totalReturns), color: BAR_COLORS.returns, displayValue: totalReturns, labelText: `${sign}${formatCurrencyShort(totalReturns)}` });
      running += totalReturns;
    }

    if (totalDeposits > 0) {
      items.push({ label: 'New Deposits', base: running, value: totalDeposits, color: BAR_COLORS.deposits, displayValue: totalDeposits, labelText: `+${formatCurrencyShort(totalDeposits)}` });
      running += totalDeposits;
    }

    if (totalWithdrawals > 0) {
      items.push({ label: 'Withdrawals', base: running - totalWithdrawals, value: totalWithdrawals, color: BAR_COLORS.withdrawals, displayValue: -totalWithdrawals, labelText: `-${formatCurrencyShort(totalWithdrawals)}` });
      running -= totalWithdrawals;
    }

    items.push({ label: 'Ending Portfolio', base: 0, value: Math.max(0, endPort), color: BAR_COLORS.end, displayValue: endPort, labelText: formatCurrencyShort(endPort) });

    return items;
  }, [projectionData, startAge, endAge, scenario]);

  if (bars.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">Portfolio Waterfall</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={bars} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} />
          <YAxis tickFormatter={v => formatCurrencyShort(v)} tick={{ fontSize: 10, fill: '#6b7280' }} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="value" stackId="a" isAnimationActive={false} radius={[3, 3, 0, 0]}>
            {bars.map((b, i) => <Cell key={i} fill={b.color} />)}
            <LabelList dataKey="labelText" position="top" style={{ fontSize: 10, fill: '#374151', fontWeight: 500 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
