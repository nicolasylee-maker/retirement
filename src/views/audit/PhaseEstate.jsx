import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { PieChart, Pie, Cell as PieCell } from 'recharts';
import MathCard, { MathRow } from './MathCard';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters';
import { CHART_COLORS, CHART_STYLE } from '../../constants/designTokens';

const WATERFALL_COLORS = {
  gross: '#22c55e',
  deduction: '#ef4444',
  net: '#3b82f6',
};

/**
 * Page 5: Estate — what's left at death.
 */
export default function PhaseEstate({ scenario, projectionData }) {
  const s = scenario;
  const lastRow = projectionData[projectionData.length - 1];
  if (!lastRow) return <p className="text-sm text-gray-500 p-4">No projection data.</p>;

  const rrspAtDeath = lastRow.rrspBalance || 0;
  const tfsaAtDeath = lastRow.tfsaBalance || 0;
  const nonRegAtDeath = lastRow.nonRegBalance || 0;
  const otherAtDeath = lastRow.otherBalance || 0;
  const mortgageAtDeath = lastRow.mortgageBalance || 0;
  const realEstate = s.realEstateValue || 0;
  const totalPortfolio = lastRow.totalPortfolio || 0;

  const grossEstate = totalPortfolio + realEstate;

  // Estimated taxes (simplified — matches estate sheet logic)
  const rrspTax = rrspAtDeath * 0.40; // ~40% avg marginal rate on deemed
  const nonRegGain = Math.max(0, nonRegAtDeath - (lastRow.nonRegCostBasis || nonRegAtDeath));
  const capGainsTax = nonRegGain * 0.50 * 0.30; // 50% inclusion × ~30% rate
  const reGainsTax = (s.isPrimaryResidence ?? s.realEstateIsPrimary ?? true)
    ? 0
    : Math.max(0, realEstate - (s.estimatedCostBasis || 0)) * 0.50 * 0.30;
  const totalTax = rrspTax + capGainsTax + reGainsTax;

  // Probate (Ontario formula)
  const probateEstate = Math.max(0, totalPortfolio + realEstate - tfsaAtDeath - mortgageAtDeath);
  const probateFee = Math.min(probateEstate, 50000) * 0.005 + Math.max(0, probateEstate - 50000) * 0.015;

  const netEstate = grossEstate - mortgageAtDeath - totalTax - probateFee;

  // Waterfall data
  const waterfallData = [
    { name: 'Gross Estate', value: grossEstate, type: 'gross' },
    { name: 'Mortgage', value: -mortgageAtDeath, type: 'deduction' },
    { name: 'RRSP Tax', value: -rrspTax, type: 'deduction' },
    { name: 'Cap Gains Tax', value: -(capGainsTax + reGainsTax), type: 'deduction' },
    { name: 'Probate', value: -probateFee, type: 'deduction' },
    { name: 'Net to Heirs', value: netEstate, type: 'net' },
  ].filter(d => Math.abs(d.value) > 0);

  // Pie: estate composition
  const pieData = [
    { name: 'TFSA', value: tfsaAtDeath, color: CHART_COLORS.tfsa },
    { name: 'RRSP/RRIF', value: Math.max(0, rrspAtDeath - rrspTax), color: CHART_COLORS.rrsp },
    { name: 'Non-Reg', value: Math.max(0, nonRegAtDeath - capGainsTax), color: CHART_COLORS.nonReg },
    { name: 'Real Estate', value: Math.max(0, realEstate - reGainsTax - mortgageAtDeath), color: '#a78bfa' },
    { name: 'Other', value: otherAtDeath, color: CHART_COLORS.other },
  ].filter(d => d.value > 0);
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-lg font-bold text-gray-900">
        Estate at Age {s.lifeExpectancy} <span className="text-sm font-normal text-gray-500">What's left for your heirs</span>
      </h2>

      {/* Big number */}
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Net to Heirs</p>
        <p className={`text-4xl font-bold ${netEstate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(netEstate)}
        </p>
        <p className="text-xs text-gray-400 mt-1">After all taxes, mortgage, and probate fees</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Waterfall chart */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Estate Waterfall</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterfallData} margin={{ top: 15, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Math.abs(v))} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={v => formatCurrencyShort(Math.abs(v))} style={{ fontSize: 10 }} />
                {waterfallData.map((d, i) => (
                  <Cell key={i} fill={WATERFALL_COLORS[d.type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Estate Composition (After Tax)</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                dataKey="value"
                label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                labelLine={{ stroke: '#d1d5db' }}
              >
                {pieData.map((d, i) => (
                  <PieCell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={v => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Math cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MathCard title="RRSP Deemed Disposition" summary={`${formatCurrency(rrspAtDeath)} fully taxable`} icon="📋">
          <MathRow label="RRSP/RRIF at death" value={formatCurrency(rrspAtDeath)} />
          <p className="text-gray-500">CRA treats this as if you withdrew it all on your last day. The entire balance is added to your final tax return as income.</p>
          <MathRow label="Estimated tax (~40%)" value={formatCurrency(rrspTax)} bold color="#ef4444" />
        </MathCard>

        <MathCard title="Capital Gains" summary={`${formatCurrency(nonRegGain)} in unrealized gains`} icon="📊">
          <MathRow label="Non-Reg value" value={formatCurrency(nonRegAtDeath)} />
          <MathRow label="Cost basis" value={formatCurrency(lastRow.nonRegCostBasis || nonRegAtDeath)} />
          <MathRow label="Capital gain" value={formatCurrency(nonRegGain)} />
          <MathRow label="Taxable (50%)" value={formatCurrency(nonRegGain * 0.5)} />
          <MathRow label="Estimated tax" value={formatCurrency(capGainsTax)} bold color="#ef4444" />
        </MathCard>

        <MathCard title="Probate Fees" summary={formatCurrency(probateFee)} icon="⚖️">
          <MathRow label="Probateable estate" value={formatCurrency(probateEstate)} />
          <MathRow label="First $50K @ $5/1000" value={formatCurrency(Math.min(probateEstate, 50000) * 0.005)} />
          {probateEstate > 50000 && (
            <MathRow label="Above $50K @ $15/1000" value={formatCurrency((probateEstate - 50000) * 0.015)} />
          )}
          <MathRow label="Total probate fee" value={formatCurrency(probateFee)} bold />
          <p className="text-gray-500">TFSA and jointly-held property bypass probate. Named beneficiaries on RRSP also skip it.</p>
        </MathCard>

        <MathCard title="Net Estate Summary" summary={formatCurrency(netEstate)} icon="🏦">
          <MathRow label="Gross estate" value={formatCurrency(grossEstate)} />
          <MathRow label="Less mortgage" value={formatCurrency(-mortgageAtDeath)} color="#ef4444" />
          <MathRow label="Less estate tax" value={formatCurrency(-totalTax)} color="#ef4444" />
          <MathRow label="Less probate" value={formatCurrency(-probateFee)} color="#ef4444" />
          <MathRow label="NET TO HEIRS" value={formatCurrency(netEstate)} bold />
        </MathCard>
      </div>
    </div>
  );
}
