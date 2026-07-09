import { EXERCISES } from '@/constants';
import type { ExerciseId, IconName, WorkoutSession } from '@/types';
import { createId, formatDuration, formatRelativeDate } from '@/utils';

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

export interface CompletedWorkout {
  exerciseId: ExerciseId;
  reps: number;
  startedAt: Date;
  endedAt: Date;
}

/** Assemble a persistable session from a finished single-exercise workout. */
export function buildSession(workout: CompletedWorkout): WorkoutSession {
  const durationSec = Math.max(
    0,
    Math.round((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000),
  );
  return {
    id: createId('workout'),
    startedAt: workout.startedAt.toISOString(),
    endedAt: workout.endedAt.toISOString(),
    durationSec,
    sets: [{ exerciseId: workout.exerciseId, reps: workout.reps }],
    totalReps: workout.reps,
    calories: estimateCalories(workout.exerciseId, workout.reps),
  };
}

function exerciseIcon(id: ExerciseId): IconName {
  return EXERCISES.find((e) => e.id === id)?.icon ?? 'barbell-outline';
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
    caloriesLabel:
      session.calories != null ? `${Math.round(session.calories)} kcal` : null,
    icon: firstExercise ? exerciseIcon(firstExercise) : 'barbell-outline',
  };
}
