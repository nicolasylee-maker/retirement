import React, { useState, useMemo, useRef, useEffect } from 'react';
import SankeyDiagram, { buildSankeyData } from './SankeyDiagram';
import IncomeExpenseBar from './IncomeExpenseBar';
import PortfolioWaterfall, { computeYearReturns } from './PortfolioWaterfall';
import MathCard, { MathRow } from './MathCard';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { toTodaysDollars } from '../../utils/inflationHelper';
import { RRIF_MIN_RATES } from '../../constants/taxTables';

const SUB_BANDS = [
  { label: 'Early (72–79)', min: 72, max: 79 },
  { label: 'Mid (80–85)', min: 80, max: 85 },
  { label: 'Late (86+)', min: 86, max: 120 },
];

function SubPhaseTable({ data }) {
  const bands = SUB_BANDS.map(b => {
    const rows = data.filter(d => d.age >= b.min && d.age <= b.max);
    if (rows.length === 0) return null;
    const avgRate = rows.reduce((s, d) => s + (RRIF_MIN_RATES[d.age] || 0.20), 0) / rows.length;
    const avgWd = rows.reduce((s, d) => s + (d.rrspWithdrawal || 0), 0) / rows.length;
    const portStart = rows[0]?.totalPortfolio || 0;
    const portEnd = rows[rows.length - 1]?.totalPortfolio || 0;
    return { ...b, avgRate, avgWd, portStart, portEnd };
  }).filter(Boolean);

  if (bands.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">RRIF Acceleration by Sub-Phase</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-3 py-2 text-left font-medium">Band</th>
              <th className="px-3 py-2 text-right font-medium">Avg RRIF Rate</th>
              <th className="px-3 py-2 text-right font-medium">Avg Withdrawal/yr</th>
              <th className="px-3 py-2 text-right font-medium">Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {bands.map(b => (
              <tr key={b.label} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-700">{b.label}</td>
                <td className="px-3 py-2 text-right text-gray-600">{formatPercent(b.avgRate)}</td>
                <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(b.avgWd)}</td>
                <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(b.portStart)} → {formatCurrency(b.portEnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Page 4: Age 72+ — RRIF mandatory withdrawals phase.
 */
export default function PhaseRRIF({ scenario, projectionData }) {
  const s = scenario;
  const data = useMemo(
    () => projectionData.filter(d => d.age >= 72),
    [projectionData],
  );

  const [selectedAge, setSelectedAge] = useState(72);
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

  // Sankey returns annotation
  const yearReturns = useMemo(() => {
    if (!row) return 0;
    const idx = projectionData.indexOf(row);
    const prevPort = idx > 0 ? projectionData[idx - 1].totalPortfolio : null;
    const fallback = (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0)
      + (s.liraBalance || 0) + (s.tfsaBalance || 0) + (s.nonRegInvestments || 0)
      + (s.cashSavings || 0) + (s.otherAssets || 0);
    return computeYearReturns(row, prevPort ?? fallback);
  }, [row, projectionData, s]);

  // Today's dollars helper
  const td = (val, age) => toTodaysDollars(val, age - s.currentAge, s.inflationRate || 0);

  if (!data.length) return <p className="text-sm text-gray-500 p-4">Life expectancy is before age 72.</p>;

  // OAS clawback years
  const clawbackYears = data.filter(d => (d.oasClawback || 0) > 0);
  const totalClawback = clawbackYears.reduce((s, d) => s + (d.oasClawback || 0), 0);

  // RRIF rate for selected age
  const rrifRate = RRIF_MIN_RATES[selectedAge] || (selectedAge <= 70 ? 1 / (90 - selectedAge) : 0.20);

  // KPI computations — use portfolio change (surplus is zeroed by engine)
  const portfolioStart = data[0]?.totalPortfolio || 0;
  const portfolioEnd = data[data.length - 1]?.totalPortfolio || 0;
  const portfolioChange = portfolioEnd - portfolioStart;
  const avgAnnualChange = data.length > 0 ? portfolioChange / data.length : 0;
  const isDeclining = portfolioChange < 0;
  const avgAnnualDrawdown = isDeclining ? Math.abs(avgAnnualChange) : 0;
  const runwayYears = avgAnnualDrawdown > 0 ? portfolioStart / avgAnnualDrawdown : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          Age 72+ <span className="text-sm font-normal text-gray-500">RRIF & Mandatory Withdrawals</span>
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
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3B7A6B] inline-block" />
            Investment returns this year: {formatCurrency(Math.round(yearReturns))}
            <span className="text-gray-400">(stays in portfolio)</span>
          </p>
        </div>
        <div className="lg:col-span-2 space-y-3">
          <MathCard title="RRIF Minimum" summary={`${formatPercent(rrifRate)} of balance at age ${selectedAge}`} icon="📋">
            <MathRow label={`RRIF rate at ${selectedAge}`} value={formatPercent(rrifRate)} />
            <MathRow label="RRSP/RRIF balance (start of year)" value={formatCurrency(row?.rrspBalance || 0)} />
            <MathRow label="Minimum withdrawal" value={formatCurrency(row?.rrspWithdrawal || 0)} bold />
            <p className="text-gray-500 mt-1">
              After 71, CRA forces you to withdraw a minimum % each year. The rate increases with age — by 95 it's 20%.
            </p>
          </MathCard>

          {(row?.oasClawback || 0) > 0 && (
            <MathCard title="OAS Clawback" summary={`${formatCurrency(row.oasClawback)} clawed back this year`} icon="⚠️">
              <MathRow label="Total income" value={formatCurrency(row?.totalTaxableIncome || 0)} />
              <MathRow label="Clawback threshold" value={formatCurrency(93454)} />
              <MathRow label="Excess above threshold" value={formatCurrency(Math.max(0, (row?.totalTaxableIncome || 0) - 93454))} />
              <MathRow label="Clawback (15% of excess)" value={formatCurrency(row.oasClawback)} bold color="#ef4444" />
            </MathCard>
          )}

          <MathCard title="Tax Burden" summary={`${formatCurrency(row?.totalTax || 0)} (${row?.totalTaxableIncome > 0 ? ((row.totalTax / row.totalTaxableIncome) * 100).toFixed(1) : 0}% effective)`} icon="🧾">
            <MathRow label="Taxable income" value={formatCurrency(row?.totalTaxableIncome || 0)} />
            <MathRow label="Total tax" value={formatCurrency(row?.totalTax || 0)} bold />
            <MathRow label="After-tax income" value={formatCurrency(row?.afterTaxIncome || 0)} color="#22c55e" />
          </MathCard>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Income vs Expenses (Age 72+)</p>
        <IncomeExpenseBar data={data} height={240} lineData={{ key: 'totalPortfolio', label: 'Portfolio Balance', color: '#4ade80' }} />
      </div>

      <PortfolioWaterfall projectionData={projectionData} startAge={72} endAge={data[data.length - 1]?.age || s.lifeExpectancy} scenario={s} />

      <SubPhaseTable data={data} />

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">{isDeclining ? 'Avg Annual Drawdown' : 'Avg Annual Growth'}</p>
          <p className={`text-lg font-bold ${isDeclining ? 'text-red-700' : 'text-green-700'}`}>
            {formatCurrency(Math.abs(avgAnnualChange))}/yr
          </p>
          <p className="text-xs text-gray-400">({formatCurrency(td(Math.abs(avgAnnualChange), 80))} in today's $)</p>
          <p className="text-xs text-gray-500">{formatCurrency(portfolioStart)} → {formatCurrency(portfolioEnd)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Portfolio Runway</p>
          <p className={`text-lg font-bold ${runwayYears && runwayYears < 20 ? 'text-amber-700' : 'text-green-700'}`}>
            {runwayYears ? `${Math.round(runwayYears)} years` : 'Never depletes'}
          </p>
          <p className="text-xs text-gray-500">
            {runwayYears ? `Depletes around age ${72 + Math.round(runwayYears)}` : 'Portfolio sustains indefinitely'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Total OAS Clawback</p>
          <p className={`text-lg font-bold ${totalClawback > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {totalClawback > 0 ? formatCurrency(totalClawback) : 'No clawback'}
          </p>
          <p className="text-xs text-gray-500">
            {totalClawback > 0 ? `Over ${clawbackYears.length} years` : 'Income stays below threshold'}
          </p>
        </div>
      </div>

      {clawbackYears.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Key Insight:</strong> RRIF minimums push your income above the OAS clawback threshold for {clawbackYears.length} years,
          costing you {formatCurrency(totalClawback)} in lost OAS benefits total.
          {s.rrspMeltdownEnabled
            ? ' Your RRSP meltdown strategy helps reduce this.'
            : ' Consider an RRSP meltdown strategy to reduce this.'}
        </div>
      )}
    </div>
  );
}
