import React, { useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import Card from '../../components/Card';
import SummaryCard from '../../components/SummaryCard';
import AiInsight from '../../components/AiInsight';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CHART_STYLE } from '../../constants/designTokens';
import ChartLegend from '../../components/ChartLegend';
import { calcDebtSchedule } from '../../utils/debtCalc';

export default function DebtView({ scenario, projectionData, onNavigate }) {
  const consumerPayoffAge = scenario.consumerDebtPayoffAge || (scenario.currentAge + 10);
  const mortgagePayoffAge = scenario.currentAge + (scenario.mortgageYearsLeft || 0);

  const consumerSchedule = useMemo(
    () => calcDebtSchedule(scenario.consumerDebt, scenario.consumerDebtRate || 0.08, consumerPayoffAge, scenario.currentAge, 'Consumer'),
    [scenario.consumerDebt, scenario.consumerDebtRate, consumerPayoffAge, scenario.currentAge],
  );

  const mortgageSchedule = useMemo(
    () => calcDebtSchedule(scenario.mortgageBalance, scenario.mortgageRate || 0.05, mortgagePayoffAge, scenario.currentAge, 'Mortgage'),
    [scenario.mortgageBalance, scenario.mortgageRate, mortgagePayoffAge, scenario.currentAge],
  );

  // Merge into chart data by age
  const chartData = useMemo(() => {
    const maxAge = Math.max(
      consumerSchedule.length > 0 ? consumerSchedule[consumerSchedule.length - 1].age : 0,
      mortgageSchedule.length > 0 ? mortgageSchedule[mortgageSchedule.length - 1].age : 0,
    );
    if (maxAge === 0) return [];
    const data = [];
    for (let age = scenario.currentAge; age <= maxAge; age++) {
      const c = consumerSchedule.find(r => r.age === age);
      const m = mortgageSchedule.find(r => r.age === age);
      data.push({
        age,
        consumer: c?.balance ?? 0,
        mortgage: m?.balance ?? 0,
        total: (c?.balance ?? 0) + (m?.balance ?? 0),
        consumerPayment: c?.payment ?? 0,
        mortgagePayment: m?.payment ?? 0,
      });
    }
    return data;
  }, [consumerSchedule, mortgageSchedule, scenario.currentAge]);

  const totalDebt = (scenario.consumerDebt || 0) + (scenario.mortgageBalance || 0) + (scenario.otherDebt || 0);
  const totalConsumerInterest = consumerSchedule.length > 0 ? consumerSchedule[consumerSchedule.length - 1]?.totalInterest || 0 : 0;
  const totalMortgageInterest = mortgageSchedule.length > 0 ? mortgageSchedule[mortgageSchedule.length - 1]?.totalInterest || 0 : 0;
  const totalInterest = totalConsumerInterest + totalMortgageInterest;
  const debtFreeAge = Math.max(consumerPayoffAge, mortgagePayoffAge);
  const monthlyPayments = (chartData[1]?.consumerPayment || 0) / 12 + (chartData[1]?.mortgagePayment || 0) / 12;

  // Find when debt payments end in projection
  const debtFreeRow = projectionData.find(r => r.age > scenario.currentAge && r.debtPayments === 0);
  const projectedDebtFreeAge = debtFreeRow?.age || debtFreeAge;

  // AI data
  const aiData = useMemo(() => ({
    totalDebt, totalInterest, debtFreeAge: projectedDebtFreeAge,
    consumerDebt: scenario.consumerDebt, consumerRate: scenario.consumerDebtRate,
    mortgageBalance: scenario.mortgageBalance, mortgageRate: scenario.mortgageRate,
    retirementAge: scenario.retirementAge, currentAge: scenario.currentAge,
    monthlyPayments,
  }), [totalDebt, totalInterest, projectedDebtFreeAge, scenario, monthlyPayments]);

  if (totalDebt === 0) {
    return (
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1">
          <Card>
            <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-lg p-6 text-center">
              <div className="w-full">
                <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-bold">You're debt-free!</h2>
                <p className="text-sm text-green-600 mt-1">No debts to track. All income goes toward your retirement goals.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="flex-1 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Debt"
            value={formatCurrency(totalDebt)}
            subtitle="All outstanding"
            color="danger"
          />
          <SummaryCard
            label="Monthly Payments"
            value={formatCurrency(Math.round(monthlyPayments))}
            subtitle="Combined debt service"
            color="sunset"
          />
          <SummaryCard
            label="Total Interest"
            value={formatCurrency(totalInterest)}
            subtitle="Over repayment period"
            color="danger"
          />
          <SummaryCard
            label="Debt-Free By"
            value={`Age ${projectedDebtFreeAge}`}
            subtitle={projectedDebtFreeAge <= scenario.retirementAge ? 'Before retirement' : `${projectedDebtFreeAge - scenario.retirementAge}yr into retirement`}
            color={projectedDebtFreeAge <= scenario.retirementAge ? 'forest' : 'danger'}
          />
        </div>

        {/* Debt payoff chart */}
        {chartData.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Debt Payoff Timeline</h3>
            <ChartLegend items={[
              ...(scenario.mortgageBalance > 0 ? [{ color: '#3b82f6', label: 'Mortgage' }]      : []),
              ...(scenario.consumerDebt > 0    ? [{ color: '#f97316', label: 'Consumer Debt' }] : []),
            ]} />
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="age" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  labelFormatter={(age) => `Age ${age}`}
                />
                {scenario.mortgageBalance > 0 && (
                  <Area type="monotone" dataKey="mortgage" name="Mortgage" stackId="1"
                    fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={2} />
                )}
                {scenario.consumerDebt > 0 && (
                  <Area type="monotone" dataKey="consumer" name="Consumer Debt" stackId="1"
                    fill="#f97316" fillOpacity={0.3} stroke="#f97316" strokeWidth={2} />
                )}
                <ReferenceLine x={scenario.retirementAge} stroke="#9333ea" strokeDasharray="5 5"
                  label={{ value: 'Retirement', position: 'top', fontSize: 11, fill: '#9333ea' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Amortization breakdown */}
        <div className="grid sm:grid-cols-2 gap-3">
          {scenario.consumerDebt > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-2">Consumer Debt Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Starting balance</span>
                  <span className="font-medium">{formatCurrency(scenario.consumerDebt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Interest rate</span>
                  <span className="font-medium">{parseFloat((scenario.consumerDebtRate * 100).toFixed(4))}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly payment</span>
                  <span className="font-medium">{formatCurrency(Math.round((consumerSchedule[1]?.payment || 0) / 12))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total interest paid</span>
                  <span className="font-medium text-red-600">{formatCurrency(totalConsumerInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid off by</span>
                  <span className="font-semibold">Age {consumerPayoffAge}</span>
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Total cost</span>
                  <span className="font-bold">{formatCurrency(scenario.consumerDebt + totalConsumerInterest)}</span>
                </div>
              </div>
            </Card>
          )}
          {scenario.mortgageBalance > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-2">Mortgage Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Starting balance</span>
                  <span className="font-medium">{formatCurrency(scenario.mortgageBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Interest rate</span>
                  <span className="font-medium">{parseFloat((scenario.mortgageRate * 100).toFixed(4))}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly payment</span>
                  <span className="font-medium">{formatCurrency(Math.round((mortgageSchedule[1]?.payment || 0) / 12))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total interest paid</span>
                  <span className="font-medium text-red-600">{formatCurrency(totalMortgageInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid off by</span>
                  <span className="font-semibold">Age {mortgagePayoffAge}</span>
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Total cost</span>
                  <span className="font-bold">{formatCurrency(scenario.mortgageBalance + totalMortgageInterest)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Impact on retirement */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-2">Impact on Retirement</h3>
          <div className="grid sm:grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Annual Debt Service</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(Math.round(monthlyPayments * 12))}</p>
              <p className="text-xs text-gray-400">diverted from savings/spending</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Debt vs Retirement</p>
              <p className="text-lg font-bold text-gray-800">
                {projectedDebtFreeAge <= scenario.retirementAge
                  ? `${scenario.retirementAge - projectedDebtFreeAge}yr buffer`
                  : `${projectedDebtFreeAge - scenario.retirementAge}yr overlap`}
              </p>
              <p className="text-xs text-gray-400">
                {projectedDebtFreeAge <= scenario.retirementAge
                  ? 'Debt-free before you retire'
                  : 'Paying debt during retirement'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Lifetime Interest</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalInterest)}</p>
              <p className="text-xs text-gray-400">money that doesn't grow for you</p>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Insight sidebar */}
      <div className="xl:w-96 shrink-0">
        <div className="xl:sticky xl:top-16">
          <AiInsight type="debt" data={aiData} scenarioKey={scenario.id} />
        </div>
      </div>
    </div>
  );
}
