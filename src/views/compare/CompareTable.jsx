import React, { useMemo } from 'react';
import { calcSustainableWithdrawal } from '../../engines/withdrawalCalc';
import { formatCurrency } from '../../utils/formatters';

const MILESTONE_AGES = [85, 90, 95];

function findRow(projection, age) {
  const exact = projection.find(r => r.age === age);
  if (exact) return exact;
  if (projection.length === 0) return null;

  let closest = projection[0];
  let minDiff = Math.abs(closest.age - age);
  for (const row of projection) {
    const diff = Math.abs(row.age - age);
    if (diff < minDiff) {
      closest = row;
      minDiff = diff;
    }
  }
  return closest;
}

function getRetirementRow(projection, scenario) {
  return projection.find(r => r.age === scenario.retirementAge);
}

function MetricRow({ label, values, highlight }) {
  const best = highlight ? Math.max(...values.filter(v => v != null)) : null;

  return (
    <tr className="border-t border-gray-100">
      <td className="py-2.5 pr-4 text-sm text-gray-600 font-medium">{label}</td>
      {values.map((v, i) => {
        const isBest = highlight && v != null && v === best && values.filter(x => x === best).length === 1;
        return (
          <td
            key={i}
            className={`py-2.5 px-4 text-sm text-right tabular-nums font-medium
              ${isBest ? 'text-green-600' : 'text-gray-900'}`}
          >
            {v != null ? formatCurrency(v) : '--'}
          </td>
        );
      })}
    </tr>
  );
}

export default function CompareTable({ projections, scenarios }) {
  const metrics = useMemo(() => {
    return scenarios.map((scenario, idx) => {
      const proj = projections[idx];
      if (!proj || proj.length === 0) return null;

      const retRow = getRetirementRow(proj, scenario);
      const { sustainableMonthly } = calcSustainableWithdrawal(scenario);

      return {
        netWorth: retRow?.netWorth ?? null,
        income: retRow?.totalIncome ?? null,
        tax: retRow?.totalTax ?? null,
        portfolio85: findRow(proj, 85)?.totalPortfolio ?? null,
        portfolio90: findRow(proj, 90)?.totalPortfolio ?? null,
        portfolio95: findRow(proj, 95)?.totalPortfolio ?? null,
        sustainableMonthly,
      };
    });
  }, [projections, scenarios]);

  const names = scenarios.map(s => s.name || 'Unnamed');

  return (
    <div className="card-base overflow-x-auto p-6 max-w-3xl">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 pr-4 text-left text-sm font-semibold text-gray-700">
              Metric
            </th>
            {names.map((name, i) => (
              <th key={i} className="py-3 px-4 text-right text-sm font-semibold text-gray-700">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <MetricRow
            label="Net worth at retirement"
            values={metrics.map(m => m?.netWorth)}
            highlight
          />
          <MetricRow
            label="Annual income at retirement"
            values={metrics.map(m => m?.income)}
            highlight
          />
          <MetricRow
            label="Annual tax at retirement"
            values={metrics.map(m => m?.tax)}
            highlight={false}
          />
          <MetricRow
            label="Portfolio at 85"
            values={metrics.map(m => m?.portfolio85)}
            highlight
          />
          <MetricRow
            label="Portfolio at 90"
            values={metrics.map(m => m?.portfolio90)}
            highlight
          />
          <MetricRow
            label="Portfolio at 95"
            values={metrics.map(m => m?.portfolio95)}
            highlight
          />
          <MetricRow
            label="Sustainable monthly"
            values={metrics.map(m => m?.sustainableMonthly)}
            highlight
          />
        </tbody>
      </table>
    </div>
  );
}
