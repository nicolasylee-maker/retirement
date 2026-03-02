import React from 'react';
import SummaryCards from '../dashboard/SummaryCards';
import PortfolioChart from '../dashboard/PortfolioChart';
import IncomeExpenseChart from '../dashboard/IncomeExpenseChart';
import WithdrawalChart from '../dashboard/WithdrawalChart';
import AccountChart from '../dashboard/AccountChart';
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

      {/* Page 3: Portfolio Drivers */}
      <div className="print-page" style={{ paddingTop: 24 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio Drivers</h2>
        <PortfolioChart
          projectionData={projectionData}
          scenario={scenario}
          forceView="drivers"
        />
      </div>

      {/* Page 4: Withdrawals + Accounts + Milestones */}
      <div className="print-page" style={{ paddingTop: 24 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Withdrawals & Accounts</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <WithdrawalChart projectionData={projectionData} scenario={scenario} />
            <AccountChart projectionData={projectionData} />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-2">Portfolio Milestones</h2>
          <MilestoneCards projectionData={projectionData} scenario={scenario} />
        </div>
      </div>
    </>
  );
}
