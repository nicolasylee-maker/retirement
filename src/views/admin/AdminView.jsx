import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import OverviewSection from './sections/OverviewSection'
import UsersSection from './sections/UsersSection'
import AiConfigSection from './sections/AiConfigSection'
import AiTestingSection from './sections/AiTestingSection'
import SubscriptionsSection from './sections/SubscriptionsSection'
import MaintenanceSection from './sections/MaintenanceSection'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const NAV = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'ai-config', label: 'AI Config' },
  { key: 'ai-testing', label: 'AI Testing' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'maintenance', label: 'Maintenance' },
]

export default function AdminView({ onClose }) {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')

  if (user?.email !== ADMIN_EMAIL) return null

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <span className="font-bold text-gray-900 text-sm">Admin</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close admin"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveSection(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === item.key
                  ? 'bg-purple-50 text-purple-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-6 lg:px-10 py-8">
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'users' && <UsersSection />}
        {activeSection === 'ai-config' && <AiConfigSection />}
        {activeSection === 'ai-testing' && <AiTestingSection />}
        {activeSection === 'subscriptions' && <SubscriptionsSection />}
        {activeSection === 'maintenance' && <MaintenanceSection />}
      </main>
    </div>
  )
}
