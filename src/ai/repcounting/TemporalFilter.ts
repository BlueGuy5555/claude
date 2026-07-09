/**
 * Temporal filtering primitives.
 *
 * Pose estimation is noisy and the frame rate is low and irregular (10–15 FPS
 * on a mid-range phone, and never perfectly spaced). Every technique here is a
 * defence against that reality:
 *
 * - {@link Ema} — exponential smoothing that kills high-frequency jitter.
 * - {@link MovingAverage} — a fixed-window mean, a second opinion for gates.
 * - {@link VelocityEstimator} — direction/speed from frame *differences*, so we
 *   can tell "going down" from "going up" even at low FPS.
 * - {@link Confirmation} — consecutive-frame confirmation of a boolean.
 * - {@link TemporalFilter} — bundles smoothing + velocity for a single signal.
 *
 * All are `dt`-aware where it matters, so irregular frame spacing does not bias
 * the result.
 */

/** Exponential moving average: `y ← α·x + (1−α)·y`. */
export class Ema {
  private y: number | null = null;

  /** @param alpha smoothing factor in `(0, 1]`; smaller = smoother/laggier. */
  constructor(private readonly alpha: number) {}

  get value(): number | null {
    return this.y;
  }

  update(x: number): number {
    this.y = this.y === null ? x : this.alpha * x + (1 - this.alpha) * this.y;
    return this.y;
  }

  reset(): void {
    this.y = null;
  }
}

/** Fixed-window arithmetic mean over the last `size` samples. */
export class MovingAverage {
  private readonly buf: number[] = [];

  constructor(private readonly size: number) {}

  get value(): number | null {
    if (this.buf.length === 0) return null;
    return this.buf.reduce((s, v) => s + v, 0) / this.buf.length;
  }

  update(x: number): number {
    this.buf.push(x);
    if (this.buf.length > this.size) this.buf.shift();
    return this.value as number;
  }

  reset(): void {
    this.buf.length = 0;
  }
}

/**
 * Estimates the rate of change of a signal (units per second) from consecutive
 * samples, then smooths that estimate so a single noisy frame can't flip the
 * sign. Because it divides by the *actual* elapsed time, a dropped frame or an
 * irregular interval doesn't distort the velocity — essential when the camera
 * delivers frames unevenly.
 */
export class VelocityEstimator {
  private lastX: number | null = null;
  private lastT: number | null = null;
  private readonly ema: Ema;

  constructor(smoothing = 0.5) {
    this.ema = new Ema(smoothing);
  }

  get value(): number {
    return this.ema.value ?? 0;
  }

  /** @param tMs timestamp in milliseconds. */
  update(x: number, tMs: number): number {
    if (this.lastX === null || this.lastT === null || tMs <= this.lastT) {
      this.lastX = x;
      this.lastT = tMs;
      return this.ema.value ?? 0;
    }
    const dtSec = (tMs - this.lastT) / 1000;
    const raw = (x - this.lastX) / dtSec;
    this.lastX = x;
    this.lastT = tMs;
    return this.ema.update(raw);
  }

  reset(): void {
    this.lastX = null;
    this.lastT = null;
    this.ema.reset();
  }
}

/**
 * Counts how many consecutive updates a condition has held. Turning a
 * momentary `true` into "true for N frames in a row" is the cheapest, most
 * reliable way to reject one-frame flukes in a boolean gate.
 */
export class Confirmation {
  private streak = 0;

  constructor(private readonly needed: number) {}

  /** Returns `true` once the condition has held for `needed` frames. */
  update(condition: boolean): boolean {
    this.streak = condition ? this.streak + 1 : 0;
    return this.streak >= this.needed;
  }

  get confirmed(): boolean {
    return this.streak >= this.needed;
  }

  reset(): void {
    this.streak = 0;
  }
}

export interface TemporalFilterResult {
  /** Smoothed value (EMA). */
  value: number;
  /** Smoothed rate of change, units per second. */
  velocity: number;
  /** Fixed-window mean (a lag-heavy, jitter-immune second opinion). */
  average: number;
}

export interface TemporalFilterConfig {
  /** EMA factor for the value channel, `(0, 1]`. */
  emaAlpha: number;
  /** Window length for the moving-average channel. */
  windowSize: number;
  /** EMA factor for the velocity channel, `(0, 1]`. */
  velocitySmoothing: number;
}

/**
 * A single scalar signal, smoothed three ways at once. The rep detector feeds
 * it the raw per-frame `depth` and reads back a de-jittered value plus a signed
 * velocity it can trust.
 */
export class TemporalFilter {
  private readonly ema: Ema;
  private readonly avg: MovingAverage;
  private readonly vel: VelocityEstimator;

  constructor(config: TemporalFilterConfig) {
    this.ema = new Ema(config.emaAlpha);
    this.avg = new MovingAverage(config.windowSize);
    this.vel = new VelocityEstimator(config.velocitySmoothing);
  }

  update(x: number, tMs: number): TemporalFilterResult {
    const value = this.ema.update(x);
    const average = this.avg.update(x);
    // Velocity is measured on the *smoothed* value so it inherits its stability.
    const velocity = this.vel.update(value, tMs);
    return { value, velocity, average };
  }

  reset(): void {
    this.ema.reset();
    this.avg.reset();
    this.vel.reset();
  }
}
