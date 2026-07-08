import { DEFAULT_BODY_WEIGHT_KG, getExercise } from '@/constants';
import type { ExerciseId } from '@/types';

/**
 * Offline calorie estimate using the MET (Metabolic Equivalent of Task) model:
 *
 *   kcal = MET × bodyWeightKg × durationHours
 *
 * This is the same formula fitness trackers use as a baseline. It intentionally
 * needs no user input beyond an assumed body weight; it is an estimate, not a
 * medical measurement.
 */
export function estimateCalories(
  exerciseId: ExerciseId,
  durationSec: number,
  bodyWeightKg: number = DEFAULT_BODY_WEIGHT_KG,
): number {
  const met = getExercise(exerciseId).met;
  const hours = Math.max(0, durationSec) / 3600;
  return met * bodyWeightKg * hours;
}
