import type { Exercise, ExerciseId } from '@/types';

/** Static, build-time app metadata. */
export const APP = {
  name: 'RepCount',
  tagline: 'Offline rep counter',
  version: '1.0.0',
  /** Everything runs on-device; this flag documents that intent in code. */
  offlineOnly: true,
} as const;

/**
 * The catalogue of exercises the app supports. Defined here (not fetched)
 * because the app is fully offline. `caloriesPerRep` drives the live calorie
 * estimate; `focus` is a short label shown in the exercise picker.
 */
export const EXERCISES: readonly Exercise[] = [
  { id: 'squat', name: 'Squat', focus: 'Legs & glutes', icon: 'body-outline', caloriesPerRep: 0.32 },
  { id: 'pushup', name: 'Push-up', focus: 'Chest & arms', icon: 'fitness-outline', caloriesPerRep: 0.29 },
  { id: 'situp', name: 'Sit-up', focus: 'Core', icon: 'accessibility-outline', caloriesPerRep: 0.15 },
  { id: 'jumping_jack', name: 'Jumping Jack', focus: 'Full body', icon: 'walk-outline', caloriesPerRep: 0.2 },
  { id: 'lunge', name: 'Lunge', focus: 'Legs', icon: 'trending-up-outline', caloriesPerRep: 0.33 },
] as const;

/** The exercise selected by default before the user has picked one. */
export const DEFAULT_EXERCISE_ID: ExerciseId = 'squat';

/** Tunables for the workout session experience. */
export const WORKOUT = {
  /**
   * Interval between *simulated* reps while a session is running, in ms. This
   * stands in for real pose detection so the UI can be tested. Removing this in
   * favour of a detector later requires no other changes to the session hook.
   */
  simulatedRepIntervalMs: 2500,
} as const;
