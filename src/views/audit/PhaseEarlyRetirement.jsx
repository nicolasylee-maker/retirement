import React, { useState, useMemo, useRef, useEffect } from 'react';
import SankeyDiagram, { buildSankeyData } from './SankeyDiagram';
import IncomeExpenseBar from './IncomeExpenseBar';
import IncomePie from './IncomePie';
import MathCard, { MathRow } from './MathCard';
import { formatCurrency, formatPercent } from '../../utils/formatters';

/**
 * Page 3: Early Retirement — retirementAge to 71.
 */
export default function PhaseEarlyRetirement({ scenario, projectionData }) {
  const s = scenario;
  const endAge = Math.min(71, s.lifeExpectancy);
  const startAge = s.retirementAge;
  const data = useMemo(
    () => projectionData.filter(d => d.age >= startAge && d.age <= endAge),
    [projectionData, startAge, endAge],
  );

  const defaultAge = Math.max(startAge, s.cppStartAge || 65);
  const [selectedAge, setSelectedAge] = useState(defaultAge);
  const row = data.find(d => d.age === selectedAge) || data[0];
  const containerRef = useRef(null);
  const [chartW, setChartW] = useState(480);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setChartW(Math.min(e.contentRect.width, 560));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const sankey = useMemo(() => row ? buildSankeyData(row, s) : { nodes: [], links: [] }, [row, s]);

  if (!data.length) return <p className="text-sm text-gray-500 p-4">No early retirement years (retirement age ≥ 72).</p>;

  // Government benefits coverage
  const govTotal = data.reduce((s, d) => s + (d.cppIncome || 0) + (d.oasIncome || 0) + (d.pensionIncome || 0), 0);
  const expTotal = data.reduce((s, d) => s + (d.expenses || 0), 0);
  const govCover = expTotal > 0 ? (govTotal / expTotal * 100) : 0;

  // KPI computations
  const totalSurplus = data.reduce((sum, d) => sum + (d.surplus || 0), 0);
  const avgSurplus = data.length > 0 ? totalSurplus / data.length : 0;
  const isSurplus = avgSurplus >= 0;
  const portfolioStart = data[0]?.totalPortfolio || 0;
  const portfolioEnd = data[data.length - 1]?.totalPortfolio || 0;
  const portfolioChange = portfolioEnd - portfolioStart;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          Early Retirement <span className="text-sm font-normal text-gray-500">Age {startAge} – {endAge}</span>
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Age:</label>
          <select
            value={selectedAge}
            onChange={e => setSelectedAge(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1"
          >
            {data.map(d => <option key={d.age} value={d.age}>{d.age}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3" ref={containerRef}>
          <p className="text-xs text-gray-500 mb-1">Money flow at age {selectedAge}</p>
          <SankeyDiagram nodes={sankey.nodes} links={sankey.links} width={chartW} height={300} />
        </div>
        <div className="lg:col-span-2 space-y-3">
          {(row?.cppIncome || 0) > 0 && (
            <MathCard title="CPP Benefit" summary={`${formatCurrency(row.cppIncome)}/yr starting age ${s.cppStartAge || 65}`} icon="🇨🇦">
              <MathRow label="Monthly at 65" value={formatCurrency(s.cppMonthly || 0)} />
              <MathRow label="Start age" value={`${s.cppStartAge || 65}`} />
              {(s.cppStartAge || 65) < 65 && <MathRow label="Early penalty" value={`${((65 - (s.cppStartAge || 65)) * 12 * 0.6).toFixed(1)}%`} color="#ef4444" />}
              {(s.cppStartAge || 65) > 65 && <MathRow label="Late bonus" value={`+${(((s.cppStartAge || 65) - 65) * 12 * 0.7).toFixed(1)}%`} color="#22c55e" />}
              <MathRow label="Annual (inflation-adjusted)" value={formatCurrency(row.cppIncome)} bold />
            </MathCard>
          )}

          {(row?.oasIncome || 0) > 0 && (
            <MathCard title="OAS Benefit" summary={`${formatCurrency(row.oasIncome)}/yr${row.oasClawback > 0 ? ' (after clawback)' : ''}`} icon="🍁">
              <MathRow label="Monthly at 65" value={formatCurrency(s.oasMonthly || 0)} />
              <MathRow label="Start age" value={`${s.oasStartAge || 65}`} />
              {(s.oasStartAge || 65) > 65 && <MathRow label="Deferral bonus" value={`+${(((s.oasStartAge || 65) - 65) * 12 * 0.6).toFixed(1)}%`} color="#22c55e" />}
              {row.oasClawback > 0 && <MathRow label="Clawback" value={formatCurrency(-row.oasClawback)} color="#ef4444" />}
              <MathRow label="Net OAS received" value={formatCurrency(row.oasIncome)} bold />
            </MathCard>
          )}

          <MathCard title="Withdrawal Strategy" summary={`Drawing from savings to cover the gap`} icon="💰">
            <MathRow label="After-tax income" value={formatCurrency(row?.afterTaxIncome || 0)} />
            <MathRow label="Less expenses" value={formatCurrency(-(row?.expenses || 0))} color="#ef4444" />
            <MathRow label="Gap / Surplus" value={formatCurrency(row?.surplus || 0)} bold />
            {(row?.tfsaWithdrawal || 0) > 0 && <MathRow label="TFSA withdrawal" value={formatCurrency(row.tfsaWithdrawal)} color="#22c55e" />}
            {(row?.nonRegWithdrawal || 0) > 0 && <MathRow label="Non-Reg withdrawal" value={formatCurrency(row.nonRegWithdrawal)} color="#0ea5e9" />}
            {(row?.rrspWithdrawal || 0) > 0 && <MathRow label="RRSP withdrawal" value={formatCurrency(row.rrspWithdrawal)} color="#f97316" />}
          </MathCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Income Sources at Age {selectedAge}</p>
          <IncomePie row={row} size={220} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Income vs Expenses</p>
          <IncomeExpenseBar data={data} height={220} lineData={{ key: 'totalPortfolio', label: 'Portfolio Balance', color: '#4ade80' }} />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">{isSurplus ? 'Avg Annual Surplus' : 'Avg Annual Drawdown'}</p>
          <p className={`text-lg font-bold ${isSurplus ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(Math.abs(avgSurplus))}/yr
          </p>
          <p className="text-xs text-gray-500">{isSurplus ? 'Saved per year' : 'Drawn from savings'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Portfolio Change</p>
          <p className={`text-lg font-bold ${portfolioChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {portfolioChange >= 0 ? '+' : ''}{formatCurrency(portfolioChange)}
          </p>
          <p className="text-xs text-gray-500">{formatCurrency(portfolioStart)} → {formatCurrency(portfolioEnd)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Benefits Coverage</p>
          <p className={`text-lg font-bold ${govCover >= 100 ? 'text-green-700' : 'text-amber-700'}`}>
            {govCover.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500">of expenses covered by CPP+OAS+pension</p>
        </div>
      </div>

      {govCover > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <strong>Key Insight:</strong> Government benefits (CPP + OAS + pension) cover {govCover.toFixed(0)}% of your expenses.
          {govCover < 100
            ? ` TFSA and other withdrawals fill the ${(100 - govCover).toFixed(0)}% gap tax-efficiently.`
            : ' You may not need to draw down savings at all!'}
        </div>
      )}
    </div>
  );
}
