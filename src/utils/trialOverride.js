/**
 * Pure helpers for admin-granted time-limited trial overrides.
 *
 * `beta` and `lifetime` overrides are permanent (overrideExpiresAt = null).
 * `trial` overrides have an ISO expiry date in overrideExpiresAt.
 */

/**
 * Returns days remaining for a trial override, or null for permanent overrides.
 * Returns 0 (never negative) when the trial has already expired.
 *
 * @param {string | null | undefined} overrideExpiresAt - ISO timestamp or null
 * @returns {number | null}
 */
export function computeOverrideDaysRemaining(overrideExpiresAt) {
  if (!overrideExpiresAt) return null
  const ms = new Date(overrideExpiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

/**
 * Returns true only when an expiry date is set AND is in the past.
 * Permanent overrides (null) are never expired.
 *
 * @param {string | null | undefined} overrideExpiresAt - ISO timestamp or null
 * @returns {boolean}
 */
export function isOverrideExpired(overrideExpiresAt) {
  if (!overrideExpiresAt) return false
  return new Date(overrideExpiresAt).getTime() < Date.now()
}

/**
 * Builds the overrideExpiresAt ISO string for a given override type and day count.
 * Returns null for permanent override types (beta, lifetime, null).
 *
 * @param {string | null} override - 'trial' | 'beta' | 'lifetime' | null
 * @param {number} days - number of days for the trial
 * @returns {string | null}
 */
export function buildOverrideExpiresAt(override, days) {
  if (override !== 'trial') return null
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}
