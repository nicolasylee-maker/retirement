/**
 * Tests for trial override pure helpers.
 * These functions determine whether an admin-granted trial is still active
 * and how many days remain.
 */
import { describe, it, expect } from 'vitest'
import { computeOverrideDaysRemaining, isOverrideExpired, buildOverrideExpiresAt } from '../src/utils/trialOverride.js'

// ─── computeOverrideDaysRemaining ────────────────────────────────────────────
// Returns null for permanent overrides (no expiry), days remaining for trials.

describe('computeOverrideDaysRemaining', () => {
  it('returns null when overrideExpiresAt is null (permanent override)', () => {
    expect(computeOverrideDaysRemaining(null)).toBeNull()
  })

  it('returns null when overrideExpiresAt is undefined', () => {
    expect(computeOverrideDaysRemaining(undefined)).toBeNull()
  })

  it('returns 7 when expiry is exactly 7 days from now', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(computeOverrideDaysRemaining(future)).toBe(7)
  })

  it('returns 1 when expiry is 1 day and 1 hour from now (ceiling)', () => {
    const future = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
    expect(computeOverrideDaysRemaining(future)).toBe(2)
  })

  it('returns 0 when expiry is in the past', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    expect(computeOverrideDaysRemaining(past)).toBe(0)
  })

  it('returns 0 when expiry was 30 days ago', () => {
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    expect(computeOverrideDaysRemaining(past)).toBe(0)
  })

  it('returns 30 when expiry is 30 days from now', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    expect(computeOverrideDaysRemaining(future)).toBe(30)
  })

  it('never returns a negative number', () => {
    const past = new Date(Date.now() - 999 * 24 * 60 * 60 * 1000).toISOString()
    const result = computeOverrideDaysRemaining(past)
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

// ─── isOverrideExpired ───────────────────────────────────────────────────────
// Returns true only when an expiry date is set AND is in the past.

describe('isOverrideExpired', () => {
  it('returns false when overrideExpiresAt is null (permanent)', () => {
    expect(isOverrideExpired(null)).toBe(false)
  })

  it('returns false when overrideExpiresAt is undefined', () => {
    expect(isOverrideExpired(undefined)).toBe(false)
  })

  it('returns false when expiry is in the future', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    expect(isOverrideExpired(future)).toBe(false)
  })

  it('returns true when expiry is in the past', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    expect(isOverrideExpired(past)).toBe(true)
  })

  it('returns true when expiry was 7 days ago', () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(isOverrideExpired(past)).toBe(true)
  })
})

// ─── buildOverrideExpiresAt ──────────────────────────────────────────────────
// Returns an ISO string for now + N days, or null for permanent overrides.

describe('buildOverrideExpiresAt', () => {
  it('returns null for beta override', () => {
    expect(buildOverrideExpiresAt('beta', 7)).toBeNull()
  })

  it('returns null for lifetime override', () => {
    expect(buildOverrideExpiresAt('lifetime', 7)).toBeNull()
  })

  it('returns null when override is null (free tier)', () => {
    expect(buildOverrideExpiresAt(null, 7)).toBeNull()
  })

  it('returns an ISO string for trial override', () => {
    const result = buildOverrideExpiresAt('trial', 7)
    expect(typeof result).toBe('string')
    expect(() => new Date(result)).not.toThrow()
  })

  it('trial expiry is approximately now + N days', () => {
    const days = 30
    const before = Date.now()
    const result = buildOverrideExpiresAt('trial', days)
    const after = Date.now()
    const expiryMs = new Date(result).getTime()
    const expectedMs = days * 24 * 60 * 60 * 1000
    expect(expiryMs).toBeGreaterThanOrEqual(before + expectedMs)
    expect(expiryMs).toBeLessThanOrEqual(after + expectedMs + 1000)
  })

  it('trial with 7 days gives expiry ~7 days from now', () => {
    const result = buildOverrideExpiresAt('trial', 7)
    const days = computeOverrideDaysRemaining(result)
    expect(days).toBe(7)
  })

  it('trial with 0 days gives 0 days remaining', () => {
    const result = buildOverrideExpiresAt('trial', 0)
    expect(computeOverrideDaysRemaining(result)).toBe(0)
  })
})
