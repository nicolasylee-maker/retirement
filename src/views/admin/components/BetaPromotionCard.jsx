import React, { useEffect, useState } from 'react'
import { adminApi } from '../../../services/adminService'

export default function BetaPromotionCard() {
  const [cutoff, setCutoff] = useState('')
  const [days, setDays] = useState('180')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getConfig().then(({ config }) => {
      const raw = config?.beta_promotion_cutoff
      if (raw && raw !== 'null') setCutoff(raw)
      if (config?.beta_promotion_days) setDays(config.beta_promotion_days)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await adminApi.updateConfig({
        beta_promotion_cutoff: cutoff || 'null',
        beta_promotion_days: days || '180',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const isActive = cutoff && new Date(cutoff + 'T23:59:59') >= new Date()

  if (loading) {
    return <div className="text-sm text-gray-400">Loading promotion config...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm font-medium text-gray-700">
          {isActive
            ? `Active — ends ${new Date(cutoff).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`
            : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cutoff date</label>
          <input
            type="date"
            value={cutoff}
            onChange={e => setCutoff(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Leave empty to disable</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Beta duration (days)</label>
          <input
            type="number"
            min="1"
            max="3650"
            value={days}
            onChange={e => setDays(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        New users who sign up before the cutoff date automatically receive full beta access
        for the specified number of days. Admin-invited users and returning users are unaffected.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
      </div>
    </div>
  )
}
