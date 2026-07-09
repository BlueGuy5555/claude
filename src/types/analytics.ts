/**
 * Types for the analytics layer: date-range filtering, aggregated summaries and
 * chart-ready series. These are produced by the pure `analyticsService` and
 * consumed by the Statistics screen, dashboard and charts.
 */
import type { ExerciseId } from './workout';

/** Presets offered by the statistics filter control. */
export type DateRangePreset = 'today' | '7d' | '30d' | 'month' | 'year' | 'all';

/** Ordered list used to render the filter chips. */
export const DATE_RANGE_PRESETS: readonly { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
];

/**
 * A half-open interval `[start, end)`. A `null` bound means "unbounded" in that
 * direction, which is how the "All time" preset is represented.
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/** Headline totals for an arbitrary set of sessions (a range, a day, …). */
export interface RangeSummary {
  workouts: number;
  reps: number;
  calories: number;
  durationSec: number;
  /** Mean seconds per rep across the set, or `null` when there are no reps. */
  avgRepSpeedSec: number | null;
}

/** A single datum in a chart series. */
export interface ChartPoint {
  /** Short axis label, e.g. "Mon", "W23", "Jan". */
  label: string;
  value: number;
  /** ISO date of the bucket start, useful for tooltips / keys. */
  isoDate: string;
}

/** One slice of the exercise-distribution breakdown. */
export interface ExerciseSlice {
  exerciseId: ExerciseId;
  name: string;
  reps: number;
  workouts: number;
  /** Share of total reps in `[0, 1]`. */
  fraction: number;
}

/** The set of chart series the Statistics screen can render for a range. */
export interface ChartData {
  /** Reps per day (one bucket per calendar day in the range/window). */
  dailyReps: ChartPoint[];
  /** Reps per ISO week. */
  weeklyReps: ChartPoint[];
  /** Reps per calendar month. */
  monthlyReps: ChartPoint[];
  /** Calories per day. */
  caloriesOverTime: ChartPoint[];
  /** Workout duration (minutes) per day. */
  durationOverTime: ChartPoint[];
  /** Number of workouts per day (frequency). */
  frequency: ChartPoint[];
  /** 1 on active days, 0 otherwise — visualizes streaks. */
  activity: ChartPoint[];
  /** Reps grouped by exercise. */
  distribution: ExerciseSlice[];
}
