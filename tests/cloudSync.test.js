// @vitest-environment jsdom
/**
 * Cloud-sync tests: service-layer invariants, hook behaviour, and rename safety.
 *
 * These tests verify:
 *  A. fetchScenarios overwrites the JSON `id` with the DB row `id`
 *  B. saveScenario passes scenario.id to upsert (UPDATE, not INSERT)
 *  C. Round-trip: fetch → rename → save preserves the DB row ID
 *  D. onSignIn fires when userId transitions null → value
 *  E. Effect does NOT re-trigger when user object ref changes (same userId)
 *  F. Auto-save is gated by syncDone
 *  G. Rename spread preserves the original id
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'

// ─── Supabase mock ──────────────────────────────────────────────────────────

// Mutable state that controls what the mock returns
let mockSelectData = []
let mockUpsertError = null
let upsertSpy = vi.fn()
let fetchSpy = vi.fn()

function createQueryBuilder() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(async () => {
      fetchSpy()
      return { data: mockSelectData, error: null }
    }),
    upsert: vi.fn((row, opts) => {
      upsertSpy(row, opts)
      return Promise.resolve({ error: mockUpsertError })
    }),
    delete: vi.fn().mockReturnThis(),
  }
}

// The mock factory runs once; supabase.from returns a fresh builder each call
const mockFrom = vi.fn()
vi.mock('../src/services/supabaseClient', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

// Import the modules that depend on the mock
const { fetchScenarios, saveScenario } = await import('../src/services/scenarioService')
const { useCloudSync } = await import('../src/hooks/useCloudSync')

// ─── Helpers ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSelectData = []
  mockUpsertError = null
  upsertSpy = vi.fn()
  fetchSpy = vi.fn()
  mockFrom.mockImplementation(() => createQueryBuilder())
})

afterEach(() => {
  cleanup()
})

// ═══════════════════════════════════════════════════════════════════════════
// A. Service-layer tests
// ═══════════════════════════════════════════════════════════════════════════

describe('scenarioService', () => {
  // Test 1
  it('fetchScenarios overwrites data.id with DB row id', async () => {
    mockSelectData = [
      { id: 'db-uuid-1', name: 'Test', data: { id: 'stale-data-id', name: 'Test', income: 50000 }, updated_at: '2025-01-01' },
    ]

    const result = await fetchScenarios('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('db-uuid-1')
    expect(result[0].id).not.toBe('stale-data-id')
    expect(result[0].name).toBe('Test')
    expect(result[0].income).toBe(50000)
  })

  // Test 2
  it('saveScenario passes scenario.id to upsert', async () => {
    const scenario = { id: 'my-uuid', name: 'Plan', income: 60000 }
    await saveScenario('user-1', scenario)

    expect(upsertSpy).toHaveBeenCalledOnce()
    const [row] = upsertSpy.mock.calls[0]
    expect(row.id).toBe('my-uuid')
    expect(row.user_id).toBe('user-1')
    expect(row.name).toBe('Plan')
  })

  // Test 3
  it('round-trip: fetch → rename → save preserves DB row ID', async () => {
    mockSelectData = [
      { id: 'db-uuid-persist', name: 'Original', data: { id: 'old-local-id', name: 'Original' }, updated_at: '2025-01-01' },
    ]

    const fetched = (await fetchScenarios('user-1'))[0]
    expect(fetched.id).toBe('db-uuid-persist')

    // Simulate rename: spread preserves id
    const renamed = { ...fetched, name: 'Renamed' }
    expect(renamed.id).toBe('db-uuid-persist')

    await saveScenario('user-1', renamed)

    const [row] = upsertSpy.mock.calls[0]
    expect(row.id).toBe('db-uuid-persist') // UPDATE, not INSERT
    expect(row.name).toBe('Renamed')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// B. Hook tests (renderHook + jsdom)
// ═══════════════════════════════════════════════════════════════════════════

describe('useCloudSync hook', () => {
  beforeEach(() => {
    mockSelectData = [
      { id: 'cloud-1', name: 'Cloud Plan', data: { id: 'old', name: 'Cloud Plan' }, updated_at: '2025-01-01' },
    ]
  })

  // Test 4
  it('onSignIn IS called when userId transitions null → value', async () => {
    const onSignIn = vi.fn()

    const { rerender } = renderHook(
      ({ user }) => useCloudSync({ user, currentScenario: null, onSignIn }),
      { initialProps: { user: null } },
    )

    // Transition null → signed-in
    rerender({ user: { id: 'abc' } })

    // Wait for async fetch to complete
    await vi.waitFor(() => {
      expect(onSignIn).toHaveBeenCalledOnce()
    })

    // Verify it was called with cloud data (id overwritten)
    const cloudData = onSignIn.mock.calls[0][0]
    expect(cloudData).toHaveLength(1)
    expect(cloudData[0].id).toBe('cloud-1')
  })

  // Test 5 — KEY REGRESSION TEST
  it('effect NOT re-triggered when user object ref changes (same userId)', async () => {
    const onSignIn = vi.fn()

    const { rerender } = renderHook(
      ({ user }) => useCloudSync({ user, currentScenario: null, onSignIn }),
      { initialProps: { user: { id: 'abc', v: 1 } } },
    )

    // Wait for initial sign-in fetch
    await vi.waitFor(() => {
      expect(onSignIn).toHaveBeenCalledOnce()
    })

    // Change user object reference but keep same userId
    rerender({ user: { id: 'abc', v: 2 } })
    rerender({ user: { id: 'abc', v: 3 } })

    // Give time for any spurious effects
    await new Promise(r => setTimeout(r, 50))

    // fetchScenarios should have been called exactly once (not cancelled+re-called)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  // Test 6
  it('auto-save is gated by syncDone', async () => {
    const onSignIn = vi.fn()
    const scenario = { id: 'sc-1', name: 'Test', income: 70000 }

    // Start signed in — sync will begin immediately
    const { result, rerender } = renderHook(
      ({ user, currentScenario }) => useCloudSync({ user, currentScenario, onSignIn }),
      { initialProps: { user: { id: 'user-1' }, currentScenario: scenario } },
    )

    // syncDone should be false before onSignIn fires
    expect(result.current.syncDone).toBe(false)

    // upsert should NOT have been called yet (auto-save gated)
    expect(upsertSpy).not.toHaveBeenCalled()

    // Wait for onSignIn to fire → syncDone becomes true
    await vi.waitFor(() => {
      expect(result.current.syncDone).toBe(true)
    })

    // Now trigger auto-save by providing a changed currentScenario after syncDone
    rerender({ user: { id: 'user-1' }, currentScenario: { ...scenario, income: 80000 } })

    // Wait for debounced save (1s timeout in hook)
    await vi.waitFor(() => {
      expect(upsertSpy).toHaveBeenCalled()
    }, { timeout: 2000 })

    const [row] = upsertSpy.mock.calls[0]
    expect(row.id).toBe('sc-1')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// C. Rename invariant test
// ═══════════════════════════════════════════════════════════════════════════

describe('rename invariant', () => {
  // Test 7
  it('spread rename preserves the original id', () => {
    const currentScenario = {
      id: 'db-uuid-original',
      name: 'Old Name',
      income: 50000,
      province: 'ON',
    }

    const renamed = { ...currentScenario, name: 'New Name' }

    expect(renamed.id).toBe('db-uuid-original')
    expect(renamed.name).toBe('New Name')
    expect(renamed.income).toBe(50000)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// D. Fetch-error and free-tier guard tests
// ═══════════════════════════════════════════════════════════════════════════

describe('fetch error handling', () => {
  // Test 8: onSignIn receives fetchError flag when fetch throws
  it('onSignIn called with fetchError flag when fetchScenarios throws', async () => {
    // Make the query builder's order() reject to simulate a network error
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => { throw new Error('network error') }),
    }))

    const onSignIn = vi.fn()

    const { rerender } = renderHook(
      ({ user }) => useCloudSync({ user, currentScenario: null, onSignIn }),
      { initialProps: { user: null } },
    )

    rerender({ user: { id: 'abc' } })

    await vi.waitFor(() => {
      expect(onSignIn).toHaveBeenCalledOnce()
    })

    expect(onSignIn).toHaveBeenCalledWith([], { fetchError: true, userId: 'abc' })
  })

  // Test 9: Error-path onSignIn does NOT create fallback scenario
  it('handleSignIn with fetchError flag does NOT create fallback "My Plan"', () => {
    // Simulate the handleSignIn logic from App.jsx
    let scenarios = []
    let currentScenarioId = null
    let view = 'landing'

    function handleSignIn(cloudScenarios, { fetchError } = {}) {
      if (cloudScenarios.length > 0) {
        scenarios = cloudScenarios
        currentScenarioId = cloudScenarios[0].id
        view = 'returning-home'
        return
      }
      if (fetchError) {
        // Fetch failed — don't create a fallback
        return
      }
      // Cloud genuinely empty — new user
      const fallback = { id: 'fallback-id', name: 'My Plan' }
      if (scenarios.length === 0) scenarios = [fallback]
      if (!currentScenarioId) currentScenarioId = fallback.id
      if (view === 'landing') view = 'wizard'
    }

    // With fetchError: state should NOT change
    handleSignIn([], { fetchError: true })
    expect(scenarios).toEqual([])
    expect(currentScenarioId).toBeNull()
    expect(view).toBe('landing')

    // Without fetchError: SHOULD create fallback
    handleSignIn([])
    expect(scenarios).toHaveLength(1)
    expect(scenarios[0].name).toBe('My Plan')
    expect(currentScenarioId).toBe('fallback-id')
    expect(view).toBe('wizard')
  })
})

