const PROVINCE_LABELS = {
  ON: 'Ontario',
  BC: 'British Columbia',
  AB: 'Alberta',
  SK: 'Saskatchewan',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NS: 'Nova Scotia',
  NL: 'Newfoundland and Labrador',
  PE: 'Prince Edward Island',
};

/**
 * Decides where to route a user after authentication completes.
 * @param {Array} scenarios - current loaded scenarios
 * @returns {'returning-home' | 'wizard'}
 */
export function getSignInRoute(scenarios) {
  return scenarios.length > 0 ? 'returning-home' : 'wizard';
}

/**
 * Decides whether to skip the scenario picker.
 * @param {Array} scenarios
 * @returns {{ skip: true, scenarioId: string } | { skip: false }}
 */
export function getPickerTarget(scenarios) {
  if (scenarios.length === 1) {
    return { skip: true, scenarioId: scenarios[0].id };
  }
  return { skip: false };
}

/**
 * Formats the display metadata for a scenario row in the picker.
 * @param {Object} scenario
 * @returns {{ provinceLabel: string, agesLabel: string, coupleLabel: string }}
 */
export function formatScenarioMeta(scenario) {
  const { province, retirementAge, lifeExpectancy, isCouple } = scenario;

  const provinceLabel = province
    ? (PROVINCE_LABELS[province] ?? province)
    : '—';

  const agesLabel =
    retirementAge != null && lifeExpectancy != null
      ? `Retire ${retirementAge} · Plan to ${lifeExpectancy}`
      : '—';

  const coupleLabel = isCouple ? 'Couple' : 'Single';

  return { provinceLabel, agesLabel, coupleLabel };
}
