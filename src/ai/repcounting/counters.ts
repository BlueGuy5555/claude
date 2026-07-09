import { ExerciseCounter } from './ExerciseCounter';
import { EXERCISE_DEFINITIONS } from './definitions';

/**
 * Push-up repetition counter.
 *
 * A rep is counted only when *all* of the following happen in order, which is
 * why the four failure modes of the old elbow-only counter disappear:
 *
 * 1. The body is a straight, roughly-horizontal plank (rejects arm-waving while
 *    sitting, and standing still — a vertical torso never passes the gate).
 * 2. The elbows bend past the "bottom" threshold (rejects partial reps).
 * 3. Shoulders *and* hips descend together from the top baseline (a second,
 *    independent confirmation that the whole body moved, not just the arms).
 * 4. The body returns to full extension at the top (rejects half reps and
 *    prevents double counting via the top/bottom hysteresis bands).
 */
export class PushupCounter extends ExerciseCounter {
  constructor(minConfidence: number) {
    super(EXERCISE_DEFINITIONS.pushup, minConfidence);
  }
}

/**
 * Squat repetition counter.
 *
 * Uses knee flexion as the primary depth signal, gated by an upright-torso
 * check (rejects lying/bobbing) and corroborated by the hips actually
 * descending from the standing baseline (rejects knee-only bounces).
 */
export class SquatCounter extends ExerciseCounter {
  constructor(minConfidence: number) {
    super(EXERCISE_DEFINITIONS.squat, minConfidence);
  }
}
