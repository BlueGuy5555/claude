/**
 * Domain models for workouts.
 */

import type { IconName } from './icon';

/** Exercises the app can count. `plank` is timed rather than rep-based. */
export type ExerciseId =
  | 'pushup'
  | 'squat'
  | 'pullup'
  | 'lunge'
  | 'jumping_jack'
  | 'plank';

/** Whether an exercise is scored by counting reps or by holding a position. */
export type ExerciseKind = 'reps' | 'timed';

/**
 * A phase of a repetition, produced by the rep-counting state machine.
 * `hold` / `broken` are only used by timed (plank-style) exercises.
 */
export type WorkoutPhase =
  | 'idle'
  | 'top'
  | 'descending'
  | 'bottom'
  | 'ascending'
  | 'hold'
  | 'broken';

export interface Exercise {
  id: ExerciseId;
  /** Human readable name, e.g. "Push-up". */
  name: string;
  /** Ionicons glyph name used to represent the exercise in the UI. */
  icon: IconName;
  kind: ExerciseKind;
  /**
   * Metabolic Equivalent of Task — used for the offline calorie estimate.
   * Values follow the Compendium of Physical Activities.
   */
  met: number;
  /** One-line coaching cue shown before/while performing the exercise. */
  cue: string;
}

/** A single block of one exercise within a session. */
export interface WorkoutSet {
  exerciseId: ExerciseId;
  reps: number;
}

/**
 * A completed (or in-progress) workout. `id` is a client-generated unique id;
 * timestamps are stored as ISO-8601 strings so they serialize cleanly to JSON.
 */
export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  sets: WorkoutSet[];
  totalReps: number;
  /** Offline calorie estimate for the whole session (kcal). */
  calories: number;
  /** Mean pose confidence recorded across the session, in `[0, 1]`. */
  avgConfidence: number;
  notes?: string;
}
