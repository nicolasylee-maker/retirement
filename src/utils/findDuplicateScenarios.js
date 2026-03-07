export function findDuplicateScenarios(scenarios) {
  const myPlans = scenarios.filter(s => s.name === 'My Plan');
  if (myPlans.length <= 1) return { keep: null, dupes: [] };
  const sorted = [...myPlans].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  return { keep: sorted[0], dupes: sorted.slice(1) };
}
