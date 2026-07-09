import { EXERCISES } from '@/constants';
import type { ExerciseId, IconName, WorkoutSession } from '@/types';
import {
  createId,
  formatCalories,
  formatDuration,
  formatRelativeDate,
} from '@/utils';

/** A workout session shaped for direct rendering in a list row. */
export interface WorkoutHistoryItem {
  id: string;
  title: string;
  relativeDate: string;
  durationLabel: string;
  totalReps: number;
  /** e.g. "42 kcal", or null when not recorded. */
  caloriesLabel: string | null;
  /** Ionicons glyph representing the first exercise of the session. */
  icon: IconName;
}

/** Resolve a display name for an exercise id, falling back to the raw id. */
export function exerciseName(id: ExerciseId): string {
  return EXERCISES.find((e) => e.id === id)?.name ?? id;
}

export function exerciseIcon(id: ExerciseId): IconName {
  return EXERCISES.find((e) => e.id === id)?.icon ?? 'barbell-outline';
}

/**
 * Rough kilocalories burned per repetition. These are deliberately simple
 * per-rep estimates (not a full MET model) — enough for on-device tracking
 * without any external data.
 */
const KCAL_PER_REP: Record<ExerciseId, number> = {
  pushup: 0.32,
  squat: 0.32,
  pullup: 1.0,
  lunge: 0.35,
  jumping_jack: 0.2,
};

/** Estimate energy burned for a set, rounded to one decimal. */
export function estimateCalories(exerciseId: ExerciseId, reps: number): number {
  return Math.round(reps * KCAL_PER_REP[exerciseId] * 10) / 10;
}

/**
 * Per-rep timing derived from the moments reps were completed. All of these are
 * computed from timestamps the workout screen already records — nothing here
 * touches pose detection.
 */
export interface RepTimingStats {
  avgRepSpeedSec?: number;
  fastestRepSec?: number;
  slowestRepSec?: number;
  bestRepStreak?: number;
}

/**
 * A rep is considered part of the same "unbroken effort" as the previous one
 * unless the gap between them exceeds this many seconds.
 */
const REP_STREAK_GAP_SEC = 5;

/**
 * Reduce the offsets (ms from session start) of each counted rep into timing
 * stats. With fewer than two reps there are no intervals to measure, so only
 * the averages that make sense are returned.
 */
export function computeRepTiming(
  repOffsetsMs: number[],
  durationSec: number,
  totalReps: number,
): RepTimingStats {
  const stats: RepTimingStats = {};

  if (totalReps > 0 && durationSec > 0) {
    stats.avgRepSpeedSec = Math.round((durationSec / totalReps) * 10) / 10;
  }

  if (repOffsetsMs.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < repOffsetsMs.length; i += 1) {
      intervals.push((repOffsetsMs[i]! - repOffsetsMs[i - 1]!) / 1000);
    }
    const positive = intervals.filter((v) => v > 0);
    if (positive.length > 0) {
      stats.fastestRepSec = Math.round(Math.min(...positive) * 10) / 10;
      stats.slowestRepSec = Math.round(Math.max(...positive) * 10) / 10;
    }

    // Longest run of reps with small gaps between them.
    let best = 1;
    let run = 1;
    for (const gap of intervals) {
      if (gap <= REP_STREAK_GAP_SEC) run += 1;
      else run = 1;
      best = Math.max(best, run);
    }
    stats.bestRepStreak = best;
  } else if (totalReps > 0) {
    stats.bestRepStreak = totalReps;
  }

  return stats;
}

export interface CompletedWorkout {
  exerciseId: ExerciseId;
  reps: number;
  startedAt: Date;
  endedAt: Date;
  /** Offsets (ms from `startedAt`) of each counted rep, if captured. */
  repOffsetsMs?: number[];
  /** Mean pose confidence sampled on counted reps, `[0, 1]`, if captured. */
  avgConfidence?: number;
}

/** Assemble a persistable session from a finished single-exercise workout. */
export function buildSession(workout: CompletedWorkout): WorkoutSession {
  const durationSec = Math.max(
    0,
    Math.round((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000),
  );
  const repOffsetsMs = workout.repOffsetsMs ?? [];
  const timing = computeRepTiming(repOffsetsMs, durationSec, workout.reps);

  return {
    id: createId('workout'),
    startedAt: workout.startedAt.toISOString(),
    endedAt: workout.endedAt.toISOString(),
    durationSec,
    sets: [{ exerciseId: workout.exerciseId, reps: workout.reps }],
    totalReps: workout.reps,
    calories: estimateCalories(workout.exerciseId, workout.reps),
    ...timing,
    avgConfidence: workout.avgConfidence,
    repOffsetsMs: repOffsetsMs.length > 0 ? repOffsetsMs : undefined,
  };
}

/**
 * Build a human-friendly title from a session's sets, e.g. a single-exercise
 * session becomes "Squat", two becomes "Squat & Push-up", more collapse to
 * "Squat +2".
 */
function buildTitle(session: WorkoutSession): string {
  const names = session.sets.map((set) => exerciseName(set.exerciseId));
  if (names.length === 0) return 'Workout';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} +${names.length - 1}`;
}

/** Map a persisted session into a presentation-ready history item. */
export function toHistoryItem(session: WorkoutSession): WorkoutHistoryItem {
  const firstExercise = session.sets[0]?.exerciseId;
  return {
    id: session.id,
    title: buildTitle(session),
    relativeDate: formatRelativeDate(session.startedAt),
    durationLabel: formatDuration(session.durationSec),
    totalReps: session.totalReps,
    caloriesLabel: session.calories != null ? formatCalories(session.calories) : null,
    icon: firstExercise ? exerciseIcon(firstExercise) : 'barbell-outline',
  };
}
