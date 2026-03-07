import React, { useMemo } from 'react';
import SummaryCard from '../../components/SummaryCard';
import { calcSustainableWithdrawal } from '../../engines/withdrawalCalc';
import { formatCurrency } from '../../utils/formatters';
import { todaysDollarsLabel } from '../../utils/inflationHelper';

export default function SummaryCards({ projectionData, scenario, pulseSafeSpend = false }) {
  const retirementRow = useMemo(
    () => projectionData.find(r => r.age === scenario.retirementAge),
    [projectionData, scenario],
  );

  const sustainableMonthly = useMemo(() => {
    const { sustainableMonthly } = calcSustainableWithdrawal(scenario);
    return sustainableMonthly;
  }, [scenario]);

  if (!retirementRow) return null;

  // Real income = sources that aren't drawing down savings
  const realIncome = (retirementRow.employmentIncome || 0)
    + retirementRow.cppIncome + retirementRow.oasIncome
    + (retirementRow.gisIncome || 0) + (retirementRow.gainsIncome || 0)
    + (retirementRow.pensionIncome || 0)
    + (retirementRow.spouseEmploymentIncome || 0)
    + (retirementRow.spouseCppIncome || 0) + (retirementRow.spouseOasIncome || 0)
    + (retirementRow.spousePensionIncome || 0);

  const totalWithdrawals = (retirementRow.rrspWithdrawal || 0)
    + (retirementRow.tfsaWithdrawal || 0)
    + (retirementRow.nonRegWithdrawal || 0)
    + (retirementRow.otherWithdrawal || 0)
    + (retirementRow.spouseRrspWithdrawal || 0)
    + (retirementRow.spouseTfsaWithdrawal || 0);

  const engineSurplus = retirementRow.afterTaxIncome - retirementRow.expenses - retirementRow.debtPayments;
  // If withdrawals are needed, that IS the shortfall
  const surplus = totalWithdrawals > 0 ? -totalWithdrawals : engineSurplus;
  const surplusPositive = surplus >= 0;
  const effTaxRate = retirementRow.totalTaxableIncome > 0
    ? ((retirementRow.totalTax / retirementRow.totalTaxableIncome) * 100).toFixed(1)
    : '0';

  // Helper to build "You entered $X" sub lines showing original input → projected value
  const entered = (v) => formatCurrency(v);
  const retAge = scenario.retirementAge;
  const curAge = scenario.currentAge;
  const inf = scenario.inflationRate;
  const td = (v, period = 'monthly') => todaysDollarsLabel(v, retAge, curAge, inf, period);
  const rrspInput = (scenario.rrspBalance || 0) + (scenario.rrifBalance || 0) + (scenario.dcPensionBalance || 0) + (scenario.liraBalance || 0);
  const nonRegInput = (scenario.nonRegInvestments || 0) + (scenario.cashSavings || 0);
  const yearsToRetire = Math.max(0, scenario.retirementAge - scenario.currentAge);

  const netWorthHelp = {
    title: 'Net Worth at Retirement',
    subtitle: `Everything you own minus everything you owe, at age ${scenario.retirementAge}.`,
    sections: [
      {
        heading: 'Your Assets',
        items: [
          { label: 'RRSP / RRIF / DC Pension', value: retirementRow.rrspBalance, color: '#f97316',
            sub: `You entered: RRSP ${entered(scenario.rrspBalance || 0)} + DC ${entered(scenario.dcPensionBalance || 0)} + LIRA ${entered(scenario.liraBalance || 0)} = ${entered(rrspInput)}. ${
              retirementRow.rrspBalance >= rrspInput
                ? `Grew to ${entered(retirementRow.rrspBalance)} over ${yearsToRetire}yr at ${(scenario.realReturn * 100).toFixed(1)}% return`
                : `Reduced to ${entered(retirementRow.rrspBalance)} over ${yearsToRetire}yr — expenses exceeded income by ~${entered(Math.round((rrspInput - retirementRow.rrspBalance) / Math.max(1, yearsToRetire)))}/yr, drawn from savings despite ${(scenario.realReturn * 100).toFixed(1)}% growth`
            }` },
          { label: 'TFSA', value: retirementRow.tfsaBalance, color: '#22c55e',
            sub: `You entered: ${entered(scenario.tfsaBalance || 0)}. Tax-free withdrawals & ${(scenario.tfsaReturn * 100).toFixed(1)}% growth → ${entered(retirementRow.tfsaBalance)}` },
          { label: 'Non-Registered', value: retirementRow.nonRegBalance, color: '#0ea5e9',
            sub: `You entered: investments ${entered(scenario.nonRegInvestments || 0)} + cash ${entered(scenario.cashSavings || 0)} = ${entered(nonRegInput)}. Only capital gains taxed (50% inclusion)` },
          ...(retirementRow.otherBalance > 0 ? [{ label: 'Other Assets', value: retirementRow.otherBalance, color: '#8b5cf6',
            sub: `You entered: ${entered(scenario.otherAssets || 0)}` }] : []),
          ...(scenario.realEstateValue > 0 ? [{ label: 'Real Estate', value: scenario.realEstateValue, color: '#d97706',
            sub: `You entered: ${entered(scenario.realEstateValue)}. ${scenario.realEstateIsPrimary ? 'Primary residence — capital gains exempt' : 'Subject to capital gains tax if sold'}` }] : []),
        ].filter(i => i.value > 0),
      },
      ...(retirementRow.mortgageBalance > 0 || scenario.consumerDebt > 0 ? [{
        heading: 'Debts',
        items: [
          ...(retirementRow.mortgageBalance > 0 ? [{ label: 'Mortgage', value: -retirementRow.mortgageBalance, negative: true, color: '#ef4444',
            sub: `You entered: ${entered(scenario.mortgageBalance)} at ${parseFloat((scenario.mortgageRate * 100).toFixed(4))}%, ${scenario.mortgageYearsLeft}yr left` }] : []),
          ...(scenario.consumerDebt > 0 ? [{ label: 'Consumer Debt', value: -scenario.consumerDebt, negative: true, color: '#f97316',
            sub: `You entered: ${entered(scenario.consumerDebt)} at ${parseFloat((scenario.consumerDebtRate * 100).toFixed(4))}% interest` }] : []),
        ],
      }] : []),
    ],
    bar: [
      { label: 'RRSP', value: retirementRow.rrspBalance, color: '#f97316' },
      { label: 'TFSA', value: retirementRow.tfsaBalance, color: '#22c55e' },
      { label: 'Non-Reg', value: retirementRow.nonRegBalance, color: '#0ea5e9' },
      { label: 'Other', value: retirementRow.otherBalance, color: '#8b5cf6' },
    ].filter(i => i.value > 0),
  };

  const incomeHelp = {
    title: 'Annual Retirement Income',
    subtitle: `All money coming in during your first year of retirement (age ${scenario.retirementAge}). Amounts shown are before income tax.`,
    sections: [
      {
        heading: 'Government Benefits',
        items: [
          { label: 'CPP', value: retirementRow.cppIncome, color: '#3b82f6',
            sub: `You entered: $${scenario.cppMonthly}/mo starting at age ${scenario.cppStartAge}. ${retirementRow.cppIncome > 0
              ? `Active — adjusted for ${scenario.cppStartAge < 65 ? 'early' : scenario.cppStartAge > 65 ? 'late' : 'standard'} start. Taxable income.`
              : 'Not active yet at this age'}${retirementRow.cppIncome > 0 && td(retirementRow.cppIncome) ? '\n' + td(retirementRow.cppIncome) : ''}` },
          { label: 'OAS', value: retirementRow.oasIncome, color: '#14b8a6',
            sub: `You entered: $${scenario.oasMonthly}/mo starting at age ${scenario.oasStartAge}. ${retirementRow.oasIncome > 0
              ? `Active — ${scenario.oasStartAge > 65 ? `+${((Math.min(scenario.oasStartAge, 70) - 65) * 12 * 0.6).toFixed(1)}% deferral bonus. ` : 'standard start. '}Taxable (shown after any OAS clawback)`
              : 'Not active yet at this age'}${retirementRow.oasIncome > 0 && td(retirementRow.oasIncome) ? '\n' + td(retirementRow.oasIncome) : ''}` },
          ...(retirementRow.gisIncome > 0 ? [{ label: 'GIS', value: retirementRow.gisIncome, color: '#059669',
            sub: 'Income-tested supplement for low-income seniors' }] : []),
        ],
      },
      ...(retirementRow.pensionIncome > 0 ? [{
        heading: 'Pension',
        items: [
          { label: 'Employer Pension', value: retirementRow.pensionIncome, color: '#8b5cf6',
            sub: `You entered: ${entered(scenario.dbPensionAnnual)}/yr starting age ${scenario.dbPensionStartAge}. ${scenario.dbPensionIndexed ? 'Indexed to inflation' : 'Not indexed — loses purchasing power'}${td(retirementRow.pensionIncome) ? '\n' + td(retirementRow.pensionIncome) : ''}` },
        ],
      }] : []),
      ...(scenario.stillWorking && scenario.employmentIncome > 0 && scenario.currentAge < scenario.retirementAge ? [{
        heading: 'Pre-Retirement Employment',
        items: [
          { label: 'Employment Income', value: `${entered(scenario.employmentIncome)}/yr`,
            sub: `You entered: ${entered(scenario.employmentIncome)}/yr gross. Covers expenses from age ${scenario.currentAge} to ${scenario.retirementAge} — stops at retirement` },
        ],
      }] : []),
      {
        heading: 'Account Withdrawals',
        items: [
          ...(retirementRow.rrspWithdrawal > 0 ? [{ label: 'RRSP/RRIF', value: retirementRow.rrspWithdrawal, color: '#f97316',
            sub: `Fully taxable as income. Drawn to cover shortfall between income and expenses${td(retirementRow.rrspWithdrawal) ? '\n' + td(retirementRow.rrspWithdrawal) : ''}` }] : []),
          ...(retirementRow.tfsaWithdrawal > 0 ? [{ label: 'TFSA', value: retirementRow.tfsaWithdrawal, color: '#22c55e',
            sub: `Tax-free — doesn't affect OAS or GIS${td(retirementRow.tfsaWithdrawal) ? '\n' + td(retirementRow.tfsaWithdrawal) : ''}` }] : []),
          ...(retirementRow.nonRegWithdrawal > 0 ? [{ label: 'Non-Registered', value: retirementRow.nonRegWithdrawal, color: '#0ea5e9',
            sub: `Only the gain portion is taxed${td(retirementRow.nonRegWithdrawal) ? '\n' + td(retirementRow.nonRegWithdrawal) : ''}` }] : []),
          ...(retirementRow.rrspWithdrawal === 0 && retirementRow.tfsaWithdrawal === 0 && retirementRow.nonRegWithdrawal === 0
            ? [{ label: 'No withdrawals needed', value: '—', sub: 'Income covers expenses without drawing on savings' }] : []),
        ],
      },
    ],
    bar: [
      { label: 'CPP', value: retirementRow.cppIncome, color: '#3b82f6' },
      { label: 'OAS', value: retirementRow.oasIncome, color: '#14b8a6' },
      { label: 'Pension', value: retirementRow.pensionIncome, color: '#8b5cf6' },
      { label: 'Withdrawals', value: retirementRow.rrspWithdrawal + retirementRow.tfsaWithdrawal + retirementRow.nonRegWithdrawal, color: '#f97316' },
    ].filter(i => i.value > 0),
  };

  const taxHelp = {
    title: 'Annual Tax',
    subtitle: `Federal + Ontario tax on your ${formatCurrency(retirementRow.totalTaxableIncome)} of taxable income.`,
    sections: [
      {
        heading: 'How it\'s calculated',
        items: [
          { label: 'Taxable Income', value: retirementRow.totalTaxableIncome,
            sub: `CPP + OAS + pension + RRSP/RRIF withdrawals (TFSA is excluded)${td(retirementRow.totalTaxableIncome, 'annual') ? '\n' + td(retirementRow.totalTaxableIncome, 'annual') : ''}` },
          { label: 'Federal + Ontario Tax', value: retirementRow.totalTax, negative: true, color: '#ef4444',
            sub: 'Includes federal basic personal amount and Ontario surtax' },
          { label: 'Effective Tax Rate', value: `${effTaxRate}%`,
            sub: 'Actual tax paid as % of taxable income' },
        ],
      },
      {
        heading: 'What you keep',
        items: [
          { label: 'Gross Income', value: retirementRow.totalIncome, color: '#22c55e' },
          { label: 'Minus Tax', value: -retirementRow.totalTax, negative: true, color: '#ef4444' },
          { label: 'After-Tax Income', value: retirementRow.afterTaxIncome, color: '#22c55e',
            sub: `${formatCurrency(Math.round(retirementRow.afterTaxIncome / 12))}/mo to cover expenses${td(retirementRow.afterTaxIncome) ? '\n' + td(retirementRow.afterTaxIncome) : ''}` },
        ],
      },
    ],
  };

  // Find when debts are paid off and calculate lifetime debt cost
  const debtFreeAge = projectionData.find(r => r.age > scenario.currentAge && r.debtPayments === 0)?.age;
  const totalLifetimeDebtPayments = projectionData.reduce((sum, r) => sum + (r.debtPayments || 0), 0);
  const originalDebt = (scenario.consumerDebt || 0) + (scenario.mortgageBalance || 0);
  const totalLifetimeInterest = Math.max(0, totalLifetimeDebtPayments - originalDebt);
  const retExpPct = ((1 - scenario.expenseReductionAtRetirement) * 100).toFixed(0);

  const surplusHelp = {
    title: surplusPositive ? 'Annual Surplus' : 'Annual Shortfall',
    subtitle: surplusPositive
      ? 'Good news — your income covers your expenses with room to spare.'
      : `Your real income doesn't cover expenses — ${formatCurrency(totalWithdrawals)}/yr is drawn from savings.`,
    sections: [
      {
        heading: 'The math',
        items: [
          { label: 'After-Tax Income', value: retirementRow.afterTaxIncome, color: '#22c55e',
            sub: `${formatCurrency(Math.round(retirementRow.afterTaxIncome / 12))}/mo from all sources after tax${td(retirementRow.afterTaxIncome) ? '\n' + td(retirementRow.afterTaxIncome) : ''}` },
          { label: 'Living Expenses', value: -retirementRow.expenses, negative: true, color: '#ef4444',
            sub: `You entered: ${entered(scenario.monthlyExpenses)}/mo. In retirement: ${retExpPct}% of pre-retirement (${parseFloat((scenario.expenseReductionAtRetirement * 100).toFixed(4))}% reduction)${td(retirementRow.expenses) ? '\n' + td(retirementRow.expenses) : ''}` },
          ...(retirementRow.debtPayments > 0 ? [{ label: 'Debt Payments', value: -retirementRow.debtPayments, negative: true, color: '#f97316',
            sub: `You entered: ${entered(scenario.consumerDebt)} consumer debt + ${entered(scenario.mortgageBalance)} mortgage.${debtFreeAge ? ` Debt-free by age ${debtFreeAge}.` : ''} Lifetime cost: ${entered(Math.round(totalLifetimeDebtPayments))} total (${entered(Math.round(totalLifetimeInterest))} in interest)` }] : []),
        ],
      },
      {
        heading: 'Result',
        items: [
          { label: surplusPositive ? 'Annual Surplus' : 'Annual Shortfall', value: surplus,
            negative: !surplusPositive,
            color: surplusPositive ? '#22c55e' : '#ef4444',
            sub: surplusPositive
              ? `${formatCurrency(Math.round(surplus / 12))}/mo extra${td(surplus) ? '\n' + td(surplus) : ''}`
              : `${formatCurrency(Math.round(Math.abs(surplus) / 12))}/mo shortfall drawn from savings${td(Math.abs(surplus)) ? '\n' + td(Math.abs(surplus)) : ''}` },
        ],
      },
    ],
    bar: [
      { label: 'Income', value: retirementRow.afterTaxIncome, color: '#22c55e' },
      { label: 'Expenses', value: retirementRow.expenses, color: '#ef4444' },
      ...(retirementRow.debtPayments > 0 ? [{ label: 'Debt', value: retirementRow.debtPayments, color: '#f97316' }] : []),
    ],
  };

  const safeSpendHelp = {
    title: 'Safe Monthly Spending',
    subtitle: 'The maximum you can spend each month and still not run out of money before age 95.',
    sections: [
      {
        heading: 'Your situation',
        items: [
          { label: 'Safe Monthly Spend', value: sustainableMonthly, color: '#22c55e',
            sub: `Calculated by testing thousands of spending levels against your full projection. This value is already in today's dollars.` },
          { label: 'Your Current Budget', value: scenario.monthlyExpenses,
            color: scenario.monthlyExpenses > sustainableMonthly ? '#ef4444' : '#3b82f6',
            sub: scenario.monthlyExpenses > sustainableMonthly
              ? `You're ${formatCurrency(scenario.monthlyExpenses - sustainableMonthly)}/mo over the safe limit (your input — today's dollars)`
              : `You're ${formatCurrency(sustainableMonthly - scenario.monthlyExpenses)}/mo under — you have room (your input — today's dollars)` },
        ],
      },
      {
        heading: 'Assumptions used',
        items: [
          { label: 'Investment Return', value: `${(scenario.realReturn * 100).toFixed(1)}% real`,
            sub: 'After-inflation return on your investments' },
          { label: 'Inflation Rate', value: `${(scenario.inflationRate * 100).toFixed(1)}%`,
            sub: 'Expenses grow by this much each year' },
          { label: 'Must Last Until', value: 'Age 95',
            sub: `That\'s ${95 - scenario.currentAge} years from now` },
          { label: 'CPP Income', value: `$${scenario.cppMonthly}/mo @ ${scenario.cppStartAge}`,
            sub: 'Helps support spending once it kicks in' },
          { label: 'OAS Income', value: `$${scenario.oasMonthly}/mo @ ${scenario.oasStartAge}`,
            sub: 'Additional government income' },
          ...(scenario.stillWorking && scenario.employmentIncome > 0 && scenario.currentAge < scenario.retirementAge
            ? [{ label: 'Employment Income', value: `${formatCurrency(scenario.employmentIncome)}/yr until ${scenario.retirementAge}`,
              sub: `Covers expenses for ${scenario.retirementAge - scenario.currentAge} pre-retirement years — not included in safe spend after retirement` }]
            : []),
        ],
      },
    ],
    bar: [
      { label: 'Safe Spend', value: sustainableMonthly, color: '#22c55e' },
      ...(scenario.monthlyExpenses > sustainableMonthly
        ? [{ label: 'Over Budget', value: scenario.monthlyExpenses - sustainableMonthly, color: '#ef4444' }]
        : []),
    ],
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <SummaryCard
        label="Net Worth"
        value={formatCurrency(retirementRow.netWorth)}
        subtitle={`At age ${scenario.retirementAge}`}
        richHelp={netWorthHelp}
        color="sunset"
      />
      <SummaryCard
        label="Income"
        value={formatCurrency(realIncome)}
        subtitle={`Annual, age ${scenario.retirementAge}`}
        richHelp={incomeHelp}
        color="lake"
        secondaryValue={totalWithdrawals > 0 ? formatCurrency(totalWithdrawals) : null}
        secondaryLabel={totalWithdrawals > 0 ? 'from savings' : null}
      />
      <SummaryCard
        label="Tax"
        value={formatCurrency(retirementRow.totalTax)}
        subtitle={`Annual, age ${scenario.retirementAge}`}
        richHelp={taxHelp}
        color="danger"
      />
      <SummaryCard
        label={surplusPositive ? 'Surplus' : 'Shortfall'}
        value={`${surplusPositive ? '' : '-'}${formatCurrency(Math.abs(surplus))}/yr`}
        subtitle={surplusPositive ? 'Income > expenses' : 'Funded from savings'}
        richHelp={surplusHelp}
        color={surplusPositive ? 'forest' : 'danger'}
      />
      <SummaryCard
        label="Safe Spend"
        value={formatCurrency(sustainableMonthly)}
        subtitle="Monthly to age 95"
        richHelp={safeSpendHelp}
        color="sunset"
        pulse={pulseSafeSpend}
      />
    </div>
  );
}
