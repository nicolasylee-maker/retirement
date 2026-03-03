import React, { useEffect, useState } from 'react'
import { adminApi } from '../../../services/adminService'

const PAGE_SIZE = 25

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  trialing:  'bg-blue-100 text-blue-700',
  past_due:  'bg-amber-100 text-amber-700',
  canceled:  'bg-red-100 text-red-700',
}

function StatusBadge({ status }) {
  const cls = STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status ?? '—'}
    </span>
  )
}

export default function SubscriptionsSection() {
  const [subs, setSubs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = (p) => {
    setLoading(true)
    adminApi.listSubscriptions(p, PAGE_SIZE)
      .then(d => { setSubs(d.subscriptions || []); setTotal(d.total || 0); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load(1) }, [])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Subscriptions</h2>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Period Start</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Period End</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trial End</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Cancel at End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800 truncate max-w-[180px]">{s.email ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString('en-CA') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('en-CA') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {s.trial_end ? new Date(s.trial_end).toLocaleDateString('en-CA') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {s.cancel_at_period_end ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => { setPage(page - 1); load(page - 1) }} disabled={page === 1}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
            &larr;
          </button>
          <span className="text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => { setPage(page + 1); load(page + 1) }} disabled={page === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
            &rarr;
          </button>
          <span className="text-gray-400 text-xs">{total} total</span>
        </div>
      )}
    </div>
  )
}
