/**
 * Thin wrapper around Plausible Analytics custom events.
 * No-ops silently when window.plausible is undefined (dev, ad-blockers).
 */
export function trackEvent(name, props = {}) {
  if (typeof window.plausible !== 'undefined') {
    window.plausible(name, { props });
  }
}
