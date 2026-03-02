import React from 'react';
import EstateSummaryCards from '../estate/EstateSummaryCards';
import EstateBreakdown from '../estate/EstateBreakdown';

export default function PrintEstateSection({ estateResult }) {
  if (!estateResult) return null;

  return (
    <div className="print-page" style={{ paddingTop: 24 }}>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Estate Analysis</h2>
      <p className="text-sm text-gray-500 mb-4">
        At age {estateResult.ageAtDeath} (life expectancy)
      </p>

      <div className="space-y-4">
        <EstateSummaryCards estateResult={estateResult} />
        <EstateBreakdown estateResult={estateResult} />

        {estateResult.distribution && (
          <div className="card-base p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Distribution to Heirs</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {estateResult.distribution.spouse > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Spouse</p>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">
                    {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(estateResult.distribution.spouse)}
                  </p>
                </div>
              )}
              {estateResult.distribution.children > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Children</p>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">
                    {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(estateResult.distribution.children)}
                  </p>
                </div>
              )}
              {estateResult.distribution.other > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Other</p>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">
                    {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(estateResult.distribution.other)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
