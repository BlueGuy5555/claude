import type { ExerciseId } from './workout';

/**
 * Lightweight, non-critical user preferences. Kept separate from `Settings`
 * (which are the explicit toggles the user manages) so that internal state can
 * evolve without touching the Settings UI contract.
 */
export interface Preferences {
  /** The exercise selected the last time a workout was started. */
  lastExerciseId: ExerciseId | null;
  /** Whether the first-run experience has been seen. */
  hasCompletedOnboarding: boolean;
  /** Measurement system used when displaying stats. */
  units: 'metric' | 'imperial';
}

export const DEFAULT_PREFERENCES: Preferences = {
  lastExerciseId: null,
  hasCompletedOnboarding: false,
  units: 'metric',
};
