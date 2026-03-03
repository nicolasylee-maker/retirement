import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchScenarios, saveScenario, getScenarioCount } from '../services/scenarioService'

// saveStatus: 'idle' | 'saving' | 'saved' | 'error'

export function useCloudSync({ user, currentScenario, onSignIn }) {
  const [saveStatus, setSaveStatus] = useState('idle')
  const [syncDone, setSyncDone] = useState(false)
  const prevUserIdRef = useRef(null)
  const userRef = useRef(user)
  userRef.current = user

  const userId = user?.id ?? null

  // On sign-in: load cloud scenarios and replace in-memory state.
  // Depends on userId (string) so object-reference changes don't cancel the fetch.
  useEffect(() => {
    const prevUserId = prevUserIdRef.current
    prevUserIdRef.current = userId

    if (!userId) {
      setSyncDone(false)
      return
    }
    if (prevUserId === userId) return

    setSyncDone(false)
    let cancelled = false
    ;(async () => {
      try {
        const cloudScenarios = await fetchScenarios(userId)
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
  }, [userId, onSignIn])

  // Auto-save debounce: save current scenario 1s after it changes
  useEffect(() => {
    if (!userId || !currentScenario || !syncDone) return

    setSaveStatus('saving')
    const timeout = setTimeout(async () => {
      try {
        await saveScenario(userId, currentScenario)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 1000)

    return () => {
      clearTimeout(timeout)
    }
  }, [userId, currentScenario, syncDone])

  // Fade 'saved' back to 'idle' after 2s
  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timeout = setTimeout(() => setSaveStatus('idle'), 2000)
    return () => clearTimeout(timeout)
  }, [saveStatus])

  // Free tier guard: returns true if creation is allowed, false if blocked
  const checkCanCreate = useCallback(async () => {
    const uid = userRef.current?.id
    if (!uid) return true
    try {
      const count = await getScenarioCount(uid)
      if (count >= 1) {
        alert('Free plan: 1 saved scenario. Upgrade to save more.')
        return false
      }
    } catch {
      // If count check fails, allow creation — don't block the user
    }
    return true
  }, [])

  return { saveStatus, syncDone, checkCanCreate }
}
