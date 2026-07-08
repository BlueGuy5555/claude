import type { ExerciseId, Pose, WorkoutPhase } from '@/types';

import { getDefinition, type ExerciseDefinition, type MeasureOptions } from './definitions';

export interface CounterSnapshot {
  phase: WorkoutPhase;
  /** Completed reps (rep exercises) — always 0 for timed exercises. */
  reps: number;
  /** Accumulated hold time in seconds (timed exercises) — else 0. */
  holdSec: number;
  /** True only on the exact frame a rep was completed. */
  justCounted: boolean;
  /** False when the pose wasn't measurable this frame (a tracking hiccup). */
  measurable: boolean;
  /** Running mean confidence across all measurable frames. */
  avgConfidence: number;
}

/**
 * Counts reps for one exercise from a stream of poses.
 *
 * ## Why a state machine, not a threshold
 * A naive "count when the angle drops below X" double-counts near the
 * threshold and miscounts partial reps. This uses a **Schmitt trigger**: two
 * thresholds with a gap (hysteresis) between them. You must push the movement
 * past `bottomEnter` *and then* come back below `topEnter` to score a single
 * rep. That single rule delivers everything the brief asks for:
 *
 * - **No duplicates** — you can hover around one threshold forever without
 *   scoring, because a count needs both crossings in order.
 * - **No partial reps** — never reaching `bottomEnter` means `reachedBottom`
 *   stays false and the return to the top scores nothing.
 * - **Pauses are fine** — the machine is purely position-driven, so freezing
 *   mid-rep just holds the current phase.
 * - **Speed independent** — there are no time thresholds; a slow grind and a
 *   fast rep are counted identically (a tiny debounce only rejects jitter).
 * - **Graceful dropouts** — a `null` measurement holds the phase instead of
 *   corrupting it, so a few missing frames never miscount.
 *
 * Timed exercises (plank) reuse the same measurement but accumulate hold time
 * while posture quality stays above `holdThreshold`.
 */
export class RepCounter {
  private readonly def: ExerciseDefinition;

  private phase: WorkoutPhase;
  private reps = 0;
  private holdMs = 0;
  private reachedBottom = false;
  private lastProgress = 0;
  private lastRepMs = -Infinity;
  private lastHoldMs: number | null = null;
  private confSum = 0;
  private confCount = 0;

  constructor(exerciseId: ExerciseId) {
    this.def = getDefinition(exerciseId);
    this.phase = this.def.kind === 'timed' ? 'idle' : 'top';
  }

  get exerciseId(): ExerciseId {
    return this.def.id;
  }

  /** Reps completed so far (read-only view for orchestration logic). */
  get completedReps(): number {
    return this.reps;
  }

  /** Hold time accumulated so far, in seconds (timed exercises). */
  get heldSeconds(): number {
    return this.holdMs / 1000;
  }

  update(pose: Pose, options: MeasureOptions, nowMs: number): CounterSnapshot {
    const measurement = this.def.measure(pose, options);

    if (measurement.progress === null) {
      // Not measurable this frame: hold everything, but let the timed clock
      // pause (a broken/hidden plank shouldn't keep counting).
      this.lastHoldMs = null;
      return this.snapshot(false);
    }

    this.confSum += measurement.confidence;
    this.confCount += 1;

    if (this.def.kind === 'timed') {
      return this.updateTimed(measurement.progress, nowMs);
    }
    return this.updateReps(measurement.progress, nowMs);
  }

  private updateReps(progress: number, nowMs: number): CounterSnapshot {
    let justCounted = false;

    if (progress >= this.def.bottomEnter) {
      this.phase = 'bottom';
      this.reachedBottom = true;
    } else if (progress <= this.def.topEnter) {
      if (this.reachedBottom && nowMs - this.lastRepMs >= this.def.minRepIntervalMs) {
        this.reps += 1;
        this.lastRepMs = nowMs;
        justCounted = true;
      }
      this.reachedBottom = false;
      this.phase = 'top';
    } else {
      // Between thresholds: label direction of travel for the HUD.
      this.phase = progress > this.lastProgress ? 'descending' : 'ascending';
    }

    this.lastProgress = progress;
    return this.snapshot(true, justCounted);
  }

  private updateTimed(quality: number, nowMs: number): CounterSnapshot {
    const holding = quality >= this.def.holdThreshold;
    if (holding) {
      if (this.lastHoldMs !== null) {
        this.holdMs += Math.max(0, nowMs - this.lastHoldMs);
      }
      this.lastHoldMs = nowMs;
      this.phase = 'hold';
    } else {
      this.lastHoldMs = null;
      this.phase = 'broken';
    }
    this.lastProgress = quality;
    return this.snapshot(true);
  }

  private snapshot(measurable: boolean, justCounted = false): CounterSnapshot {
    return {
      phase: this.phase,
      reps: this.reps,
      holdSec: this.holdMs / 1000,
      justCounted,
      measurable,
      avgConfidence: this.confCount === 0 ? 0 : this.confSum / this.confCount,
    };
  }

  reset(): void {
    this.phase = this.def.kind === 'timed' ? 'idle' : 'top';
    this.reps = 0;
    this.holdMs = 0;
    this.reachedBottom = false;
    this.lastProgress = 0;
    this.lastRepMs = -Infinity;
    this.lastHoldMs = null;
    this.confSum = 0;
    this.confCount = 0;
  }
}
