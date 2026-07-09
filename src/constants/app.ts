import type { Exercise } from '@/types';

/** Static, build-time app metadata. */
export const APP = {
  name: 'RepCount',
  tagline: 'Offline AI rep counter',
  version: '1.0.0',
  /** Everything runs on-device; this flag documents that intent in code. */
  offlineOnly: true,
} as const;

/**
 * The catalogue of exercises the app can count. Defined here (not fetched)
 * because the app is fully offline. Each id maps to joint-angle rep-counting
 * logic in `src/ai/repcounting`.
 */
export const EXERCISES: readonly Exercise[] = [
  { id: 'pushup', name: 'Push-up', icon: 'fitness-outline' },
  { id: 'squat', name: 'Squat', icon: 'body-outline' },
  { id: 'pullup', name: 'Pull-up', icon: 'barbell-outline' },
  { id: 'lunge', name: 'Lunge', icon: 'trending-up-outline' },
  { id: 'jumping_jack', name: 'Jumping Jack', icon: 'walk-outline' },
] as const;
