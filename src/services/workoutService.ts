import { EXERCISES } from '@/constants';
import type { Exercise, ExerciseId, IconName, WorkoutSession, WorkoutSet } from '@/types';
import { createId, formatDuration, formatRelativeDate } from '@/utils';

import { estimateCalories } from './caloriesService';

/** Resolve the full exercise record for an id, if known. */
export function getExercise(id: ExerciseId): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

/** Resolve a display name for an exercise id, falling back to the raw id. */
export function exerciseName(id: ExerciseId): string {
  return getExercise(id)?.name ?? id;
}

/** Resolve the icon for an exercise id, with a sensible default. */
export function exerciseIcon(id: ExerciseId): IconName {
  return getExercise(id)?.icon ?? 'barbell-outline';
}

/** Sum of reps across every set. */
export function totalReps(sets: WorkoutSet[]): number {
  return sets.reduce((sum, set) => sum + set.reps, 0);
}

/** Create a fresh, empty in-progress session that starts now. */
export function createSession(startedAt: Date = new Date()): WorkoutSession {
  return {
    id: createId('wk'),
    startedAt: startedAt.toISOString(),
    endedAt: null,
    durationSec: 0,
    sets: [],
    totalReps: 0,
    calories: 0,
  };
}

/**
 * Immutably add `delta` reps to a set for `exerciseId`, creating the set if it
 * does not exist yet. Reps never go below zero. Passing a negative delta for a
 * non-existent set is a no-op.
 */
export function applyReps(
  sets: WorkoutSet[],
  exerciseId: ExerciseId,
  delta: number,
): WorkoutSet[] {
  const existing = sets.find((set) => set.exerciseId === exerciseId);
  if (existing) {
    return sets.map((set) =>
      set.exerciseId === exerciseId ? { ...set, reps: Math.max(0, set.reps + delta) } : set,
    );
  }
  if (delta <= 0) return sets;
  return [...sets, { exerciseId, reps: delta }];
}

/** Reps recorded so far for a single exercise within a set list. */
export function repsForExercise(sets: WorkoutSet[], exerciseId: ExerciseId): number {
  return sets.find((set) => set.exerciseId === exerciseId)?.reps ?? 0;
}

/**
 * Finalize an in-progress session into a completed one: drop empty sets, stamp
 * the end time, and recompute totals and the calorie estimate.
 */
export function finalizeSession(
  session: WorkoutSession,
  durationSec: number,
  endedAt: Date = new Date(),
): WorkoutSession {
  const sets = session.sets.filter((set) => set.reps > 0);
  return {
    ...session,
    sets,
    durationSec,
    endedAt: endedAt.toISOString(),
    totalReps: totalReps(sets),
    calories: estimateCalories(sets),
  };
}

/**
 * Build a human-friendly title from a session's sets, e.g. a single-exercise
 * session becomes "Squat", two becomes "Squat & Push-up", and more collapse to
 * "Squat +2".
 */
export function sessionTitle(session: WorkoutSession): string {
  const names = session.sets.map((set) => exerciseName(set.exerciseId));
  if (names.length === 0) return 'Workout';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} +${names.length - 1}`;
}

/** A workout session shaped for direct rendering in a list row. */
export interface WorkoutHistoryItem {
  id: string;
  title: string;
  relativeDate: string;
  durationLabel: string;
  totalReps: number;
  /** Estimated energy in kilocalories; formatted for display by the UI. */
  calories: number;
  /** Ionicons glyph representing the first exercise of the session. */
  icon: IconName;
}

/** Map a persisted session into a presentation-ready history item. */
export function toHistoryItem(session: WorkoutSession): WorkoutHistoryItem {
  const firstExercise = session.sets[0]?.exerciseId;
  return {
    id: session.id,
    title: sessionTitle(session),
    relativeDate: formatRelativeDate(session.startedAt),
    durationLabel: formatDuration(session.durationSec),
    totalReps: session.totalReps,
    calories: session.calories,
    icon: firstExercise ? exerciseIcon(firstExercise) : 'barbell-outline',
  };
}
