import { EXERCISES } from '@/constants';
import type { ExerciseId, WorkoutSet } from '@/types';

/** Fallback per-rep estimate for an unknown exercise id. */
const FALLBACK_CALORIES_PER_REP = 0.25;

function caloriesPerRep(id: ExerciseId): number {
  return EXERCISES.find((exercise) => exercise.id === id)?.caloriesPerRep ?? FALLBACK_CALORIES_PER_REP;
}

/** Estimated energy for a single set, in kilocalories. */
export function estimateSetCalories(set: WorkoutSet): number {
  return set.reps * caloriesPerRep(set.exerciseId);
}

/** Estimated energy for a collection of sets, in kilocalories. */
export function estimateCalories(sets: WorkoutSet[]): number {
  return sets.reduce((total, set) => total + estimateSetCalories(set), 0);
}
