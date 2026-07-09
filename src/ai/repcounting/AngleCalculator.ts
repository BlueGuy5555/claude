import type { Point } from '../types';

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Stateless geometry helpers for turning joint coordinates into the angles,
 * distances and orientations the rep detector reasons about.
 *
 * Every method is pure and side-effect free. Coordinates are the model's
 * square-normalized `[0, 1]` space, where `x` grows to the right and `y` grows
 * *downward* (image convention). Because the interior-angle math depends only
 * on relative positions, joint angles are invariant to translation, rotation,
 * scale and mirroring — they behave identically no matter how the camera is
 * held. Positional measures (heights, inclination) are *not* rotation
 * invariant, which is exactly why we normalize them by body scale before using
 * them (see {@link PoseAnalyzer}).
 */
export class AngleCalculator {
  /**
   * Interior angle in degrees (`0–180`) at vertex `b`, formed by the segments
   * `b→a` and `b→c`. This is the workhorse: an elbow angle is
   * `angle(shoulder, elbow, wrist)`, a knee angle is `angle(hip, knee, ankle)`,
   * a hip/straightness angle is `angle(shoulder, hip, knee)`.
   */
  static angle(a: Point, b: Point, c: Point): number {
    const abx = a.x - b.x;
    const aby = a.y - b.y;
    const cbx = c.x - b.x;
    const cby = c.y - b.y;

    const magAb = Math.hypot(abx, aby);
    const magCb = Math.hypot(cbx, cby);
    if (magAb === 0 || magCb === 0) return 0;

    const dot = abx * cbx + aby * cby;
    // Clamp guards against tiny floating-point overshoots outside [-1, 1].
    const cos = Math.min(1, Math.max(-1, dot / (magAb * magCb)));
    return Math.acos(cos) * RAD_TO_DEG;
  }

  /** Euclidean distance between two points. */
  static distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Midpoint of a segment — used to collapse a bilateral pair to one point. */
  static midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /**
   * Inclination of segment `a→b` relative to the horizontal, in degrees
   * `[0, 90]`. `0` means perfectly horizontal (a plank torso), `90` means
   * perfectly vertical (a standing torso). This single number is what lets the
   * detector tell a push-up (horizontal body) apart from someone sitting or
   * standing and waving their arms (vertical body).
   */
  static inclinationFromHorizontal(a: Point, b: Point): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (dx === 0 && dy === 0) return 0;
    return Math.atan2(dy, dx) * RAD_TO_DEG;
  }
}
