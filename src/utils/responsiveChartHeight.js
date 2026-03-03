/**
 * Returns mobileH when windowWidth < 640, otherwise desktopH.
 * Pure function — accepts width as a parameter so it's easily testable.
 *
 * Usage in components:
 *   const height = responsiveChartHeight(window.innerWidth, 200, 320);
 */
export function responsiveChartHeight(windowWidth, mobileH, desktopH) {
  return windowWidth < 640 ? mobileH : desktopH;
}
