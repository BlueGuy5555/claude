/**
 * Every AsyncStorage key the app uses, namespaced under a single prefix so the
 * app's data is easy to identify and wipe as a group. Bumping `SCHEMA_VERSION`
 * (embedded in the prefix) is how future migrations can invalidate old data.
 */
const SCHEMA_VERSION = 'v1';
const PREFIX = `@repcount/${SCHEMA_VERSION}`;

export const StorageKeys = {
  /** User-managed toggles (vibration, sound, dark mode). */
  settings: `${PREFIX}/settings`,
  /** Internal, non-critical preferences. */
  preferences: `${PREFIX}/preferences`,
  /** Array of completed workout sessions (newest first). */
  workoutHistory: `${PREFIX}/workout-history`,
  /** A single in-progress session that can be resumed after a restart. */
  activeSession: `${PREFIX}/active-session`,
  /** Cached snapshot of aggregated statistics. */
  statistics: `${PREFIX}/statistics`,
  /** User-configured goals. */
  goals: `${PREFIX}/goals`,
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
