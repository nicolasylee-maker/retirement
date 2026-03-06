import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from './AuthContext'
import { computeOverrideDaysRemaining, isOverrideExpired } from '../utils/trialOverride.js'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [override, setOverride] = useState(null)     // 'beta' | 'lifetime' | 'trial' | null
  const [overrideExpiresAt, setOverrideExpiresAt] = useState(null)
  const [stripeStatus, setStripeStatus] = useState(null)
  const [trialEnd, setTrialEnd] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [simulateFreeUser, setSimulateFreeUser] = useState(false)

  const hasLoadedOnce = useRef(false)

  async function load(currentUser) {
    if (!currentUser) {
      setOverride(null)
      setOverrideExpiresAt(null)
      setStripeStatus(null)
      setTrialEnd(null)
      setIsLoading(false)
      hasLoadedOnce.current = false
      return
    }

    // Only show loading spinner on first fetch — refreshes update silently
    if (!hasLoadedOnce.current) setIsLoading(true)

    // Check subscription_override first (from users table)
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_override, override_expires_at')
      .eq('id', currentUser.id)
      .single()

    const rawOverride = userData?.subscription_override || null
    const rawExpiresAt = userData?.override_expires_at || null

    // Treat an expired trial as no override (free tier)
    const effectiveOverride = isOverrideExpired(rawExpiresAt) ? null : rawOverride
    setOverride(effectiveOverride)
    setOverrideExpiresAt(rawExpiresAt)

    // Only query Stripe subscription if no active override
    if (!effectiveOverride) {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('status, trial_end')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setStripeStatus(subData?.status || null)
      setTrialEnd(subData?.trial_end ? new Date(subData.trial_end) : null)
    } else {
      setStripeStatus(null)
      setTrialEnd(null)
    }


    setIsLoading(false)
    hasLoadedOnce.current = true
  }

  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])
  const refresh = useCallback(() => load(userRef.current), [])

  useEffect(() => {
    load(user)
  }, [user])

  // Refresh on window focus — user may have completed checkout in another tab
  useEffect(() => {
    const handleFocus = () => { if (user) load(user) }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  const isPaid = simulateFreeUser
    ? false
    : (override != null
      || stripeStatus === 'active'
      || stripeStatus === 'trialing'
      || (!!user && user.email === ADMIN_EMAIL))

  const isOverride = override != null
  const isTrial = !isOverride && stripeStatus === 'trialing'
  const isOverrideTrial = override === 'trial'
  const isPastDue = !isOverride && stripeStatus === 'past_due'

  // Days remaining in Stripe trial (null if not trialing)
  const trialDaysRemaining = isTrial && trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Days remaining in admin-granted trial override (null if permanent or no override)
  const overrideDaysRemaining = computeOverrideDaysRemaining(overrideExpiresAt)

  return (
    <SubscriptionContext.Provider value={{
      isPaid,
      isOverride,
      override,
      overrideExpiresAt,
      overrideDaysRemaining,
      isOverrideTrial,
      isTrial,
      isPastDue,
      stripeStatus,
      trialEnd,
      trialDaysRemaining,
      isLoading,
      refresh,
      simulateFreeUser,
      setSimulateFreeUser,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider')
  return ctx
}
