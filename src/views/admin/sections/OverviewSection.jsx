import React, { useEffect, useState } from 'react'
import { adminApi } from '../../../services/adminService'
import StatCard from '../components/StatCard'
import SignupChart from '../components/SignupChart'

export default function OverviewSection() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminApi.getStats()
      .then(d => { setStats(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers?.toLocaleString()} />
        <StatCard label="This Month" value={stats?.usersThisMonth?.toLocaleString()} />
        <StatCard label="Paying Users" value={stats?.payingUsers?.toLocaleString()} />
        <StatCard label="Override Users" value={stats?.overrideUsers?.toLocaleString()} />
        <StatCard label="AI Insights (mo)" value={stats?.aiInsightsThisMonth?.toLocaleString()} />
        <StatCard label="Total Scenarios" value={stats?.totalScenarios?.toLocaleString()} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Signups — Last 30 Days</h3>
        <SignupChart data={stats?.signupsByDay} />
      </div>
    </div>
  )
}
