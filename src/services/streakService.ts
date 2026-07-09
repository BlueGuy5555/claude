/**
 * Streak calculations — pure, storage-free and framework-free.
 *
 * A "streak" is a run of consecutive *periods* (days, weeks or months) that
 * each contain at least one workout. The tricky part is the current streak: it
 * must not break the instant a new period begins, only once a whole period has
 * been missed. We model that by allowing the most recent active period to be
 * either the current period or the immediately previous one.
 */
import type { WorkoutSession } from '@/types';
import {
  daysBetween,
  monthsBetween,
  startOfDay,
  startOfMonth,
  startOfWeek,
  weeksBetween,
} from '@/utils';

export interface Streaks {
  currentStreakDays: number;
  longestStreakDays: number;
  currentStreakWeeks: number;
  currentStreakMonths: number;
}

const EMPTY: Streaks = {
  currentStreakDays: 0,
  longestStreakDays: 0,
  currentStreakWeeks: 0,
  currentStreakMonths: 0,
};

/** Distinct period-start timestamps (ascending) for the given sessions. */
function uniquePeriodStarts(
  sessions: WorkoutSession[],
  periodStart: (d: Date) => Date,
): number[] {
  const set = new Set<number>();
  for (const s of sessions) set.add(periodStart(new Date(s.startedAt)).getTime());
  return Array.from(set).sort((a, b) => a - b);
}

/** Longest run of consecutive periods anywhere in the history. */
function longestRun(
  starts: number[],
  distance: (a: Date, b: Date) => number,
): number {
  if (starts.length === 0) return 0;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < starts.length; i += 1) {
    const gap = distance(new Date(starts[i]!), new Date(starts[i - 1]!));
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

/** Run of consecutive periods ending at (or one before) "now". */
function currentRun(
  starts: number[],
  distance: (a: Date, b: Date) => number,
  now: Date,
): number {
  if (starts.length === 0) return 0;
  // Only count if the latest active period is the current one or the last one.
  if (distance(now, new Date(starts[starts.length - 1]!)) > 1) return 0;
  let current = 1;
  for (let i = starts.length - 1; i > 0; i -= 1) {
    const gap = distance(new Date(starts[i]!), new Date(starts[i - 1]!));
    if (gap === 1) current += 1;
    else break;
  }
  return current;
}

export function computeStreaks(
  sessions: WorkoutSession[],
  now: Date = new Date(),
): Streaks {
  if (sessions.length === 0) return EMPTY;

  const dayStarts = uniquePeriodStarts(sessions, startOfDay);
  const weekStarts = uniquePeriodStarts(sessions, startOfWeek);
  const monthStarts = uniquePeriodStarts(sessions, startOfMonth);

  return {
    currentStreakDays: currentRun(dayStarts, daysBetween, now),
    longestStreakDays: longestRun(dayStarts, daysBetween),
    currentStreakWeeks: currentRun(weekStarts, weeksBetween, now),
    currentStreakMonths: currentRun(monthStarts, monthsBetween, now),
  };
}
