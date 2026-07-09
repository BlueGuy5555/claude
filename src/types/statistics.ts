import type { ExerciseId } from './workout';

/**
 * Aggregated personal statistics — the comprehensive all-time snapshot shown on
 * the Statistics screen and dashboard.
 *
 * These are derived from workout history by `statisticsService`, but a snapshot
 * is also cached in storage so surfaces can render instantly before the
 * (potentially large) history list is fully processed. Every field has a
 * defined default in `EMPTY_STATISTICS` so a fresh install renders cleanly.
 */

/** A named bucket paired with a numeric value (best day / week / month). */
export interface NamedTotal {
  /** ISO date (day/week-start/month-start) identifying the bucket. */
  isoDate: string;
  /** Pre-formatted, human-friendly label, e.g. "Mon, 6 Jul" or "June 2026". */
  label: string;
  value: number;
}

export interface Statistics {
  // Volume
  totalWorkouts: number;
  totalReps: number;
  totalDurationSec: number;
  totalCalories: number;

  // Averages
  avgWorkoutDurationSec: number;
  avgRepsPerWorkout: number;

  // Streaks
  currentStreakDays: number;
  longestStreakDays: number;
  /** Consecutive ISO weeks with at least one workout, ending this week. */
  currentStreakWeeks: number;
  /** Consecutive calendar months with at least one workout, ending this month. */
  currentStreakMonths: number;

  // Recent windows
  repsToday: number;
  caloriesToday: number;
  durationTodaySec: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;

  // Superlatives
  mostTrainedExerciseId: ExerciseId | null;
  bestDay: NamedTotal | null;
  mostProductiveWeek: NamedTotal | null;
  mostProductiveMonth: NamedTotal | null;

  /** ISO-8601 timestamp of the most recent workout, or null if none. */
  lastWorkoutAt: string | null;
}

export const EMPTY_STATISTICS: Statistics = {
  totalWorkouts: 0,
  totalReps: 0,
  totalDurationSec: 0,
  totalCalories: 0,
  avgWorkoutDurationSec: 0,
  avgRepsPerWorkout: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
  currentStreakWeeks: 0,
  currentStreakMonths: 0,
  repsToday: 0,
  caloriesToday: 0,
  durationTodaySec: 0,
  workoutsThisWeek: 0,
  workoutsThisMonth: 0,
  mostTrainedExerciseId: null,
  bestDay: null,
  mostProductiveWeek: null,
  mostProductiveMonth: null,
  lastWorkoutAt: null,
};
