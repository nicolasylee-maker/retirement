import React, { useState, useMemo, useRef, useEffect } from 'react';
import SankeyDiagram, { buildSankeyData } from './SankeyDiagram';
import IncomeExpenseBar from './IncomeExpenseBar';
import MathCard, { MathRow } from './MathCard';
import { formatCurrency, formatPercent } from '../../utils/formatters';

/**
 * Page 2: Working Years — age currentAge to retirementAge-1.
 */
export default function PhasePreRetirement({ scenario, projectionData }) {
  const s = scenario;
  const data = useMemo(
    () => projectionData.filter(d => d.age >= s.currentAge && d.age < s.retirementAge),
    [projectionData, s.currentAge, s.retirementAge],
  );

  const [selectedAge, setSelectedAge] = useState(s.currentAge);
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

  if (!data.length) return <p className="text-sm text-gray-500 p-4">No pre-retirement years in this scenario.</p>;

  // Insight: how much comes from compounding
  const totalDeposits = data.reduce((s, d) => s + Math.max(0, d.surplus || 0), 0);
  const lastPreRet = data[data.length - 1];
  const portfolioAtRet = lastPreRet?.totalPortfolio || 0;
  const compoundPct = portfolioAtRet > 0 ? Math.max(0, (1 - totalDeposits / portfolioAtRet) * 100) : 0;

  // KPI computations
  const totalGrossIncome = data.reduce((sum, d) => sum + (d.totalIncome || 0), 0);
  const avgAnnualSavings = data.length > 0 ? totalDeposits / data.length : 0;
  const savingsRatePct = totalGrossIncome > 0 ? (totalDeposits / totalGrossIncome) * 100 : 0;
  const nominalReturnPct = ((s.inflationRate || 0.025) + (s.realReturn || 0.04)) * 100;

  // Chart data with cumulative surplus line
  const chartDataWithLine = useMemo(() => {
    let cumulative = 0;
    return data.map(d => {
      cumulative += Math.max(0, d.surplus || 0);
      return { ...d, cumulativeSurplus: cumulative };
    });
  }, [data]);

  // Mortgage payoff age
  const mortgagePaidRow = projectionData.find(d => d.age > s.currentAge && (d.mortgageBalance || 0) <= 0);
  const mortPaidAge = mortgagePaidRow?.age;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          Working Years <span className="text-sm font-normal text-gray-500">Age {s.currentAge} – {s.retirementAge - 1}</span>
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Age:</label>
          <select
            value={selectedAge}
            onChange={e => setSelectedAge(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1"
          >
            {data.map(d => (
              <option key={d.age} value={d.age}>{d.age}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sankey + Math cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3" ref={containerRef}>
          <p className="text-xs text-gray-500 mb-1">Money flow at age {selectedAge}</p>
          <SankeyDiagram nodes={sankey.nodes} links={sankey.links} width={chartW} height={300} />
        </div>
        <div className="lg:col-span-2 space-y-3">
          {row.employmentIncome > 0 && (
            <MathCard title="Salary" summary={`${formatCurrency(row.employmentIncome)} at age ${selectedAge}`} icon="💼">
              <MathRow label="Base salary" value={formatCurrency(s.employmentIncome)} />
              <MathRow label={`× (1 + ${formatPercent(s.inflationRate)})^${selectedAge - s.currentAge}`} value={`inflation ${selectedAge - s.currentAge} yrs`} />
              <MathRow label="= Inflation-adjusted" value={formatCurrency(row.employmentIncome)} bold />
            </MathCard>
          )}

          {(s.mortgageBalance || 0) > 0 && (
            <MathCard title="Mortgage" summary={`${formatCurrency(row.debtPayments || 0)}/yr${mortPaidAge ? ` — paid off at ${mortPaidAge}` : ''}`} icon="🏠">
              <MathRow label="Original balance" value={formatCurrency(s.mortgageBalance)} />
              <MathRow label="Rate" value={formatPercent(s.mortgageRate)} />
              <MathRow label="Years remaining" value={`${s.mortgageYearsLeft || 0}`} />
              <MathRow label="Remaining balance" value={formatCurrency(row.mortgageBalance || 0)} />
            </MathCard>
          )}

          <MathCard title="Tax" summary={`${formatCurrency(row.totalTax)} (${row.totalTaxableIncome > 0 ? ((row.totalTax / row.totalTaxableIncome) * 100).toFixed(1) : 0}% effective)`} icon="🧾">
            <MathRow label="Taxable income" value={formatCurrency(row.totalTaxableIncome)} />
            <MathRow label="Federal + Provincial tax" value={formatCurrency(row.totalTax)} />
            <MathRow label="Effective rate" value={row.totalTaxableIncome > 0 ? formatPercent(row.totalTax / row.totalTaxableIncome) : '0%'} bold />
          </MathCard>

          {(row.surplus || 0) > 0 && (
            <MathCard title="Surplus → Investments" summary={`${formatCurrency(row.surplus)} invested this year`} icon="📈">
              <MathRow label="After-tax income" value={formatCurrency(row.afterTaxIncome)} />
              <MathRow label="Less expenses" value={formatCurrency(-(row.expenses || 0))} color="#ef4444" />
              <MathRow label="Less debt payments" value={formatCurrency(-(row.debtPayments || 0))} color="#f97316" />
              <MathRow label="= Surplus" value={formatCurrency(row.surplus)} bold />
              {row.tfsaDeposit > 0 && <MathRow label="→ TFSA deposit" value={formatCurrency(row.tfsaDeposit)} color="#22c55e" />}
              {(row.surplus - (row.tfsaDeposit || 0)) > 0 && (
                <MathRow label="→ Non-Reg overflow" value={formatCurrency(row.surplus - (row.tfsaDeposit || 0))} color="#0ea5e9" />
              )}
            </MathCard>
          )}
        </div>
      </div>

      {/* Bar chart with cumulative savings line */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Income vs Expenses Over Time</p>
        <IncomeExpenseBar data={chartDataWithLine} height={240} lineData={{ key: 'cumulativeSurplus', label: 'Cumulative Savings', color: '#4ade80' }} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Avg Annual Savings</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(avgAnnualSavings)}/yr</p>
          <p className="text-xs text-gray-500">{savingsRatePct.toFixed(1)}% of gross income</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Cumulative Saved</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalDeposits)}</p>
          <p className="text-xs text-gray-500">over {data.length} years</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Compounded Value</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(portfolioAtRet)}</p>
          <p className="text-xs text-gray-500">{formatCurrency(totalDeposits)} saved @ {nominalReturnPct.toFixed(1)}% over {data.length} yrs</p>
        </div>
      </div>

      {/* Insight */}
      {compoundPct > 10 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <strong>Key Insight:</strong> {compoundPct.toFixed(0)}% of your retirement portfolio comes from compound growth, not original savings.
          {mortPaidAge && ` Your mortgage is paid off at age ${mortPaidAge}, freeing up cash for investing.`}
        </div>
      )}
    </div>
  );
}
