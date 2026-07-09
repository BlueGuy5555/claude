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
}
