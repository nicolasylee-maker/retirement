import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

/**
 * Header subscription status indicator.
 * Only renders when a user is signed in and there is something worth showing.
 *
 * - Trial active: orange pill "Trial (N days)"
 * - Past due: red banner "Payment failed — update your card"
 * - Override 'beta': gray pill "Beta"
 * - Override 'lifetime': purple pill "Lifetime"
 * - Active paid / free / loading: renders nothing
 */
export default function SubscriptionBadge() {
  const { user } = useAuth()
  const { isPastDue, isTrial, isOverride, override, trialDaysRemaining, isLoading } = useSubscription()

  if (!user || isLoading) return null

  if (isPastDue) {
    return (
      <div
        role="alert"
        className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center
                   text-sm font-medium py-1.5 px-4"
      >
        Payment failed — update your card
      </div>
    )
  }

  if (isTrial) {
    const label = trialDaysRemaining != null
      ? `Trial (${trialDaysRemaining}d left)`
      : 'Trial'
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                   bg-orange-100 text-orange-700 border border-orange-200"
      >
        {label}
      </span>
    )
  }

  if (isOverride && override === 'beta') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                   bg-gray-100 text-gray-600 border border-gray-300"
      >
        Beta
      </span>
    )
  }

  if (isOverride && override === 'lifetime') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                   bg-purple-100 text-purple-700 border border-purple-200"
      >
        Lifetime
      </span>
    )
  }

  return null
}
