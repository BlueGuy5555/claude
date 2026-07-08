import { EMPTY_STATISTICS, type Statistics, type WorkoutSession } from '@/types';
import { daysBetween, isWithinLastWeek, startOfDay } from '@/utils';

/**
 * Pure aggregation of workout history into headline statistics.
 *
 * Kept free of storage and React so it is trivial to unit test and reuse. With
 * an empty history it returns `EMPTY_STATISTICS`, which is exactly the
 * "placeholder statistics" the Statistics screen shows on a fresh install.
 */
export function computeStatistics(sessions: WorkoutSession[]): Statistics {
  if (sessions.length === 0) return EMPTY_STATISTICS;

  const totalWorkouts = sessions.length;
  const totalReps = sessions.reduce((sum, s) => sum + s.totalReps, 0);
  const totalDurationSec = sessions.reduce((sum, s) => sum + s.durationSec, 0);
  const workoutsThisWeek = sessions.filter((s) => isWithinLastWeek(s.startedAt)).length;

  const sortedDesc = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  const lastWorkoutAt = sortedDesc[0]?.startedAt ?? null;

  const { currentStreakDays, longestStreakDays } = computeStreaks(sessions);

  return {
    totalWorkouts,
    totalReps,
    totalDurationSec,
    currentStreakDays,
    longestStreakDays,
    workoutsThisWeek,
    lastWorkoutAt,
  };
}

/**
 * Streaks are measured in distinct calendar days that have at least one
 * workout. The current streak counts consecutive days ending today (or
 * yesterday — we don't want a streak to "break" until a full day is missed).
 */
function computeStreaks(sessions: WorkoutSession[]): {
  currentStreakDays: number;
  longestStreakDays: number;
} {
  // Unique workout days as day-start timestamps, ascending.
  const uniqueDays = Array.from(
    new Set(sessions.map((s) => startOfDay(new Date(s.startedAt)).getTime())),
  ).sort((a, b) => a - b);

  if (uniqueDays.length === 0) return { currentStreakDays: 0, longestStreakDays: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    const gap = daysBetween(new Date(uniqueDays[i]!), new Date(uniqueDays[i - 1]!));
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Current streak: only counts if the most recent workout was today/yesterday.
  const today = new Date();
  let current = 0;
  const mostRecentGap = daysBetween(today, new Date(uniqueDays[uniqueDays.length - 1]!));
  if (mostRecentGap <= 1) {
    current = 1;
    for (let i = uniqueDays.length - 1; i > 0; i -= 1) {
      const gap = daysBetween(new Date(uniqueDays[i]!), new Date(uniqueDays[i - 1]!));
      if (gap === 1) current += 1;
      else break;
    }
  }

  return { currentStreakDays: current, longestStreakDays: longest };
}
