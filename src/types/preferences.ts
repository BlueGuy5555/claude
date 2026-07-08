import type { ExerciseId } from './workout';

/**
 * Lightweight, non-critical internal state. Kept separate from `Settings`
 * (the explicit toggles the user manages) so internal behaviour can evolve
 * without touching the Settings UI contract.
 */
export interface Preferences {
  /** The exercise selected the last time a workout was started. */
  lastExerciseId: ExerciseId | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  lastExerciseId: null,
};
