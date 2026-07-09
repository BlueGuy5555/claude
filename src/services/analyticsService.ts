/**
 * Pure analytics engine.
 *
 * Everything here is a plain function of `WorkoutSession[]` (+ an optional
 * `now`, injected so tests are deterministic). No React, no storage, no clock
 * reads hidden inside helpers. That makes the whole module trivially memoizable
 * upstream: given the same history reference, the same numbers come out, so the
 * hooks can cache aggressively and the Statistics screen stays smooth even with
 * thousands of sessions.
 */
import { EXERCISES } from '@/constants';
import type {
  ChartData,
  ChartPoint,
  DateRange,
  DateRangePreset,
  ExerciseId,
  ExerciseSlice,
  NamedTotal,
  RangeSummary,
  WorkoutSession,
} from '@/types';
import {
  addDays,
  formatMonthLabel,
  formatMonthShort,
  formatShortDate,
  formatWeekday,
  isoWeekNumber,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/utils';

// --- Ranges ----------------------------------------------------------------

/** Turn a preset into a concrete half-open `[start, end)` interval. */
export function resolveDateRange(
  preset: DateRangePreset,
  now: Date = new Date(),
): DateRange {
  const endExclusive = addDays(startOfDay(now), 1); // end of today
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endExclusive };
    case '7d':
      return { start: addDays(startOfDay(now), -6), end: endExclusive };
    case '30d':
      return { start: addDays(startOfDay(now), -29), end: endExclusive };
    case 'month':
      return { start: startOfMonth(now), end: endExclusive };
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endExclusive };
    case 'all':
    default:
      return { start: null, end: null };
  }
}

/** Filter sessions to those whose start falls inside the range. */
export function filterByRange(
  sessions: WorkoutSession[],
  range: DateRange,
): WorkoutSession[] {
  return sessions.filter((s) => {
    const t = new Date(s.startedAt).getTime();
    if (range.start && t < range.start.getTime()) return false;
    if (range.end && t >= range.end.getTime()) return false;
    return true;
  });
}

// --- Accumulation ----------------------------------------------------------

interface Totals {
  reps: number;
  calories: number;
  durationSec: number;
  count: number;
}

function accumulate(sessions: WorkoutSession[]): Totals {
  return sessions.reduce<Totals>(
    (acc, s) => {
      acc.reps += s.totalReps;
      acc.calories += s.calories ?? 0;
      acc.durationSec += s.durationSec;
      acc.count += 1;
      return acc;
    },
    { reps: 0, calories: 0, durationSec: 0, count: 0 },
  );
}

/** Headline totals for a set of sessions. */
export function summarize(sessions: WorkoutSession[]): RangeSummary {
  const t = accumulate(sessions);
  return {
    workouts: t.count,
    reps: t.reps,
    calories: Math.round(t.calories),
    durationSec: t.durationSec,
    avgRepSpeedSec: t.reps > 0 ? Math.round((t.durationSec / t.reps) * 10) / 10 : null,
  };
}

/** Summarize the subset of `sessions` falling within a preset range. */
export function summarizeRange(
  sessions: WorkoutSession[],
  preset: DateRangePreset,
  now: Date = new Date(),
): RangeSummary {
  return summarize(filterByRange(sessions, resolveDateRange(preset, now)));
}

// --- Bucketing -------------------------------------------------------------

type Bucketer = (d: Date) => Date;

/** Group sessions by a period-start key, returning key → Totals. */
function bucketTotals(sessions: WorkoutSession[], bucketer: Bucketer): Map<number, Totals> {
  const map = new Map<number, Totals>();
  for (const s of sessions) {
    const key = bucketer(new Date(s.startedAt)).getTime();
    const cur = map.get(key) ?? { reps: 0, calories: 0, durationSec: 0, count: 0 };
    cur.reps += s.totalReps;
    cur.calories += s.calories ?? 0;
    cur.durationSec += s.durationSec;
    cur.count += 1;
    map.set(key, cur);
  }
  return map;
}

type Metric = keyof Totals;

/** Build a series over a fixed number of trailing periods. */
function trailingSeries(
  sessions: WorkoutSession[],
  opts: {
    periods: number;
    step: (from: Date, n: number) => Date;
    bucketer: Bucketer;
    label: (bucketStart: Date) => string;
    metric: Metric;
    now: Date;
  },
): ChartPoint[] {
  const { periods, step, bucketer, label, metric, now } = opts;
  const totals = bucketTotals(sessions, bucketer);
  const anchor = bucketer(now);
  const points: ChartPoint[] = [];
  for (let i = periods - 1; i >= 0; i -= 1) {
    const bucketStart = step(anchor, -i);
    const key = bucketStart.getTime();
    const t = totals.get(key);
    const raw = t ? t[metric] : 0;
    const value = metric === 'durationSec' ? Math.round(raw / 60) : Math.round(raw);
    points.push({ label: label(bucketStart), value, isoDate: bucketStart.toISOString() });
  }
  return points;
}

// --- Chart data ------------------------------------------------------------

/** Number of daily buckets to show for each preset (kept readable: ≤ 31). */
function dailyWindow(preset: DateRangePreset): number {
  switch (preset) {
    case 'today':
      return 1;
    case '7d':
      return 7;
    case '30d':
    case 'month':
      return 30;
    case 'year':
    case 'all':
    default:
      return 30;
  }
}

/**
 * Build every chart series the Statistics screen can render. Daily-granularity
 * series follow the selected range; weekly/monthly are always the trailing 12
 * periods (they're coarse enough that the filter would add little).
 */
export function buildChartData(
  sessions: WorkoutSession[],
  preset: DateRangePreset,
  now: Date = new Date(),
): ChartData {
  const days = dailyWindow(preset);
  const dayStep = (from: Date, n: number) => addDays(from, n);
  const dayLabel = (d: Date) => (days <= 7 ? formatWeekday(d) : `${d.getDate()}`);

  const dailyReps = trailingSeries(sessions, {
    periods: days,
    step: dayStep,
    bucketer: startOfDay,
    label: dayLabel,
    metric: 'reps',
    now,
  });
  const caloriesOverTime = trailingSeries(sessions, {
    periods: days,
    step: dayStep,
    bucketer: startOfDay,
    label: dayLabel,
    metric: 'calories',
    now,
  });
  const durationOverTime = trailingSeries(sessions, {
    periods: days,
    step: dayStep,
    bucketer: startOfDay,
    label: dayLabel,
    metric: 'durationSec',
    now,
  });
  const frequency = trailingSeries(sessions, {
    periods: days,
    step: dayStep,
    bucketer: startOfDay,
    label: dayLabel,
    metric: 'count',
    now,
  });
  const activity: ChartPoint[] = frequency.map((p) => ({ ...p, value: p.value > 0 ? 1 : 0 }));

  const weeklyReps = trailingSeries(sessions, {
    periods: 12,
    step: (from, n) => addDays(from, n * 7),
    bucketer: startOfWeek,
    label: (d) => `W${isoWeekNumber(d)}`,
    metric: 'reps',
    now,
  });
  const monthlyReps = trailingSeries(sessions, {
    periods: 12,
    step: (from, n) => new Date(from.getFullYear(), from.getMonth() + n, 1),
    bucketer: startOfMonth,
    label: (d) => formatMonthShort(d),
    metric: 'reps',
    now,
  });

  const distribution = exerciseDistribution(
    filterByRange(sessions, resolveDateRange(preset, now)),
  );

  return {
    dailyReps,
    weeklyReps,
    monthlyReps,
    caloriesOverTime,
    durationOverTime,
    frequency,
    activity,
    distribution,
  };
}

// --- Superlatives ----------------------------------------------------------

/** Reps grouped by exercise, sorted most-trained first. */
export function exerciseDistribution(sessions: WorkoutSession[]): ExerciseSlice[] {
  const reps = new Map<ExerciseId, number>();
  const workouts = new Map<ExerciseId, number>();
  for (const s of sessions) {
    const seen = new Set<ExerciseId>();
    for (const set of s.sets) {
      reps.set(set.exerciseId, (reps.get(set.exerciseId) ?? 0) + set.reps);
      if (!seen.has(set.exerciseId)) {
        workouts.set(set.exerciseId, (workouts.get(set.exerciseId) ?? 0) + 1);
        seen.add(set.exerciseId);
      }
    }
  }
  const totalReps = Array.from(reps.values()).reduce((a, b) => a + b, 0);
  return Array.from(reps.entries())
    .map(([exerciseId, r]) => ({
      exerciseId,
      name: EXERCISES.find((e) => e.id === exerciseId)?.name ?? exerciseId,
      reps: r,
      workouts: workouts.get(exerciseId) ?? 0,
      fraction: totalReps > 0 ? r / totalReps : 0,
    }))
    .sort((a, b) => b.reps - a.reps);
}

/** The exercise with the most total reps across all history. */
export function mostTrainedExercise(sessions: WorkoutSession[]): ExerciseId | null {
  const dist = exerciseDistribution(sessions);
  return dist[0]?.exerciseId ?? null;
}

/** The single period (by a bucketer) with the highest total reps. */
function peakBucket(
  sessions: WorkoutSession[],
  bucketer: Bucketer,
  label: (isoDate: string) => string,
): NamedTotal | null {
  const totals = bucketTotals(sessions, bucketer);
  let best: { key: number; reps: number } | null = null;
  for (const [key, t] of totals) {
    if (!best || t.reps > best.reps) best = { key, reps: t.reps };
  }
  if (!best || best.reps === 0) return null;
  const isoDate = new Date(best.key).toISOString();
  return { isoDate, label: label(isoDate), value: best.reps };
}

export function bestDay(sessions: WorkoutSession[]): NamedTotal | null {
  return peakBucket(sessions, startOfDay, formatShortDate);
}

export function mostProductiveWeek(sessions: WorkoutSession[]): NamedTotal | null {
  return peakBucket(
    sessions,
    startOfWeek,
    (iso) => `Week of ${formatShortDate(iso)}`,
  );
}

export function mostProductiveMonth(sessions: WorkoutSession[]): NamedTotal | null {
  return peakBucket(sessions, startOfMonth, formatMonthLabel);
}
