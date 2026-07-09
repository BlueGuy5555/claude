import type { Point } from './types';

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Interior angle (in degrees, `0–180`) at vertex `b` formed by the segments
 * `b→a` and `b→c`. This is the workhorse for rep counting: an elbow angle, a
 * knee angle, a shoulder angle are all "the angle at joint b between the two
 * adjacent limbs".
 *
 * Because it depends only on the relative positions of the three joints, the
 * result is invariant to translation, rotation, scale and mirroring of the
 * whole pose — so it behaves identically regardless of camera orientation.
 */
export function angleDeg(a: Point, b: Point, c: Point): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;

  const dot = abx * cbx + aby * cby;
  const magAb = Math.hypot(abx, aby);
  const magCb = Math.hypot(cbx, cby);

  if (magAb === 0 || magCb === 0) return 0;

  // Clamp to guard against tiny floating-point overshoots outside [-1, 1].
  const cos = Math.min(1, Math.max(-1, dot / (magAb * magCb)));
  return Math.acos(cos) * RAD_TO_DEG;
}

/** Arithmetic mean of a non-empty list; returns `null` for an empty list. */
export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}
