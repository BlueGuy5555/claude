import type { ExerciseId, WorkoutSession } from '@/types';
import { createId } from '@/utils';

import { estimateCalories } from './calories';

export interface CompletedWorkout {
  exerciseId: ExerciseId;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  reps: number;
  avgConfidence: number;
}

/**
 * Turn the raw result of a finished session into the persisted
 * {@link WorkoutSession} shape, computing the calorie estimate along the way.
 * Kept pure (no storage, no React) so it is trivial to unit test.
 */
export function buildWorkoutSession(result: CompletedWorkout): WorkoutSession {
  const calories = estimateCalories(result.exerciseId, result.durationSec);
  return {
    id: createId('wk'),
    startedAt: result.startedAt.toISOString(),
    endedAt: result.endedAt.toISOString(),
    durationSec: Math.round(result.durationSec),
    sets: [{ exerciseId: result.exerciseId, reps: result.reps }],
    totalReps: result.reps,
    calories: Math.round(calories * 10) / 10,
    avgConfidence: Math.round(result.avgConfidence * 100) / 100,
  };
}
