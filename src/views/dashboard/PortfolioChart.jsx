import React, { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import { COLORS, CHART_STYLE } from '../../constants/designTokens';
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters';

function CustomTooltip({ active, payload }) {
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

function buildMilestones(scenario, projectionData) {
  const marks = [];
  const ages = new Set();

  const add = (age, label, color) => {
    if (age >= scenario.currentAge && age <= scenario.lifeExpectancy && !ages.has(age)) {
      ages.add(age);
      marks.push({ age, label, color });
    }
  };

  add(scenario.retirementAge, 'Retire', COLORS.lake.main);
  add(scenario.cppStartAge, 'CPP starts', '#16a34a');
  add(scenario.oasStartAge, 'OAS starts', '#059669');
  if (scenario.rrspBalance > 0 && 72 >= scenario.currentAge) {
    add(72, 'RRIF convert', '#d97706');
  }

  // RRSP meltdown markers
  if (scenario.rrspMeltdownEnabled && scenario.rrspMeltdownAnnual > 0) {
    const meltdownStart = scenario.rrspMeltdownStartAge ?? scenario.retirementAge;
    if (!ages.has(meltdownStart)) {
      add(meltdownStart, 'RRSP meltdown starts', '#9333ea');
    }

    const rrspDepletedRow = projectionData.find(
      (r, i) => i > 0 && r.rrspBalance <= 0 && projectionData[i - 1].rrspBalance > 0,
    );
    if (rrspDepletedRow) {
      add(rrspDepletedRow.age, 'RRSP empty', '#9333ea');
    }
  }

  return marks;
}

/**
 * Build phase annotation cards from projection data.
 * Returns up to 2 cards: pre-retirement and early-retirement.
 */
function buildPhaseAnnotations(scenario, projectionData) {
  const annotations = [];
  const retAge = scenario.retirementAge;

  // Phase 1: Pre-retirement (working years)
  const preRetRows = projectionData.filter(
    r => r.age < retAge && r.employmentIncome > 0,
  );
  if (preRetRows.length > 0) {
    const avg = (rows, key) => rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length;
    const avgSalary = avg(preRetRows, 'employmentIncome');
    const avgExpenses = avg(preRetRows, 'expenses');
    const avgDebt = avg(preRetRows, 'debtPayments');
    const avgTax = avg(preRetRows, 'totalTax');
    const totalNeed = avgExpenses + avgDebt + avgTax;
    const coveragePct = totalNeed > 0 ? Math.round((avgSalary / totalNeed) * 100) : 0;
    const avgDrain = avg(preRetRows, '_portfolioDrain');

    if (avgDrain > 0 && coveragePct < 100) {
      annotations.push({
        phase: 'pre-retirement',
        ages: `${preRetRows[0].age}\u2013${preRetRows[preRetRows.length - 1].age}`,
        line1: `Your salary covers ${coveragePct}% of expenses + debt + tax.`,
        line2: `Portfolio funds ${formatCurrency(avgDrain)}/yr of your ${formatCurrency(totalNeed)}/yr total need.`,
      });
    }
  }

  // Phase 2: Early retirement (first 5 years or until CPP+OAS stabilize)
  const earlyRetEnd = Math.min(retAge + 5, scenario.lifeExpectancy);
  const earlyRetRows = projectionData.filter(
    r => r.age >= retAge && r.age < earlyRetEnd,
  );
  if (earlyRetRows.length > 0) {
    const avg = (rows, key) => rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length;
    const avgCpp = avg(earlyRetRows, 'cppIncome');
    const avgOas = avg(earlyRetRows, 'oasIncome');
    const avgPension = avg(earlyRetRows, 'pensionIncome');
    const avgGis = avg(earlyRetRows, 'gisIncome');
    const avgExpenses = avg(earlyRetRows, 'expenses');
    const avgDebt = avg(earlyRetRows, 'debtPayments');
    const avgTax = avg(earlyRetRows, 'totalTax');
    const totalNeed = avgExpenses + avgDebt + avgTax;
    const govtIncome = avgCpp + avgOas + avgPension + avgGis;
    const coveragePct = totalNeed > 0 ? Math.round((govtIncome / totalNeed) * 100) : 0;
    const avgDrain = avg(earlyRetRows, '_portfolioDrain');

    // Build income label
    const parts = [];
    if (avgCpp > 0) parts.push('CPP');
    if (avgOas > 0) parts.push('OAS');
    if (avgPension > 0) parts.push('Pension');
    if (avgGis > 0) parts.push('GIS');
    const incomeLabel = parts.join(' + ') || 'Benefits';

    if (avgDrain > 0) {
      annotations.push({
        phase: 'early-retirement',
        ages: `${earlyRetRows[0].age}\u2013${earlyRetRows[earlyRetRows.length - 1].age}`,
        line1: `${incomeLabel} cover${parts.length === 1 ? 's' : ''} ${coveragePct}% of expenses${avgDebt > 0 ? ' + debt' : ''}.`,
        line2: `Portfolio funds ${formatCurrency(avgDrain)}/yr of the ${formatCurrency(totalNeed)}/yr need.`,
      });
    }
  }

  return annotations;
}

export default function PortfolioChart({ projectionData, scenario }) {
  if (!projectionData || projectionData.length === 0) return null;

  // Add computed portfolioDrain field: net withdrawals from portfolio
  const chartData = useMemo(() => projectionData.map(r => ({
    ...r,
    _portfolioDrain: Math.max(0,
      (r.rrspWithdrawal || 0) + (r.tfsaWithdrawal || 0)
      + (r.nonRegWithdrawal || 0) + (r.otherWithdrawal || 0)
      - (r.tfsaDeposit || 0) - (r.nonRegDeposit || 0)),
  })), [projectionData]);

  const lastRow = chartData[chartData.length - 1];
  const milestones = buildMilestones(scenario, chartData);

  const depletionRow = chartData.find(
    (r) => r.totalPortfolio <= 0 && r.age > scenario.currentAge,
  );

  const hasDrain = chartData.some(r => r._portfolioDrain > 0);
  const annotations = useMemo(
    () => buildPhaseAnnotations(scenario, chartData),
    [scenario, chartData],
  );

  return (
    <div className="card-base p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Total Portfolio Over Time
      </h3>

      {/* Chart with relative positioning for annotation overlays */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart
            data={chartData}
            margin={{ top: 25, right: 20, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.sunset.main} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.sunset.main} stopOpacity={0.02} />
              </linearGradient>
            </defs>

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
              width={60}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Milestone markers */}
            {milestones.map((m) => (
              <ReferenceLine
                key={m.label}
                x={m.age}
                stroke={m.color}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: m.label,
                  position: 'top',
                  fill: m.color,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            ))}

            {/* Zero line */}
            <ReferenceLine y={0} stroke={COLORS.gray[500]} strokeDasharray="4 4" />

            <Area
              type="monotone"
              dataKey="totalPortfolio"
              stroke={COLORS.sunset.main}
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{ r: 5, fill: COLORS.sunset.main }}
              name="Portfolio"
            />

            {/* Annual portfolio drain — thin dotted line, same y-axis */}
            {hasDrain && (
              <Line
                type="monotone"
                dataKey="_portfolioDrain"
                stroke="#6366f1"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 3, fill: '#6366f1' }}
                name="Annual gap funded by portfolio"
              />
            )}

            {/* Depletion marker */}
            {depletionRow && (
              <ReferenceDot
                x={depletionRow.age}
                y={0}
                r={6}
                fill={COLORS.danger}
                stroke="#fff"
                strokeWidth={2}
              />
            )}

            {/* End-of-life dot */}
            <ReferenceDot
              x={lastRow.age}
              y={lastRow.totalPortfolio}
              r={6}
              fill={lastRow.totalPortfolio > 0 ? COLORS.forest.main : COLORS.danger}
              stroke="#fff"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Phase annotation cards */}
      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {annotations.map((a) => (
            <div
              key={a.phase}
              className="flex-1 min-w-[220px] bg-indigo-50/70 border border-indigo-100
                         rounded-lg px-3 py-2 text-xs"
            >
              <p className="font-semibold text-indigo-700 mb-0.5">
                Ages {a.ages}
              </p>
              <p className="text-indigo-900">{a.line1}</p>
              <p className="text-indigo-800">{a.line2}</p>
            </div>
          ))}
          {hasDrain && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 px-2">
              <span className="inline-block w-6 border-t-2 border-dotted border-indigo-400" />
              <span>= annual gap funded by portfolio</span>
            </div>
          )}
        </div>
      )}

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
              RRSP meltdown: <strong>${scenario.rrspMeltdownAnnual.toLocaleString()}/yr (ages {scenario.rrspMeltdownStartAge ?? scenario.retirementAge}–{scenario.rrspMeltdownTargetAge})</strong>
            </span>
          )}
          {depletionRow && (
            <span className="text-red-600">
              Depleted at age <strong>{depletionRow.age}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
