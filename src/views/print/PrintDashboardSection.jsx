import React from 'react';
import SummaryCards from '../dashboard/SummaryCards';
import PortfolioChart from '../dashboard/PortfolioChart';
import IncomeExpenseChart from '../dashboard/IncomeExpenseChart';
import WithdrawalChart from '../dashboard/WithdrawalChart';
import MilestoneCards from '../dashboard/MilestoneCards';

export default function PrintDashboardSection({ scenario, projectionData }) {
  return (
    <>
      {/* Page 2: Portfolio Balance + Income vs Expenses */}
      <div className="print-page" style={{ paddingTop: 24 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio Overview</h2>
        <div className="space-y-4">
          <PortfolioChart
            projectionData={projectionData}
            scenario={scenario}
            forceView="balance"
          />
          <IncomeExpenseChart projectionData={projectionData} />
        </div>
      </div>

      {/* Page 3: Portfolio by Account */}
      <div className="print-page" style={{ paddingTop: 24 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio by Account</h2>
        <PortfolioChart
          projectionData={projectionData}
          scenario={scenario}
          forceView="accounts"
        />
      </div>

      {/* Page 4: Withdrawals + Accounts + Milestones */}
      <div className="print-page" style={{ paddingTop: 24 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Withdrawals & Accounts</h2>
        <div className="space-y-4">
          <WithdrawalChart projectionData={projectionData} scenario={scenario} />

          <h2 className="text-lg font-semibold text-gray-900 mt-2">Portfolio Milestones</h2>
          <MilestoneCards projectionData={projectionData} scenario={scenario} />
        </div>
      </div>
    </>
  );
}
