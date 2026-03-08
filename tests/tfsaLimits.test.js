import { describe, it, expect } from 'vitest';
import { estimateTfsaRoom, cumulativeTfsaLimit, estimateRrspRoom } from '../src/constants/tfsaLimits.js';

describe('estimateTfsaRoom', () => {
  it('age 37, 2026, $0 balance → $109,000 (eligible since 2009)', () => {
    expect(estimateTfsaRoom(37, 2026, 0)).toBe(109000);
  });

  it('age 37, 2026, $80K balance → $29,000', () => {
    expect(estimateTfsaRoom(37, 2026, 80000)).toBe(29000);
  });

  it('age 20, 2026, $0 balance → $21,000 (eligible 2024-2026)', () => {
    // Turned 18 in 2024: 2024=$7K + 2025=$7K + 2026=$7K = $21K
    expect(estimateTfsaRoom(20, 2026, 0)).toBe(21000);
  });

  it('balance exceeds lifetime limit → clamped to 0', () => {
    expect(estimateTfsaRoom(37, 2026, 200000)).toBe(0);
  });

  it('age 17 → no eligible years → 0', () => {
    // Not yet 18, eligible from 2027 which is past 2026
    expect(estimateTfsaRoom(17, 2026, 0)).toBe(0);
  });
});

describe('cumulativeTfsaLimit', () => {
  it('age 37, 2026 → $109,000', () => {
    expect(cumulativeTfsaLimit(37, 2026)).toBe(109000);
  });

  it('age 20, 2026 → $21,000', () => {
    expect(cumulativeTfsaLimit(20, 2026)).toBe(21000);
  });
});

describe('estimateRrspRoom', () => {
  it('age 37, $100K income, $200K balance → ~$142K', () => {
    // workingYears = min(37-18, 35) = 19
    // annualRoom = min(100000*0.18, 32490) = $18,000
    // total = 19 * 18000 - 200000 = 342000 - 200000 = $142,000
    expect(estimateRrspRoom(37, 100000, 200000)).toBe(142000);
  });

  it('age 37, $0 income, $0 balance → 0', () => {
    expect(estimateRrspRoom(37, 0, 0)).toBe(0);
  });

  it('age 18, any income → 0 working years', () => {
    expect(estimateRrspRoom(18, 100000, 0)).toBe(0);
  });

  it('DC pension and LIRA reduce room', () => {
    const withoutDc = estimateRrspRoom(37, 100000, 100000);
    const withDc = estimateRrspRoom(37, 100000, 100000, 50000, 20000);
    expect(withDc).toBe(withoutDc - 70000);
  });

  it('high income caps at $32,490/yr', () => {
    // workingYears = min(55-18, 35) = 35
    // annualRoom = min(500000*0.18, 32490) = $32,490
    // total = 35 * 32490 - 0 = $1,137,150
    expect(estimateRrspRoom(55, 500000, 0)).toBe(1137150);
  });

  it('result clamped to 0 when balance exceeds estimate', () => {
    expect(estimateRrspRoom(25, 50000, 999999)).toBe(0);
  });
});
