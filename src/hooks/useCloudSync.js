import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchScenarios, saveScenario, getScenarioCount } from '../services/scenarioService'

// saveStatus: 'idle' | 'saving' | 'saved' | 'error'

export function useCloudSync({ user, currentScenario, onSignIn }) {
  const [saveStatus, setSaveStatus] = useState('idle')
  const prevUserRef = useRef(null)

  // On sign-in: load cloud scenarios and replace in-memory state
  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = user

    if (!user) return
    // Only trigger on transition from null → non-null
    if (prevUser?.id === user.id) return

    let cancelled = false
    ;(async () => {
      try {
        const cloudScenarios = await fetchScenarios(user.id)
        if (!cancelled) {
          onSignIn(cloudScenarios)
        }
      } catch {
        // If fetch fails, keep local scenarios (silent — user still works offline)
      }
    })()

    return () => { cancelled = true }
  }, [user, onSignIn])

  // Auto-save debounce: save current scenario 1s after it changes
  useEffect(() => {
    if (!user || !currentScenario) return

    setSaveStatus('saving')
    const timeout = setTimeout(async () => {
      try {
        await saveScenario(user.id, currentScenario)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 1000)

    return () => {
      clearTimeout(timeout)
    }
  }, [user, currentScenario])

  // Fade 'saved' back to 'idle' after 2s
  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timeout = setTimeout(() => setSaveStatus('idle'), 2000)
    return () => clearTimeout(timeout)
  }, [saveStatus])

  // Free tier guard: returns true if creation is allowed, false if blocked
  const checkCanCreate = useCallback(async () => {
    if (!user) return true
    try {
      const count = await getScenarioCount(user.id)
      if (count >= 1) {
        alert('Free plan: 1 saved scenario. Upgrade to save more.')
        return false
      }
    } catch {
      // If count check fails, allow creation — don't block the user
    }
    return true
  }, [user])

  return { saveStatus, checkCanCreate }
}
