/**
 * Goal progress — pure computation of how far the current period has advanced
 * toward each goal. Progress is derived from history on demand, never stored,
 * so it can never disagree with the sessions behind it.
 */
import type {
  Goal,
  GoalMetric,
  GoalPeriod,
  GoalProgress,
  WorkoutSession,
} from '@/types';
import { startOfDay, startOfMonth, startOfWeek } from '@/utils';

/** Start of the current period for a goal's cadence. */
function periodStart(period: GoalPeriod, now: Date): Date {
  switch (period) {
    case 'daily':
      return startOfDay(now);
    case 'weekly':
      return startOfWeek(now);
    case 'monthly':
      return startOfMonth(now);
  }
}

/** Contribution of one session toward a metric. */
function metricValue(session: WorkoutSession, metric: GoalMetric): number {
  switch (metric) {
    case 'reps':
      return session.totalReps;
    case 'workouts':
      return 1;
    case 'durationMin':
      return session.durationSec / 60;
  }
}

/** Achieved amount for a goal within the current period. */
export function goalCurrent(
  goal: Goal,
  sessions: WorkoutSession[],
  now: Date = new Date(),
): number {
  const from = periodStart(goal.period, now).getTime();
  let total = 0;
  for (const s of sessions) {
    if (new Date(s.startedAt).getTime() >= from) {
      total += metricValue(s, goal.metric);
    }
  }
  return goal.metric === 'durationMin' ? Math.round(total) : total;
}

/** Compute progress toward a single goal. */
export function computeGoalProgress(
  goal: Goal,
  sessions: WorkoutSession[],
  now: Date = new Date(),
): GoalProgress {
  const current = goalCurrent(goal, sessions, now);
  const fraction = goal.target > 0 ? Math.min(1, current / goal.target) : 0;
  return {
    goal,
    current,
    target: goal.target,
    fraction,
    completed: current >= goal.target && goal.target > 0,
  };
}

/** Compute progress for every goal, preserving order. */
export function computeAllGoalProgress(
  goals: Goal[],
  sessions: WorkoutSession[],
  now: Date = new Date(),
): GoalProgress[] {
  return goals.map((g) => computeGoalProgress(g, sessions, now));
}
