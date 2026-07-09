/**
 * Small, dependency-free helpers shared by the chart components. Kept pure so
 * the scaling maths can be reasoned about (and unit-tested) independently of the
 * SVG rendering.
 */
import type { ChartPoint } from '@/types';

/** Round a raw maximum up to a visually "nice" axis bound (1/2/5 × 10ⁿ). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const fraction = value / magnitude;
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * magnitude;
}

/** The largest value in a series (0 for an empty series). */
export function seriesMax(points: ChartPoint[]): number {
  return points.reduce((max, p) => (p.value > max ? p.value : max), 0);
}

/** True when every point in the series is zero (or the series is empty). */
export function isEmptySeries(points: ChartPoint[]): boolean {
  return points.every((p) => p.value === 0);
}

/**
 * Map a series to SVG points within a plotting box, returning both the polyline
 * coordinates and the maximum used (so the caller can render a matching area).
 */
export function toLinePoints(
  points: ChartPoint[],
  width: number,
  height: number,
  padding: { top: number; bottom: number },
  max: number,
): { x: number; y: number }[] {
  const plotHeight = height - padding.top - padding.bottom;
  const denom = Math.max(1, points.length - 1);
  return points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : (i / denom) * width;
    const y = padding.top + plotHeight * (1 - (max > 0 ? p.value / max : 0));
    return { x, y };
  });
}

/** Build an SVG path `d` string through the given points (straight segments). */
export function linePath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  return coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ');
}

/** Build a closed area path (line + baseline) for the fill under a line. */
export function areaPath(
  coords: { x: number; y: number }[],
  height: number,
  bottomPadding: number,
): string {
  if (coords.length === 0) return '';
  const baseline = height - bottomPadding;
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  return `${linePath(coords)} L${last.x.toFixed(2)},${baseline.toFixed(2)} L${first.x.toFixed(
    2,
  )},${baseline.toFixed(2)} Z`;
}
