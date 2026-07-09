/**
 * Domain models for workouts.
 *
 * Rep counting is performed on-device by the pose-detection layer (`src/ai`),
 * which produces the `reps` recorded here. Timestamps are ISO-8601 strings so
 * they serialize cleanly to JSON.
 */

import type { IconName } from './icon';

/** Exercises the app can count reps for. */
export type ExerciseId = 'squat' | 'pushup' | 'pullup' | 'jumping_jack' | 'lunge';

export interface Exercise {
  id: ExerciseId;
  /** Human readable name, e.g. "Push-up". */
  name: string;
  /** Ionicons glyph name used to represent the exercise in the UI. */
  icon: IconName;
}

/** A single block of one exercise within a session. */
export interface WorkoutSet {
  exerciseId: ExerciseId;
  reps: number;
}

/**
 * A completed (or in-progress) workout. `id` is a client-generated unique id;
 * timestamps are stored as ISO-8601 strings so they serialize cleanly to JSON.
 *
 * The fields below `notes` are *derived analytics* captured when the session is
 * built. They are all optional so that (a) older records written before this
 * milestone remain valid, and (b) the workout screen is free to record only
 * what the pose layer happens to expose. Everything here is safe to compute
 * from data the app already has — none of it reaches into pose detection.
 */
export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  sets: WorkoutSet[];
  totalReps: number;
  /** Estimated energy burned, in kilocalories. */
  calories?: number;
  notes?: string;

  // --- Derived analytics (all optional / future-ready) ---
  /** Mean seconds per rep across the session (duration ÷ reps as a fallback). */
  avgRepSpeedSec?: number;
  /** Shortest single-rep interval, in seconds. */
  fastestRepSec?: number;
  /** Longest single-rep interval, in seconds. */
  slowestRepSec?: number;
  /**
   * Longest run of consecutive reps performed without a long pause between
   * them (a rough "unbroken effort" measure). See `workoutService`.
   */
  bestRepStreak?: number;
  /** Mean pose-confidence sampled on each counted rep, `[0, 1]`. */
  avgConfidence?: number;
  /**
   * Offset in milliseconds from `startedAt` of each counted rep. Enables
   * per-rep pace analysis and future form breakdowns without recomputation.
   */
  repOffsetsMs?: number[];
}
