/**
 * Domain models for workouts.
 *
 * NOTE: automatic rep counting / pose detection is intentionally NOT implemented
 * yet. During a session reps are produced by a *simulated* counter so the whole
 * UI (timer, rep counter, calories) can be exercised end to end. These types
 * already describe the shape the storage layer persists, so wiring in real pose
 * detection later needs no data migration.
 */

import type { IconName } from './icon';

/** Exercises the app can track. */
export type ExerciseId = 'squat' | 'pushup' | 'situp' | 'jumping_jack' | 'lunge';

export interface Exercise {
  id: ExerciseId;
  /** Human readable name, e.g. "Push-up". */
  name: string;
  /** Short muscle-group focus shown under the name, e.g. "Legs & glutes". */
  focus: string;
  /** Ionicons glyph name used to represent the exercise in the UI. */
  icon: IconName;
  /**
   * Rough energy burned per repetition, in kilocalories. Used to give a
   * live calorie estimate without needing body-weight input. Values are
   * deliberately conservative averages.
   */
  caloriesPerRep: number;
}

/** A single block of one exercise within a session. */
export interface WorkoutSet {
  exerciseId: ExerciseId;
  reps: number;
}

/**
 * A completed (or in-progress) workout. `id` is a client-generated unique id;
 * timestamps are stored as ISO-8601 strings so they serialize cleanly to JSON.
 * `endedAt` is null while the session is still in progress.
 */
export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  sets: WorkoutSet[];
  totalReps: number;
  /** Estimated energy burned, in kilocalories. */
  calories: number;
}
