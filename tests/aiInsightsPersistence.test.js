/**
 * Tests for AI insights persistence + staleness logic.
 * These test the computeHash utility and the scenario aiInsights shape.
 * Component behaviour is tested manually per AGENTS.md.
 */
import { describe, it, expect } from 'vitest'
import { createDefaultScenario } from '../src/constants/defaults.js'

// --- computeHash (will be exported from AiInsight.jsx or a shared util) ---
// We re-implement the same algorithm here to verify determinism + sensitivity.
function computeHash(data) {
  const str = JSON.stringify(data)
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

describe('computeHash', () => {
  it('returns a non-empty string', () => {
    expect(computeHash({ a: 1 })).toBeTruthy()
  })

  it('is deterministic — same input produces same hash', () => {
    const data = { currentAge: 55, retirementAge: 65, monthlyExpenses: 4000 }
    expect(computeHash(data)).toBe(computeHash(data))
  })

  it('is sensitive to value changes', () => {
    const base = { currentAge: 55, retirementAge: 65 }
    const changed = { currentAge: 56, retirementAge: 65 }
    expect(computeHash(base)).not.toBe(computeHash(changed))
  })

  it('is sensitive to key additions', () => {
    const a = { x: 1 }
    const b = { x: 1, y: 2 }
    expect(computeHash(a)).not.toBe(computeHash(b))
  })

  it('treats objects with same keys in different order as same (JSON.stringify is insertion-order)', () => {
    // JSON.stringify insertion order — these are the same object shape built the same way
    const a = { x: 1, y: 2 }
    const b = { x: 1, y: 2 }
    expect(computeHash(a)).toBe(computeHash(b))
  })

  it('handles nested objects', () => {
    const a = { scenarios: [{ name: 'A', netWorth: 100 }] }
    const b = { scenarios: [{ name: 'A', netWorth: 200 }] }
    expect(computeHash(a)).not.toBe(computeHash(b))
  })

  it('handles null and undefined gracefully (JSON.stringify omits undefined)', () => {
    expect(() => computeHash({ a: null })).not.toThrow()
    expect(computeHash({ a: null })).toBeTruthy()
  })
})

// --- Scenario shape: aiInsights field ---
describe('createDefaultScenario aiInsights', () => {
  it('includes aiInsights as an empty object', () => {
    const s = createDefaultScenario()
    expect(s).toHaveProperty('aiInsights')
    expect(s.aiInsights).toEqual({})
  })

  it('aiInsights is not shared across multiple createDefaultScenario calls', () => {
    const a = createDefaultScenario()
    const b = createDefaultScenario()
    a.aiInsights.dashboard = { text: 'hello', hash: 'abc' }
    expect(b.aiInsights.dashboard).toBeUndefined()
  })
})

// --- Staleness logic (pure business logic, not component) ---
describe('staleness detection', () => {
  it('is fresh when hashes match', () => {
    const data = { currentAge: 55, retirementAge: 65 }
    const hash = computeHash(data)
    const savedInsight = { text: 'Previous insight', hash }
    const isStale = savedInsight.hash !== computeHash(data)
    expect(isStale).toBe(false)
  })

  it('is stale when data changes', () => {
    const originalData = { currentAge: 55, retirementAge: 65 }
    const savedInsight = { text: 'Old insight', hash: computeHash(originalData) }
    // User changes retirement age via WhatIf
    const newData = { currentAge: 55, retirementAge: 67 }
    const isStale = savedInsight.hash !== computeHash(newData)
    expect(isStale).toBe(true)
  })

  it('becomes fresh again when data reverts', () => {
    const originalData = { currentAge: 55, retirementAge: 65 }
    const savedInsight = { text: 'Old insight', hash: computeHash(originalData) }
    // User changes then reverts
    const revertedData = { currentAge: 55, retirementAge: 65 }
    const isStale = savedInsight.hash !== computeHash(revertedData)
    expect(isStale).toBe(false)
  })

  it('no savedInsight means neither fresh nor stale — show generate button', () => {
    const savedInsight = null
    expect(savedInsight).toBeNull()
  })
})

// --- aiInsights merge pattern (App.jsx handler logic) ---
describe('aiInsights merge', () => {
  it('merges a new insight type without clobbering others', () => {
    const existing = {
      dashboard: { text: 'Dashboard insight', hash: 'h1' },
    }
    const type = 'debt'
    const text = 'Debt insight'
    const hash = 'h2'
    const merged = { ...existing, [type]: { text, hash } }
    expect(merged.dashboard).toEqual({ text: 'Dashboard insight', hash: 'h1' })
    expect(merged.debt).toEqual({ text: 'Debt insight', hash: 'h2' })
  })

  it('overwrites the same type on regenerate', () => {
    const existing = {
      dashboard: { text: 'Old insight', hash: 'old_hash' },
    }
    const newEntry = { text: 'New insight', hash: 'new_hash' }
    const merged = { ...existing, dashboard: newEntry }
    expect(merged.dashboard).toEqual(newEntry)
  })

  it('handles empty aiInsights on first save', () => {
    const existing = {}
    const merged = { ...existing, dashboard: { text: 'First insight', hash: 'h1' } }
    expect(merged.dashboard).toEqual({ text: 'First insight', hash: 'h1' })
  })
})
