import React from 'react'
import BetaPromotionCard from '../components/BetaPromotionCard'
import TaxDataEditor from '../components/TaxDataEditor'
import LegislationPanel from '../components/LegislationPanel'

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function MaintenanceSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Maintenance</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage tax data and monitor legislation changes. Edits take effect immediately for all users.
        </p>
      </div>

      <SectionCard title="Beta Promotion">
        <BetaPromotionCard />
      </SectionCard>

      <SectionCard title="Tax Data">
        <TaxDataEditor />
      </SectionCard>

      <SectionCard title="Legislation Monitor">
        <LegislationPanel />
      </SectionCard>
    </div>
  )
}
