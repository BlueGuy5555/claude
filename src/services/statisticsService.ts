import {
  EMPTY_STATISTICS,
  type Statistics,
  type WorkoutSession,
} from '@/types';
import { isSameDay, startOfMonth, startOfWeek } from '@/utils';

import {
  bestDay,
  mostProductiveMonth,
  mostProductiveWeek,
  mostTrainedExercise,
  summarize,
} from './analyticsService';
import { computeStreaks } from './streakService';

/**
 * Aggregate workout history into the comprehensive {@link Statistics} snapshot.
 *
 * Kept free of storage and React so it is trivial to unit test and reuse. With
 * an empty history it returns `EMPTY_STATISTICS`, which is exactly the
 * "placeholder statistics" the Statistics screen shows on a fresh install.
 *
 * `now` is injected (defaulting to the wall clock) so the time-relative fields
 * — today's totals, this-week/-month counts, current streaks — are
 * deterministic under test.
 */
export function computeStatistics(
  sessions: WorkoutSession[],
  now: Date = new Date(),
): Statistics {
  if (sessions.length === 0) return EMPTY_STATISTICS;

  const totals = summarize(sessions);
  const streaks = computeStreaks(sessions, now);

  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  let repsToday = 0;
  let caloriesToday = 0;
  let durationTodaySec = 0;
  let workoutsThisWeek = 0;
  let workoutsThisMonth = 0;

  for (const s of sessions) {
    const started = new Date(s.startedAt);
    if (isSameDay(started, now)) {
      repsToday += s.totalReps;
      caloriesToday += s.calories ?? 0;
      durationTodaySec += s.durationSec;
    }
    if (started.getTime() >= weekStart) workoutsThisWeek += 1;
    if (started.getTime() >= monthStart) workoutsThisMonth += 1;
  }

  const sortedDesc = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  return {
    totalWorkouts: totals.workouts,
    totalReps: totals.reps,
    totalDurationSec: totals.durationSec,
    totalCalories: totals.calories,
    avgWorkoutDurationSec:
      totals.workouts > 0 ? Math.round(totals.durationSec / totals.workouts) : 0,
    avgRepsPerWorkout:
      totals.workouts > 0 ? Math.round(totals.reps / totals.workouts) : 0,
    currentStreakDays: streaks.currentStreakDays,
    longestStreakDays: streaks.longestStreakDays,
    currentStreakWeeks: streaks.currentStreakWeeks,
    currentStreakMonths: streaks.currentStreakMonths,
    repsToday,
    caloriesToday: Math.round(caloriesToday),
    durationTodaySec,
    workoutsThisWeek,
    workoutsThisMonth,
    mostTrainedExerciseId: mostTrainedExercise(sessions),
    bestDay: bestDay(sessions),
    mostProductiveWeek: mostProductiveWeek(sessions),
    mostProductiveMonth: mostProductiveMonth(sessions),
    lastWorkoutAt: sortedDesc[0]?.startedAt ?? null,
  };
}
