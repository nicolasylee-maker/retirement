import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from './AuthContext'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [override, setOverride] = useState(null)     // 'beta' | 'lifetime' | null
  const [stripeStatus, setStripeStatus] = useState(null)
  const [trialEnd, setTrialEnd] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  async function load(currentUser) {
    if (!currentUser) {
      setOverride(null)
      setStripeStatus(null)
      setTrialEnd(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Check subscription_override first (from users table)
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_override')
      .eq('id', currentUser.id)
      .single()

    setOverride(userData?.subscription_override || null)

    // Only query Stripe subscription if no override
    if (!userData?.subscription_override) {
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
  }

  useEffect(() => {
    load(user)
  }, [user])

  // Refresh on window focus — user may have completed checkout in another tab
  useEffect(() => {
    const handleFocus = () => { if (user) load(user) }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  const isPaid = override != null
    || stripeStatus === 'active'
    || stripeStatus === 'trialing'
    || (!!user && user.email === ADMIN_EMAIL)

  const isOverride = override != null
  const isTrial = !isOverride && stripeStatus === 'trialing'
  const isPastDue = !isOverride && stripeStatus === 'past_due'

  // Days remaining in trial (null if not trialing)
  const trialDaysRemaining = isTrial && trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <SubscriptionContext.Provider value={{
      isPaid,
      isOverride,
      override,
      isTrial,
      isPastDue,
      stripeStatus,
      trialEnd,
      trialDaysRemaining,
      isLoading,
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
