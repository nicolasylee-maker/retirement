import React from 'react';
import { CHART_STYLE, COLORS } from '../../constants/designTokens';
import { formatCurrency } from '../../utils/formatters';

export default function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg shadow-lg border border-gray-200 p-3 text-sm"
      style={{ backgroundColor: CHART_STYLE.tooltipBg }}
    >
      <p className="font-semibold text-gray-900 mb-1">
        Age {d.age} ({d.year})
      </p>
      <p className="text-gray-700">
        Portfolio: <span className="font-medium">{formatCurrency(d.totalPortfolio)}</span>
      </p>
      <p className="text-gray-600">Income: {formatCurrency(d.totalIncome)}</p>
      <p className="text-gray-600">Tax: {formatCurrency(d.totalTax)}</p>
      <p className="text-gray-600">Expenses: {formatCurrency(d.expenses)}</p>
      {d.debtPayments > 0 && (
        <p className="text-gray-600">Debt: {formatCurrency(d.debtPayments)}</p>
      )}
      {d._portfolioDrain > 0 && (
        <p className="text-blue-600">
          Portfolio drain: {formatCurrency(d._portfolioDrain)}/yr
        </p>
      )}
      {d.rrspBalance != null && (
        <p className="text-amber-600">RRSP/RRIF: {formatCurrency(d.rrspBalance)}</p>
      )}
      {d.cppIncome > 0 && (
        <p className="text-green-600">CPP: {formatCurrency(d.cppIncome)}/yr</p>
      )}
      {d.oasIncome > 0 && (
        <p className="text-green-600">OAS: {formatCurrency(d.oasIncome)}/yr</p>
      )}
    </div>
  );
}
