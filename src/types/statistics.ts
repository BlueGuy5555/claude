import type { ExerciseId } from './workout';

/**
 * Aggregated personal statistics derived from workout history by
 * `statisticsService`. A snapshot is also cached in storage so the Statistics
 * screen can render instantly before the (potentially large) history list is
 * fully reprocessed.
 */

/** Totals for a bounded window of time (e.g. the last 7 or 30 days). */
export interface PeriodSummary {
  workouts: number;
  reps: number;
  durationSec: number;
  calories: number;
}

/** All-time bests. */
export interface PersonalRecords {
  /** Most reps completed within a single session. */
  mostRepsInSession: number;
  /** Longest single session, in seconds. */
  longestSessionSec: number;
  /** Most reps completed across a single calendar day. */
  mostRepsInDay: number;
  /** Longest run of consecutive workout days. */
  bestStreakDays: number;
}

export interface Statistics {
  totalWorkouts: number;
  totalReps: number;
  totalDurationSec: number;
  totalCalories: number;

  currentStreakDays: number;
  longestStreakDays: number;

  /** Exercise with the most cumulative reps, or null when there are none. */
  mostPerformedExerciseId: ExerciseId | null;
  mostPerformedExerciseReps: number;

  /** Rolling last-7-day summary. */
  thisWeek: PeriodSummary;
  /** Rolling last-30-day summary. */
  thisMonth: PeriodSummary;

  personalRecords: PersonalRecords;

  /** ISO-8601 timestamp of the most recent workout, or null if none. */
  lastWorkoutAt: string | null;
}

export const EMPTY_PERIOD_SUMMARY: PeriodSummary = {
  workouts: 0,
  reps: 0,
  durationSec: 0,
  calories: 0,
};

export const EMPTY_PERSONAL_RECORDS: PersonalRecords = {
  mostRepsInSession: 0,
  longestSessionSec: 0,
  mostRepsInDay: 0,
  bestStreakDays: 0,
};

export const EMPTY_STATISTICS: Statistics = {
  totalWorkouts: 0,
  totalReps: 0,
  totalDurationSec: 0,
  totalCalories: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
  mostPerformedExerciseId: null,
  mostPerformedExerciseReps: 0,
  thisWeek: EMPTY_PERIOD_SUMMARY,
  thisMonth: EMPTY_PERIOD_SUMMARY,
  personalRecords: EMPTY_PERSONAL_RECORDS,
  lastWorkoutAt: null,
};
