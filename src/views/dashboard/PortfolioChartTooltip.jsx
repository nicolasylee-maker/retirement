import React from 'react';
import { CHART_STYLE } from '../../constants/designTokens';
import { formatCurrency } from '../../utils/formatters';

export default function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  // Real income (not withdrawals)
  const realIncome = (d.employmentIncome || 0)
    + (d.cppIncome || 0) + (d.oasIncome || 0)
    + (d.gisIncome || 0) + (d.gainsIncome || 0)
    + (d.pensionIncome || 0)
    + (d.spouseEmploymentIncome || 0)
    + (d.spouseCppIncome || 0) + (d.spouseOasIncome || 0)
    + (d.spousePensionIncome || 0);

  const outflows = (d.expenses || 0) + (d.totalTax || 0) + (d.debtPayments || 0);
  const gap = realIncome - outflows;

  // Withdrawal sources
  const withdrawals = [
    { label: 'RRSP', value: (d.rrspWithdrawal || 0) + (d.spouseRrspWithdrawal || 0) },
    { label: 'TFSA', value: (d.tfsaWithdrawal || 0) + (d.spouseTfsaWithdrawal || 0) },
    { label: 'Non-Reg', value: d.nonRegWithdrawal || 0 },
    { label: 'Other', value: d.otherWithdrawal || 0 },
  ].filter(w => w.value > 0);

  // Income sources
  const incomeSources = [
    { label: 'Employment', value: (d.employmentIncome || 0) + (d.spouseEmploymentIncome || 0) },
    { label: 'CPP', value: (d.cppIncome || 0) + (d.spouseCppIncome || 0) },
    { label: 'OAS', value: (d.oasIncome || 0) + (d.spouseOasIncome || 0) },
    { label: 'GIS', value: d.gisIncome || 0 },
    { label: 'GAINS', value: d.gainsIncome || 0 },
    { label: 'Pension', value: (d.pensionIncome || 0) + (d.spousePensionIncome || 0) },
  ].filter(s => s.value > 0);

  return (
    <div
      className="rounded-lg shadow-lg border border-gray-200 p-3 text-xs min-w-[190px]"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}
    >
      <p className="font-semibold text-gray-900 text-sm mb-1">
        Age {d.age} ({d.year})
      </p>

      <p className="text-gray-700 mb-2">
        Portfolio: <span className="font-semibold">{formatCurrency(d.totalPortfolio)}</span>
      </p>

      {/* Income section */}
      {incomeSources.length > 0 && (<>
        <div className="border-t border-gray-100 pt-1.5 mt-1.5">
          <p className="text-gray-400 font-medium mb-0.5">Income</p>
          {incomeSources.map(s => (
            <p key={s.label} className="text-green-700 flex justify-between gap-3">
              <span>{s.label}</span>
              <span className="tabular-nums">{formatCurrency(s.value)}/yr</span>
            </p>
          ))}
        </div>
      </>)}

      {/* Outflows section */}
      <div className="border-t border-gray-100 pt-1.5 mt-1.5">
        <p className="text-gray-400 font-medium mb-0.5">Outflows</p>
        <p className="text-gray-600 flex justify-between gap-3">
          <span>Expenses</span>
          <span className="tabular-nums">{formatCurrency(d.expenses)}</span>
        </p>
        {d.totalTax > 0 && (
          <p className="text-gray-600 flex justify-between gap-3">
            <span>Tax</span>
            <span className="tabular-nums">{formatCurrency(d.totalTax)}</span>
          </p>
        )}
        {d.debtPayments > 0 && (
          <p className="text-gray-600 flex justify-between gap-3">
            <span>Debt</span>
            <span className="tabular-nums">{formatCurrency(d.debtPayments)}</span>
          </p>
        )}
      </div>

      {/* Gap section */}
      {gap !== 0 && (
        <div className="border-t border-gray-100 pt-1.5 mt-1.5">
          <p className={`font-semibold flex justify-between gap-3 ${gap < 0 ? 'text-red-600' : 'text-green-700'}`}>
            <span>{gap < 0 ? 'Gap' : 'Surplus'}</span>
            <span className="tabular-nums">{gap < 0 ? '-' : ''}{formatCurrency(Math.abs(gap))}/yr</span>
          </p>
          {gap < 0 && withdrawals.map(w => (
            <p key={w.label} className="text-gray-500 flex justify-between gap-3 pl-2">
              <span className="italic">from {w.label}</span>
              <span className="tabular-nums">{formatCurrency(w.value)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
