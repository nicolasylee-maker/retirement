/**
 * Tests for the returning user flow routing helpers and scenario display logic.
 * All functions under test are pure — no React, no DOM.
 */
import { describe, it, expect } from 'vitest'
import {
  getSignInRoute,
  getPickerTarget,
  formatScenarioMeta,
} from '../src/utils/returningUserFlow.js'

// ─── getSignInRoute ──────────────────────────────────────────────────────────
// Decides where to send a user after authentication completes.
// Returns: 'returning-home' | 'wizard'

describe('getSignInRoute', () => {
  it('returns wizard for a brand-new user with no scenarios', () => {
    expect(getSignInRoute([])).toBe('wizard')
  })

  it('returns returning-home for a user with one saved scenario', () => {
    expect(getSignInRoute([{ id: '1' }])).toBe('returning-home')
  })

  it('returns returning-home for a user with multiple saved scenarios', () => {
    expect(getSignInRoute([{ id: '1' }, { id: '2' }, { id: '3' }])).toBe('returning-home')
  })

  it('returns wizard when scenarios array is empty', () => {
    expect(getSignInRoute([])).toBe('wizard')
  })
})

// ─── getPickerTarget ─────────────────────────────────────────────────────────
// Decides whether to show the scenario picker or go directly.
// Returns: { skip: true, scenarioId } | { skip: false }

describe('getPickerTarget', () => {
  const s1 = { id: 'abc' }
  const s2 = { id: 'def' }

  it('skips picker and returns scenarioId when only 1 scenario', () => {
    const result = getPickerTarget([s1])
    expect(result.skip).toBe(true)
    expect(result.scenarioId).toBe('abc')
  })

  it('does not skip picker when 2 scenarios exist', () => {
    const result = getPickerTarget([s1, s2])
    expect(result.skip).toBe(false)
    expect(result.scenarioId).toBeUndefined()
  })

  it('does not skip picker when 3+ scenarios exist', () => {
    const result = getPickerTarget([s1, s2, { id: 'ghi' }])
    expect(result.skip).toBe(false)
  })

  it('skips and uses first scenario when only 1', () => {
    const result = getPickerTarget([{ id: 'only-one' }])
    expect(result.skip).toBe(true)
    expect(result.scenarioId).toBe('only-one')
  })
})

// ─── formatScenarioMeta ──────────────────────────────────────────────────────
// Formats the display metadata row for a scenario in the picker.
// Returns: { provinceLabel, agesLabel, coupleLabel }

describe('formatScenarioMeta', () => {
  const base = {
    province: 'ON',
    currentAge: 55,
    retirementAge: 65,
    lifeExpectancy: 90,
    isCouple: false,
  }

  it('formats a basic Ontario single scenario', () => {
    const meta = formatScenarioMeta(base)
    expect(meta.provinceLabel).toBe('Ontario')
    expect(meta.agesLabel).toBe('Retire 65 · Plan to 90')
    expect(meta.coupleLabel).toBe('Single')
  })

  it('formats a couple scenario', () => {
    const meta = formatScenarioMeta({ ...base, isCouple: true })
    expect(meta.coupleLabel).toBe('Couple')
  })

  it('handles all supported provinces', () => {
    const cases = [
      ['ON', 'Ontario'],
      ['BC', 'British Columbia'],
      ['AB', 'Alberta'],
      ['SK', 'Saskatchewan'],
      ['MB', 'Manitoba'],
      ['NB', 'New Brunswick'],
      ['NS', 'Nova Scotia'],
      ['NL', 'Newfoundland and Labrador'],
      ['PE', 'Prince Edward Island'],
    ]
    cases.forEach(([code, label]) => {
      expect(formatScenarioMeta({ ...base, province: code }).provinceLabel).toBe(label)
    })
  })

  it('falls back gracefully when province is missing', () => {
    const meta = formatScenarioMeta({ ...base, province: undefined })
    expect(meta.provinceLabel).toBe('—')
  })

  it('falls back gracefully when province is unknown', () => {
    const meta = formatScenarioMeta({ ...base, province: 'QC' })
    expect(meta.provinceLabel).toBe('QC')
  })

  it('falls back gracefully when ages are missing', () => {
    const meta = formatScenarioMeta({ ...base, retirementAge: undefined, lifeExpectancy: undefined })
    expect(meta.agesLabel).toBe('—')
  })

  it('falls back gracefully when isCouple is undefined', () => {
    const meta = formatScenarioMeta({ ...base, isCouple: undefined })
    expect(meta.coupleLabel).toBe('Single')
  })
})
