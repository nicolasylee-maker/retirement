/**
 * GA4 event tracking helpers.
 * All events flow through gtag() which is loaded in index.html.
 * Safe to call even if gtag hasn't loaded yet (window.gtag guard).
 */

const GA_ID = 'G-B91FHSWDRX'

export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag !== 'function') return
  window.gtag('event', eventName, { send_to: GA_ID, ...params })
}

export const GA = {
  signUp:            () => trackEvent('sign_up'),
  scenarioCreated:   () => trackEvent('scenario_created'),
  upgradeClick:      (location = '') => trackEvent('upgrade_click', { location }),
  subscriptionStart: () => trackEvent('subscription_start'),
  exportExcel:       () => trackEvent('export_excel'),
  exportPdf:         () => trackEvent('export_pdf'),
}
