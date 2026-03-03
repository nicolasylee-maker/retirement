import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchScenarios, saveScenario, getScenarioCount } from '../services/scenarioService'

// saveStatus: 'idle' | 'saving' | 'saved' | 'error'

export function useCloudSync({ user, currentScenario, onSignIn }) {
  const [saveStatus, setSaveStatus] = useState('idle')
  const [syncDone, setSyncDone] = useState(false)
  const prevUserRef = useRef(null)

  // On sign-in: load cloud scenarios and replace in-memory state
  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = user

    if (!user) {
      setSyncDone(false)
      return
    }
    // Only trigger on transition from null → non-null
    if (prevUser?.id === user.id) return

    setSyncDone(false)
    let cancelled = false
    ;(async () => {
      try {
        const cloudScenarios = await fetchScenarios(user.id)
        if (!cancelled) {
          onSignIn(cloudScenarios)
          setSyncDone(true)
        }
      } catch (err) {
        console.error('[cloud-sync] sign-in fetch failed:', err)
        if (!cancelled) {
          onSignIn([])
          setSyncDone(true)
        }
      }
    })()

    return () => { cancelled = true }
  }, [user, onSignIn])

  // Auto-save debounce: save current scenario 1s after it changes
  useEffect(() => {
    if (!user || !currentScenario || !syncDone) return

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
  }, [user, currentScenario, syncDone])

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

  return { saveStatus, syncDone, checkCanCreate }
}
