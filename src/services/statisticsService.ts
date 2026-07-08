import {
  EMPTY_STATISTICS,
  type ExerciseId,
  type ExerciseStat,
  type PersonalRecord,
  type Statistics,
  type WorkoutSession,
} from '@/types';
import { daysBetween, isSameCalendarMonth, isWithinLastWeek, startOfDay } from '@/utils';

/**
 * Pure aggregation of workout history into headline statistics.
 *
 * Kept free of storage and React so it is trivial to unit test and reuse. With
 * an empty history it returns `EMPTY_STATISTICS`, which is exactly the
 * "placeholder statistics" the Statistics screen shows on a fresh install.
 */
export function computeStatistics(
  sessions: WorkoutSession[],
  now: Date = new Date(),
): Statistics {
  if (sessions.length === 0) return EMPTY_STATISTICS;

  const totalWorkouts = sessions.length;
  const totalReps = sessions.reduce((sum, s) => sum + s.totalReps, 0);
  const totalDurationSec = sessions.reduce((sum, s) => sum + s.durationSec, 0);
  const totalCalories = sessions.reduce((sum, s) => sum + (s.calories ?? 0), 0);

  const thisWeek = sessions.filter((s) => isWithinLastWeek(s.startedAt, now));
  const thisMonth = sessions.filter((s) => isSameCalendarMonth(s.startedAt, now));

  const longestWorkoutSec = sessions.reduce((max, s) => Math.max(max, s.durationSec), 0);
  const averageDurationSec = Math.round(totalDurationSec / totalWorkouts);

  const sortedDesc = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  const lastWorkoutAt = sortedDesc[0]?.startedAt ?? null;

  const { currentStreakDays, longestStreakDays } = computeStreaks(sessions, now);

  return {
    totalWorkouts,
    totalReps,
    totalDurationSec,
    totalCalories: Math.round(totalCalories),
    currentStreakDays,
    longestStreakDays,
    workoutsThisWeek: thisWeek.length,
    repsThisWeek: thisWeek.reduce((sum, s) => sum + s.totalReps, 0),
    workoutsThisMonth: thisMonth.length,
    repsThisMonth: thisMonth.reduce((sum, s) => sum + s.totalReps, 0),
    longestWorkoutSec,
    averageDurationSec,
    lastWorkoutAt,
    exerciseBreakdown: computeBreakdown(sessions),
    personalRecords: computePersonalRecords(sessions),
  };
}

/**
 * Per-exercise totals, ordered by reps then duration so the most-trained
 * exercise leads the breakdown. The session's duration and calories are
 * attributed to its primary (first) exercise to avoid double-counting.
 */
function computeBreakdown(sessions: WorkoutSession[]): ExerciseStat[] {
  const map = new Map<ExerciseId, ExerciseStat>();
  const ensure = (id: ExerciseId): ExerciseStat => {
    let stat = map.get(id);
    if (!stat) {
      stat = { exerciseId: id, workouts: 0, reps: 0, durationSec: 0, calories: 0 };
      map.set(id, stat);
    }
    return stat;
  };

  for (const session of sessions) {
    const primary = session.sets[0]?.exerciseId;
    for (const set of session.sets) ensure(set.exerciseId).reps += set.reps;
    if (primary) {
      const stat = ensure(primary);
      stat.workouts += 1;
      stat.durationSec += session.durationSec;
      stat.calories += session.calories ?? 0;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.reps - a.reps || b.durationSec - a.durationSec,
  );
}

/**
 * Best single-session result per exercise: max reps for rep exercises and the
 * longest duration for any exercise (the meaningful record for timed exercises).
 */
function computePersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const map = new Map<ExerciseId, PersonalRecord>();

  for (const session of sessions) {
    const primary = session.sets[0]?.exerciseId;
    if (!primary) continue;
    const existing = map.get(primary);
    if (
      !existing ||
      session.totalReps > existing.bestReps ||
      session.durationSec > existing.bestDurationSec
    ) {
      map.set(primary, {
        exerciseId: primary,
        bestReps: Math.max(existing?.bestReps ?? 0, session.totalReps),
        bestDurationSec: Math.max(existing?.bestDurationSec ?? 0, session.durationSec),
        achievedAt: session.startedAt,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Streaks are measured in distinct calendar days that have at least one
 * workout. The current streak counts consecutive days ending today (or
 * yesterday — we don't want a streak to "break" until a full day is missed).
 */
function computeStreaks(
  sessions: WorkoutSession[],
  now: Date,
): { currentStreakDays: number; longestStreakDays: number } {
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

  let current = 0;
  const mostRecentGap = daysBetween(now, new Date(uniqueDays[uniqueDays.length - 1]!));
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
