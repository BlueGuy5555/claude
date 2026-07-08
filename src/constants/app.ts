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
 * The catalogue of exercises the app will support. Defined here (not fetched)
 * because the app is fully offline. Rep-counting logic arrives in a later
 * milestone; for now this drives menus and labels only.
 */
export const EXERCISES: readonly Exercise[] = [
  { id: 'squat', name: 'Squat', icon: 'body-outline' },
  { id: 'pushup', name: 'Push-up', icon: 'fitness-outline' },
  { id: 'situp', name: 'Sit-up', icon: 'accessibility-outline' },
  { id: 'jumping_jack', name: 'Jumping Jack', icon: 'walk-outline' },
  { id: 'lunge', name: 'Lunge', icon: 'trending-up-outline' },
] as const;
