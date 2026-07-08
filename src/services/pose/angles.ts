import type { Keypoint } from '@/types';

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Interior angle (in degrees, `0..180`) at vertex `b` formed by the segments
 * `b→a` and `b→c`. This is the workhorse of joint analysis: an elbow angle is
 * the angle at the elbow between the shoulder and the wrist, a knee angle is
 * the angle at the knee between the hip and the ankle, and so on.
 *
 * Returns `null` when a segment has (near) zero length, which would make the
 * angle undefined — callers treat `null` as "not measurable this frame".
 */
export function jointAngle(a: Keypoint, b: Keypoint, c: Keypoint): number | null {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;

  const abLen = Math.hypot(abx, aby);
  const cbLen = Math.hypot(cbx, cby);
  if (abLen < 1e-6 || cbLen < 1e-6) return null;

  const dot = abx * cbx + aby * cby;
  // Clamp to guard against floating-point drift pushing |cos| slightly past 1.
  const cos = Math.min(1, Math.max(-1, dot / (abLen * cbLen)));
  return Math.acos(cos) * RAD_TO_DEG;
}

/**
 * Angle of the segment `a→b` measured from the positive x-axis, in degrees
 * `(-180, 180]`. Used to judge body orientation (e.g. a horizontal torso for a
 * plank vs. a vertical torso for a squat).
 */
export function segmentAngle(a: Keypoint, b: Keypoint): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * RAD_TO_DEG;
}

/**
 * Linearly map `value` from the input range onto `[0, 1]`, clamped. Used to
 * turn a raw joint angle into a normalized "movement progress" where 0 is the
 * top of the rep and 1 is the bottom, regardless of the exercise.
 */
export function normalizeProgress(value: number, atZero: number, atOne: number): number {
  if (atZero === atOne) return 0;
  const t = (value - atZero) / (atOne - atZero);
  return Math.min(1, Math.max(0, t));
}
