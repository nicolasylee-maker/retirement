/**
 * Mobile Polish tests — Phase 2 TDD
 *
 * Tests cover the one pure-logic unit introduced by the mobile-polish spec:
 * `responsiveChartHeight(windowWidth, mobileH, desktopH)`.
 *
 * DOM-based component tests (header layout, drawer rendering, grid classes)
 * require @testing-library/react + jsdom, which are not in this project's
 * dependencies. Those changes are verified visually / via build CI.
 */

import { describe, it, expect } from 'vitest';
import { responsiveChartHeight } from '../src/utils/responsiveChartHeight';

describe('responsiveChartHeight', () => {
  it('returns mobile height when width is below 640px breakpoint', () => {
    expect(responsiveChartHeight(320, 200, 360)).toBe(200);
    expect(responsiveChartHeight(390, 200, 360)).toBe(200);
    expect(responsiveChartHeight(639, 200, 360)).toBe(200);
  });

  it('returns desktop height when width is at or above 640px', () => {
    expect(responsiveChartHeight(640, 200, 360)).toBe(360);
    expect(responsiveChartHeight(1024, 200, 360)).toBe(360);
    expect(responsiveChartHeight(1440, 200, 360)).toBe(360);
  });

  it('handles equal mobile and desktop heights', () => {
    expect(responsiveChartHeight(390, 300, 300)).toBe(300);
    expect(responsiveChartHeight(800, 300, 300)).toBe(300);
  });

  it('works with all five chart presets from the spec', () => {
    // PortfolioChart: 220 mobile / 360 desktop
    expect(responsiveChartHeight(390, 220, 360)).toBe(220);
    expect(responsiveChartHeight(1280, 220, 360)).toBe(360);

    // IncomeExpenseChart: 200 / 320
    expect(responsiveChartHeight(390, 200, 320)).toBe(200);
    expect(responsiveChartHeight(1280, 200, 320)).toBe(320);

    // AccountChart: 200 / 320
    expect(responsiveChartHeight(390, 200, 320)).toBe(200);
    expect(responsiveChartHeight(1280, 200, 320)).toBe(320);

    // WithdrawalChart: 180 / 280
    expect(responsiveChartHeight(390, 180, 280)).toBe(180);
    expect(responsiveChartHeight(1280, 180, 280)).toBe(280);

    // CompareChart: 240 / 400
    expect(responsiveChartHeight(390, 240, 400)).toBe(240);
    expect(responsiveChartHeight(1280, 240, 400)).toBe(400);
  });

  it('treats exactly 639px as mobile', () => {
    expect(responsiveChartHeight(639, 200, 360)).toBe(200);
  });

  it('treats exactly 640px as desktop', () => {
    expect(responsiveChartHeight(640, 200, 360)).toBe(360);
  });
});
