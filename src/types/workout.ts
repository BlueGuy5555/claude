/**
 * Domain models for workouts.
 *
 * NOTE: rep counting / pose detection is intentionally NOT implemented in this
 * milestone. These types describe the shape of the data the storage layer is
 * ready to persist so later milestones can fill them in without a migration.
 */

import type { IconName } from './icon';

/** Exercises the app will eventually be able to count. */
export type ExerciseId = 'squat' | 'pushup' | 'situp' | 'jumping_jack' | 'lunge';

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
 */
export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  sets: WorkoutSet[];
  totalReps: number;
  notes?: string;
}
