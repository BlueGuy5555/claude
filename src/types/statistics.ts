import type { ExerciseId } from './workout';

/** Per-exercise aggregate, used for the "exercise breakdown" section. */
export interface ExerciseStat {
  exerciseId: ExerciseId;
  workouts: number;
  reps: number;
  durationSec: number;
  calories: number;
}

/**
 * A personal record for one exercise: the best single-session result. For
 * rep-based exercises this is max reps; for timed exercises (plank) it is the
 * longest hold in seconds.
 */
export interface PersonalRecord {
  exerciseId: ExerciseId;
  /** Best reps in a single session (0 for timed exercises). */
  bestReps: number;
  /** Longest single-session duration in seconds. */
  bestDurationSec: number;
  /** ISO-8601 timestamp of when the record was set. */
  achievedAt: string;
}

/**
 * Aggregated personal statistics, derived from workout history by
 * `statisticsService`. A snapshot is cached in storage so the Statistics screen
 * can render instantly before the full history list is processed.
 */
export interface Statistics {
  totalWorkouts: number;
  totalReps: number;
  totalDurationSec: number;
  totalCalories: number;

  currentStreakDays: number;
  longestStreakDays: number;

  workoutsThisWeek: number;
  repsThisWeek: number;
  workoutsThisMonth: number;
  repsThisMonth: number;

  /** Longest single workout in seconds. */
  longestWorkoutSec: number;
  /** Mean workout duration in seconds. */
  averageDurationSec: number;

  /** ISO-8601 timestamp of the most recent workout, or null if none. */
  lastWorkoutAt: string | null;

  exerciseBreakdown: ExerciseStat[];
  personalRecords: PersonalRecord[];
}

export const EMPTY_STATISTICS: Statistics = {
  totalWorkouts: 0,
  totalReps: 0,
  totalDurationSec: 0,
  totalCalories: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
  workoutsThisWeek: 0,
  repsThisWeek: 0,
  workoutsThisMonth: 0,
  repsThisMonth: 0,
  longestWorkoutSec: 0,
  averageDurationSec: 0,
  lastWorkoutAt: null,
  exerciseBreakdown: [],
  personalRecords: [],
};
