import { EXERCISES } from '@/constants';
import type { ExerciseId, IconName, WorkoutSession } from '@/types';
import { formatDuration, formatRelativeDate } from '@/utils';

/** A workout session shaped for direct rendering in a list row. */
export interface WorkoutHistoryItem {
  id: string;
  title: string;
  relativeDate: string;
  durationLabel: string;
  totalReps: number;
  /** Ionicons glyph representing the first exercise of the session. */
  icon: IconName;
}

/** Resolve a display name for an exercise id, falling back to the raw id. */
export function exerciseName(id: ExerciseId): string {
  return EXERCISES.find((e) => e.id === id)?.name ?? id;
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
    icon: firstExercise ? exerciseIcon(firstExercise) : 'barbell-outline',
  };
}
