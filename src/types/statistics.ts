/**
 * Aggregated personal statistics.
 *
 * These are derived from workout history by `statisticsService`, but a snapshot
 * is also cached in storage so the Statistics screen can render instantly
 * before the (potentially large) history list is fully processed.
 */
export interface Statistics {
  totalWorkouts: number;
  totalReps: number;
  totalDurationSec: number;
  currentStreakDays: number;
  longestStreakDays: number;
  workoutsThisWeek: number;
  /** ISO-8601 timestamp of the most recent workout, or null if none. */
  lastWorkoutAt: string | null;
}

export const EMPTY_STATISTICS: Statistics = {
  totalWorkouts: 0,
  totalReps: 0,
  totalDurationSec: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
  workoutsThisWeek: 0,
  lastWorkoutAt: null,
};
