/**
 * View-model for the Session Detail screen.
 *
 * Pure mapping from a stored {@link WorkoutSession} to labelled, display-ready
 * rows. Keeping it here (out of the screen) means the "estimated effort" and
 * "average pace" heuristics are unit-testable and reusable.
 */
import type { IconName, WorkoutSession } from '@/types';
import {
  formatCalories,
  formatDuration,
  formatLongDate,
  formatPace,
  formatTimeOfDay,
} from '@/utils';

import { exerciseIcon, exerciseName } from './workoutService';

/** Qualitative effort bucket derived from calories burned per active minute. */
export type EffortLevel = 'Light' | 'Moderate' | 'Intense';

export interface DetailMetric {
  label: string;
  value: string;
  icon: IconName;
}

export interface SessionDetailViewModel {
  title: string;
  icon: IconName;
  dateLabel: string;
  startLabel: string;
  finishLabel: string;
  metrics: DetailMetric[];
  effort: EffortLevel;
  /** Per-rep pace samples (seconds between reps) for the mini rep-pace chart. */
  repPaceSec: number[];
  notes: string | null;
  /** Sections that will hold form analysis once that feature ships. */
  formPlaceholders: string[];
}

/**
 * Effort heuristic: kilocalories per active minute. The thresholds are gentle
 * and exercise-agnostic — enough to give the session a human label without
 * pretending to be a physiological model.
 */
export function estimateEffort(session: WorkoutSession): EffortLevel {
  const minutes = session.durationSec / 60;
  if (minutes <= 0 || !session.calories) return 'Light';
  const kcalPerMin = session.calories / minutes;
  if (kcalPerMin >= 6) return 'Intense';
  if (kcalPerMin >= 3) return 'Moderate';
  return 'Light';
}

/** Convert stored rep offsets into inter-rep intervals in seconds. */
function repPace(session: WorkoutSession): number[] {
  const offsets = session.repOffsetsMs ?? [];
  const pace: number[] = [];
  for (let i = 1; i < offsets.length; i += 1) {
    pace.push(Math.round(((offsets[i]! - offsets[i - 1]!) / 1000) * 10) / 10);
  }
  return pace;
}

export function buildSessionDetail(session: WorkoutSession): SessionDetailViewModel {
  const firstExercise = session.sets[0]?.exerciseId;
  const title =
    session.sets.length === 1 && firstExercise
      ? exerciseName(firstExercise)
      : 'Workout';

  const avgPace = session.avgRepSpeedSec ?? null;

  const metrics: DetailMetric[] = [
    { label: 'Total reps', value: `${session.totalReps}`, icon: 'repeat-outline' },
    { label: 'Duration', value: formatDuration(session.durationSec), icon: 'time-outline' },
  ];
  if (session.calories != null) {
    metrics.push({
      label: 'Calories',
      value: formatCalories(session.calories),
      icon: 'flame-outline',
    });
  }
  metrics.push({
    label: 'Average pace',
    value: formatPace(avgPace),
    icon: 'speedometer-outline',
  });
  if (session.avgRepSpeedSec != null) {
    metrics.push({
      label: 'Avg rep speed',
      value: `${session.avgRepSpeedSec}s`,
      icon: 'stopwatch-outline',
    });
  }
  if (session.bestRepStreak != null) {
    metrics.push({
      label: 'Best rep streak',
      value: `${session.bestRepStreak}`,
      icon: 'flash-outline',
    });
  }
  if (session.fastestRepSec != null) {
    metrics.push({
      label: 'Fastest rep',
      value: `${session.fastestRepSec}s`,
      icon: 'arrow-up-outline',
    });
  }
  if (session.slowestRepSec != null) {
    metrics.push({
      label: 'Slowest rep',
      value: `${session.slowestRepSec}s`,
      icon: 'arrow-down-outline',
    });
  }
  if (session.avgConfidence != null) {
    metrics.push({
      label: 'Avg confidence',
      value: `${Math.round(session.avgConfidence * 100)}%`,
      icon: 'shield-checkmark-outline',
    });
  }

  return {
    title,
    icon: firstExercise ? exerciseIcon(firstExercise) : 'barbell-outline',
    dateLabel: formatLongDate(session.startedAt),
    startLabel: formatTimeOfDay(session.startedAt),
    finishLabel: session.endedAt ? formatTimeOfDay(session.endedAt) : '—',
    metrics,
    effort: estimateEffort(session),
    repPaceSec: repPace(session),
    notes: session.notes ?? null,
    formPlaceholders: [
      'Range of motion',
      'Tempo consistency',
      'Left/right symmetry',
    ],
  };
}
