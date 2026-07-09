import type { Keypoint } from '../types';

import type { ExerciseConfig, ExercisePhase, RepUpdate } from './types';

type InternalState = 'ready' | 'rest' | 'active';

/**
 * A hysteresis state machine that counts repetitions from a scalar signal.
 *
 * The idea: every rep is a round trip `rest → active → rest`. We arm a rep when
 * the signal crosses `activeThreshold` and complete it only when the signal
 * returns past `restThreshold`. Two separate thresholds (rather than one) give
 * a dead band around the turnaround, so noise near the threshold can't rattle
 * the count up and down.
 *
 * Extra safeguards:
 * - A rep is counted only after a real rest has been observed (`ready` → `rest`
 *   first), so a session that starts mid-motion doesn't log a bogus half rep.
 * - `minRepIntervalMs` debounces against residual jitter and impossibly fast
 *   double transitions.
 * - A `null` signal (joints not confidently visible) freezes the machine
 *   instead of miscounting — the app never crashes when no one is in frame.
 */
export class RepCounter {
  private state: InternalState = 'ready';
  private reps = 0;
  private lastRepAt = 0;
  private lastSignal: number | null = null;

  constructor(private readonly config: ExerciseConfig) {}

  get count(): number {
    return this.reps;
  }

  reset(): void {
    this.state = 'ready';
    this.reps = 0;
    this.lastRepAt = 0;
    this.lastSignal = null;
  }

  private isRest(signal: number): boolean {
    return this.config.restZone === 'high'
      ? signal >= this.config.restThreshold
      : signal <= this.config.restThreshold;
  }

  private isActive(signal: number): boolean {
    return this.config.restZone === 'high'
      ? signal <= this.config.activeThreshold
      : signal >= this.config.activeThreshold;
  }

  /** Feed one pose. `timestamp` is milliseconds. */
  update(keypoints: readonly Keypoint[], timestamp: number, minScore: number): RepUpdate {
    const signal = this.config.signal(keypoints, minScore);
    this.lastSignal = signal;

    let repCompleted = false;

    if (signal !== null) {
      if (this.isRest(signal)) {
        if (
          this.state === 'active' &&
          timestamp - this.lastRepAt >= this.config.minRepIntervalMs
        ) {
          this.reps += 1;
          this.lastRepAt = timestamp;
          repCompleted = true;
        }
        this.state = 'rest';
      } else if (this.isActive(signal)) {
        // Only meaningful once we've established a resting baseline.
        if (this.state !== 'ready') this.state = 'active';
      }
      // Otherwise the signal is inside the hysteresis band → hold current state.
    }

    return {
      reps: this.reps,
      phase: this.phase,
      repCompleted,
      signal,
    };
  }

  private get phase(): ExercisePhase {
    return this.state;
  }
}
