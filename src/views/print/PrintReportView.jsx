import React, { useEffect } from 'react';
import { calcEstateImpact } from '../../engines/estateEngine';
import { formatCurrency } from '../../utils/formatters';
import { calcSustainableWithdrawal } from '../../engines/withdrawalCalc';
import SummaryCards from '../dashboard/SummaryCards';
import PrintDashboardSection from './PrintDashboardSection';
import PrintDebtSection from './PrintDebtSection';
import PrintEstateSection from './PrintEstateSection';
import PrintInputsSection from './PrintInputsSection';

function CoverSection({ scenario, userName, projectionData }) {
  const retRow = projectionData.find(r => r.age === scenario.retirementAge);
  const lastRow = projectionData[projectionData.length - 1];
  const { sustainableMonthly } = calcSustainableWithdrawal(scenario);
  const depleted = projectionData.find(r => r.totalPortfolio <= 0 && r.age > scenario.currentAge);

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Header bar */}
      <div
        className="gradient-sunset rounded-xl p-6 mb-6"
        style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        <h1 className="text-3xl font-bold text-white mb-1">{scenario.name}</h1>
        {userName && (
          <p className="text-orange-100 text-lg">Prepared for {userName}</p>
        )}
        <p className="text-orange-200 text-sm mt-1">
          Generated {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-base p-4 border-l-4 border-orange-500">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Retirement Age</p>
          <p className="text-2xl font-bold text-gray-900">{scenario.retirementAge}</p>
          <p className="text-xs text-gray-400">{scenario.retirementAge - scenario.currentAge} years away</p>
        </div>
        <div className="card-base p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Net Worth at Retirement</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(retRow?.netWorth || 0)}</p>
          <p className="text-xs text-gray-400">Age {scenario.retirementAge}</p>
        </div>
        <div className={`card-base p-4 border-l-4 ${depleted ? 'border-red-500' : 'border-green-500'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Portfolio Depletion</p>
          <p className={`text-2xl font-bold ${depleted ? 'text-red-600' : 'text-green-700'}`}>
            {depleted ? `Age ${depleted.age}` : 'Never'}
          </p>
          <p className="text-xs text-gray-400">{depleted ? 'Funds run out' : 'Lasts beyond plan horizon'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card-base p-4 border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Safe Monthly Spending</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(sustainableMonthly)}</p>
          <p className="text-xs text-gray-400">To age 95 without running out</p>
        </div>
        <div className="card-base p-4 border-l-4 border-teal-500">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Annual Income at Retirement</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(retRow?.totalIncome || 0)}</p>
          <p className="text-xs text-gray-400">First year — before tax</p>
        </div>
      </div>
    </div>
  );
}

export default function PrintReportView({ scenario, projectionData, userName, printWindow }) {
  const hasDebt = (scenario.consumerDebt || 0) + (scenario.mortgageBalance || 0) + (scenario.otherDebt || 0) > 0;
  const estateResult = calcEstateImpact(scenario, projectionData, scenario.lifeExpectancy);

  useEffect(() => {
    const t = setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        printWindow.print();
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [printWindow]);

  return (
    <div
      className="print-report"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      {/* Page 1: Cover + Summary KPIs */}
      <div className="print-page" style={{ paddingTop: 16 }}>
        <CoverSection scenario={scenario} userName={userName} projectionData={projectionData} />
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Metrics at Retirement</h2>
        <SummaryCards projectionData={projectionData} scenario={scenario} />
      </div>

      {/* Pages 2–4: Dashboard charts */}
      <PrintDashboardSection scenario={scenario} projectionData={projectionData} />

      {/* Page 5 (conditional): Debt */}
      {hasDebt && <PrintDebtSection scenario={scenario} projectionData={projectionData} />}

      {/* Page 6: Estate */}
      <PrintEstateSection estateResult={estateResult} />

      {/* Page 7: Inputs */}
      <PrintInputsSection scenario={scenario} />
    </div>
  );
}
