/**
 * User-configurable goals and their computed progress.
 *
 * A goal is a simple (metric, period, target) triple, e.g. "reps / daily / 100".
 * Progress is always derived from workout history — never stored — so it can
 * never drift out of sync with the underlying sessions.
 */
import type { IconName } from './icon';

/** What is being counted toward the goal. */
export type GoalMetric = 'reps' | 'workouts' | 'durationMin';

/** The window the target applies to. */
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';

export interface Goal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod;
  /** Target amount for the metric within one period. */
  target: number;
  createdAt: string;
}

/** A goal paired with the current period's progress toward it. */
export interface GoalProgress {
  goal: Goal;
  /** Achieved amount in the current period. */
  current: number;
  /** Copied from the goal for convenience. */
  target: number;
  /** `current / target`, clamped to `[0, 1]`. */
  fraction: number;
  completed: boolean;
}

/** Metadata for presenting a metric (label, unit, icon). */
export const GOAL_METRIC_META: Record<
  GoalMetric,
  { label: string; unit: string; icon: IconName }
> = {
  reps: { label: 'Reps', unit: 'reps', icon: 'repeat-outline' },
  workouts: { label: 'Workouts', unit: 'workouts', icon: 'barbell-outline' },
  durationMin: { label: 'Active time', unit: 'min', icon: 'time-outline' },
};

export const GOAL_PERIOD_META: Record<GoalPeriod, { label: string; adjective: string }> = {
  daily: { label: 'Today', adjective: 'Daily' },
  weekly: { label: 'This week', adjective: 'Weekly' },
  monthly: { label: 'This month', adjective: 'Monthly' },
};

/** Sensible starter goals used the first time the Goals screen is opened. */
export const DEFAULT_GOALS: Omit<Goal, 'id' | 'createdAt'>[] = [
  { metric: 'reps', period: 'daily', target: 100 },
  { metric: 'workouts', period: 'weekly', target: 4 },
];
