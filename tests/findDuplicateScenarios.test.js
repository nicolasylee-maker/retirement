import { describe, it, expect } from 'vitest';
import { findDuplicateScenarios } from '../src/utils/findDuplicateScenarios';

describe('findDuplicateScenarios', () => {
  it('returns the newest "My Plan" and 1 dupe when two exist', () => {
    const scenarios = [
      { id: 'a', name: 'My Plan', createdAt: '2025-01-01T00:00:00Z' },
      { id: 'b', name: 'My Plan', createdAt: '2025-01-02T00:00:00Z' },
    ];
    const { keep, dupes } = findDuplicateScenarios(scenarios);
    expect(keep.id).toBe('b');
    expect(dupes).toHaveLength(1);
    expect(dupes[0].id).toBe('a');
  });

  it('returns the newest and 2 dupes when three "My Plan" exist', () => {
    const scenarios = [
      { id: 'a', name: 'My Plan', createdAt: '2025-01-01T00:00:00Z' },
      { id: 'b', name: 'My Plan', createdAt: '2025-01-03T00:00:00Z' },
      { id: 'c', name: 'My Plan', createdAt: '2025-01-02T00:00:00Z' },
    ];
    const { keep, dupes } = findDuplicateScenarios(scenarios);
    expect(keep.id).toBe('b');
    expect(dupes).toHaveLength(2);
    expect(dupes.map(d => d.id).sort()).toEqual(['a', 'c']);
  });

  it('returns no dupes when only one "My Plan" exists', () => {
    const scenarios = [
      { id: 'a', name: 'My Plan', createdAt: '2025-01-01T00:00:00Z' },
    ];
    const { keep, dupes } = findDuplicateScenarios(scenarios);
    expect(keep).toBeNull();
    expect(dupes).toHaveLength(0);
  });

  it('does not treat different names as duplicates', () => {
    const scenarios = [
      { id: 'a', name: 'My Plan', createdAt: '2025-01-01T00:00:00Z' },
      { id: 'b', name: 'My Plan (2)', createdAt: '2025-01-02T00:00:00Z' },
    ];
    const { keep, dupes } = findDuplicateScenarios(scenarios);
    expect(keep).toBeNull();
    expect(dupes).toHaveLength(0);
  });

  it('returns no dupes for an empty array', () => {
    const { keep, dupes } = findDuplicateScenarios([]);
    expect(keep).toBeNull();
    expect(dupes).toHaveLength(0);
  });
});
