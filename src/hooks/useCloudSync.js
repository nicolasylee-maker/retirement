import { useEffect, useRef, useState } from 'react'
import * as Sentry from '@sentry/react'
import { fetchScenarios, saveScenario } from '../services/scenarioService'

// saveStatus: 'idle' | 'saving' | 'saved' | 'error'

export function useCloudSync({ user, currentScenario, onSignIn }) {
  const [saveStatus, setSaveStatus] = useState('idle')
  const [syncDone, setSyncDone] = useState(false)
  const prevUserIdRef = useRef(null)
  const syncInProgress = useRef(false)
  const hasFetchedRef = useRef(false)

  const userId = user?.id ?? null

  // On sign-in: load cloud scenarios and replace in-memory state.
  // Depends on userId (string) so object-reference changes don't cancel the fetch.
  useEffect(() => {
    const prevUserId = prevUserIdRef.current
    prevUserIdRef.current = userId

    if (!userId) {
      setSyncDone(false)
      hasFetchedRef.current = false
      return
    }
    if (prevUserId === userId) return
    // Prevent concurrent fetch+onSignIn calls from racing
    // (e.g. SIGNED_IN + TOKEN_REFRESHED firing back-to-back)
    if (syncInProgress.current) return

    syncInProgress.current = true
    setSyncDone(false)
    let cancelled = false
    ;(async () => {
      try {
        const cloudScenarios = await fetchScenarios(userId)
        if (!cancelled) {
          console.log('[cloud-sync] calling onSignIn', { count: cloudScenarios.length, userId })
          onSignIn(cloudScenarios, { userId })
          hasFetchedRef.current = true
          setSyncDone(true)
        }
      } catch (err) {
        console.error('[cloud-sync] sign-in fetch failed:', err)
        if (!cancelled) {
          onSignIn([], { fetchError: true, userId })
          hasFetchedRef.current = true
          setSyncDone(true)
        }
      } finally {
        syncInProgress.current = false
      }
    })()

    return () => { cancelled = true }
  }, [userId, onSignIn])

  // Auto-save debounce: save current scenario 1s after it changes
  useEffect(() => {
    if (!hasFetchedRef.current) return
    if (!userId || !currentScenario || !syncDone) return

    Sentry.addBreadcrumb({
      category: 'cloud-sync',
      message: 'auto-save triggered',
      data: { scenarioId: currentScenario.id, scenarioName: currentScenario.name, userId },
    })
    setSaveStatus('saving')
    const timeout = setTimeout(async () => {
      try {
        console.log('[cloud-sync] auto-save firing', { scenarioId: currentScenario.id, userId })
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

  return { saveStatus, syncDone }
}
