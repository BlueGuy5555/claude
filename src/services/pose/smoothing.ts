import { KEYPOINT_NAMES, type Pose } from '@/types';

/**
 * A "1€ filter" (Casiez, Roussel & Vogel, 2012) for a single scalar signal.
 *
 * It is the de-facto standard for smoothing noisy, interactive tracking data:
 * at low speeds it filters hard to kill jitter, and as the signal speeds up it
 * relaxes to stay responsive and avoid lag. That adaptivity is exactly what a
 * hand or knee keypoint needs — steady while you pause at the top of a rep, but
 * snappy through the fast part of the movement.
 */
export class OneEuroFilter {
  private hatPrev: number | null = null;
  private dxHatPrev = 0;
  private tPrev = 0;

  constructor(
    private readonly minCutoff = 1.2,
    private readonly beta = 0.02,
    private readonly dCutoff = 1.0,
  ) {}

  private static alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  /** Filter one sample taken at `timestampMs`. */
  filter(value: number, timestampMs: number): number {
    if (this.hatPrev === null) {
      this.hatPrev = value;
      this.tPrev = timestampMs;
      return value;
    }

    // Guard against zero/negative dt (duplicate timestamps) with a small floor.
    const dt = Math.max((timestampMs - this.tPrev) / 1000, 1e-3);
    this.tPrev = timestampMs;

    const dx = (value - this.hatPrev) / dt;
    const dxHat =
      this.dxHatPrev + OneEuroFilter.alpha(this.dCutoff, dt) * (dx - this.dxHatPrev);
    this.dxHatPrev = dxHat;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const hat = this.hatPrev + OneEuroFilter.alpha(cutoff, dt) * (value - this.hatPrev);
    this.hatPrev = hat;
    return hat;
  }

  reset(): void {
    this.hatPrev = null;
    this.dxHatPrev = 0;
    this.tPrev = 0;
  }
}

/**
 * Smooths a whole pose, one 1€ filter per keypoint coordinate.
 *
 * To minimize garbage collection during a workout the smoother writes into a
 * single reused {@link Pose} buffer and returns it every frame. Callers that
 * need to keep a pose across frames (e.g. React state for the skeleton) must
 * clone it with {@link clonePose}; the rep-counting pipeline consumes it
 * synchronously and does not.
 *
 * Low-confidence joints are passed through untouched (their filter is *not*
 * advanced) so a brief dropout doesn't poison the filter state and cause a jump
 * when the joint reappears — this is what lets tracking recover cleanly.
 */
export class PoseSmoother {
  private readonly xf: OneEuroFilter[];
  private readonly yf: OneEuroFilter[];
  private readonly out: Pose;

  constructor(private readonly missingThreshold = 0.2) {
    this.xf = KEYPOINT_NAMES.map(() => new OneEuroFilter());
    this.yf = KEYPOINT_NAMES.map(() => new OneEuroFilter());
    this.out = {
      keypoints: KEYPOINT_NAMES.map(() => ({ x: 0, y: 0, score: 0 })),
      score: 0,
      timestamp: 0,
    };
  }

  smooth(pose: Pose): Pose {
    for (let i = 0; i < pose.keypoints.length; i += 1) {
      const kp = pose.keypoints[i]!;
      const o = this.out.keypoints[i]!;
      if (kp.score >= this.missingThreshold) {
        o.x = this.xf[i]!.filter(kp.x, pose.timestamp);
        o.y = this.yf[i]!.filter(kp.y, pose.timestamp);
      }
      // For a missing joint we keep the last smoothed x/y and just carry the
      // low score forward, so downstream visibility checks reject it.
      o.score = kp.score;
    }
    this.out.score = pose.score;
    this.out.timestamp = pose.timestamp;
    return this.out;
  }

  reset(): void {
    for (const f of this.xf) f.reset();
    for (const f of this.yf) f.reset();
  }
}

/** Deep-clone a pose so it can be safely stored across frames. */
export function clonePose(pose: Pose): Pose {
  return {
    score: pose.score,
    timestamp: pose.timestamp,
    keypoints: pose.keypoints.map((kp) => ({ x: kp.x, y: kp.y, score: kp.score })),
  };
}
