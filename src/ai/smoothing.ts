import { KEYPOINT_NAMES } from './keypoints';
import type { Keypoint, Pose } from './types';

/**
 * One-Euro filter — a low-pass filter whose cutoff frequency adapts to the
 * signal's speed. It is the standard tool for smoothing noisy pose landmarks:
 * when a joint is still it filters aggressively (killing jitter), and when the
 * joint moves fast it filters lightly (avoiding lag). That adaptivity is why
 * the rep counter works across slow and explosive movements alike.
 *
 * Reference: Casiez, Roussel & Vogel, "1€ Filter" (CHI 2012).
 */
class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  private xPrev: number | null = null;
  private dxPrev = 0;

  constructor(minCutoff: number, beta: number, dCutoff: number) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private static alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  /** Filter one sample. `dt` is the seconds elapsed since the previous sample. */
  filter(x: number, dt: number): number {
    if (this.xPrev === null || dt <= 0) {
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }

    const dx = (x - this.xPrev) / dt;
    const aD = OneEuroFilter.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = OneEuroFilter.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }
}

export interface SmootherConfig {
  minCutoff: number;
  beta: number;
  dCutoff: number;
}

/**
 * Coordinates are normalized to `[0, 1]`, so a `minCutoff` around 1–2 Hz with a
 * modest speed coefficient keeps joints steady while remaining responsive.
 */
export const DEFAULT_SMOOTHER_CONFIG: SmootherConfig = {
  minCutoff: 1.7,
  beta: 0.3,
  dCutoff: 1.0,
};

/**
 * Smooths a stream of poses by running an independent One-Euro filter on every
 * keypoint's x and y channel. Keypoint scores are passed through untouched.
 */
export class PoseSmoother {
  private readonly filters: Map<string, OneEuroFilter> = new Map();
  private lastTimestamp: number | null = null;

  constructor(private readonly config: SmootherConfig = DEFAULT_SMOOTHER_CONFIG) {
    for (const name of KEYPOINT_NAMES) {
      this.filters.set(`${name}:x`, this.makeFilter());
      this.filters.set(`${name}:y`, this.makeFilter());
    }
  }

  private makeFilter(): OneEuroFilter {
    return new OneEuroFilter(this.config.minCutoff, this.config.beta, this.config.dCutoff);
  }

  reset(): void {
    for (const name of KEYPOINT_NAMES) {
      this.filters.set(`${name}:x`, this.makeFilter());
      this.filters.set(`${name}:y`, this.makeFilter());
    }
    this.lastTimestamp = null;
  }

  smooth(pose: Pose): Pose {
    const dt =
      this.lastTimestamp === null ? 1 / 30 : (pose.timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = pose.timestamp;

    const keypoints: Keypoint[] = pose.keypoints.map((kp) => {
      const fx = this.filters.get(`${kp.name}:x`)!;
      const fy = this.filters.get(`${kp.name}:y`)!;
      return {
        name: kp.name,
        x: fx.filter(kp.x, dt),
        y: fy.filter(kp.y, dt),
        score: kp.score,
      };
    });

    return { keypoints, score: pose.score, timestamp: pose.timestamp };
  }
}
