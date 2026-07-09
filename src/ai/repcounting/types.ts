import type { ExerciseId } from '@/types';

import type { Keypoint, KeypointName } from '../types';

/**
 * Where the "resting" position sits on the signal's numeric scale.
 * - `high`: the athlete rests at a *large* angle (limbs extended) — push-ups,
 *   squats, pull-ups, lunges all start from full extension.
 * - `low`: the athlete rests at a *small* angle — a jumping jack starts with
 *   arms down (small shoulder angle).
 */
export type RestZone = 'high' | 'low';

/**
 * Everything the generic rep counter needs to score one exercise. The `signal`
 * function reduces a pose to a single scalar (a joint angle) or `null` when the
 * required joints aren't confidently visible.
 */
export interface ExerciseConfig {
  id: ExerciseId;
  /** Where rest lies on the signal scale. */
  restZone: RestZone;
  /** Signal must pass this threshold (toward the active extreme) to arm a rep. */
  activeThreshold: number;
  /** Signal must return past this threshold (toward rest) to complete a rep. */
  restThreshold: number;
  /** Human label for the resting phase, e.g. "Up". */
  restLabel: string;
  /** Human label for the active phase, e.g. "Down". */
  activeLabel: string;
  /** Minimum ms between counted reps — a debounce against residual noise. */
  minRepIntervalMs: number;
  /** Keypoints whose mean score drives the confidence indicator. */
  relevantKeypoints: readonly KeypointName[];
  /** Reduce a pose to the scalar signal, or `null` if not measurable. */
  signal: (keypoints: readonly Keypoint[], minScore: number) => number | null;
}

/** The phase currently shown to the user. */
export type ExercisePhase = 'ready' | 'rest' | 'active';

/** Result of feeding one pose to the counter. */
export interface RepUpdate {
  reps: number;
  phase: ExercisePhase;
  /** `true` on exactly the frame a rep is completed (for haptics/sound). */
  repCompleted: boolean;
  /** Latest signal value, or `null` when not measurable (debug/overlay use). */
  signal: number | null;
}
