import type { ExerciseId } from '@/types';

import { ExerciseCounter } from './ExerciseCounter';
import { EXERCISE_DEFINITIONS } from './definitions';
import { PushupCounter, SquatCounter } from './counters';
import type { RepCounterLike } from './types';

/**
 * Build the right counter for an exercise. Push-ups and squats get their
 * purpose-built subclasses; everything else is driven by the generic engine +
 * its definition. Adding a new exercise means adding one definition — this
 * factory needs no change.
 */
export function createCounter(exerciseId: ExerciseId, minConfidence: number): RepCounterLike {
  switch (exerciseId) {
    case 'pushup':
      return new PushupCounter(minConfidence);
    case 'squat':
      return new SquatCounter(minConfidence);
    default:
      return new ExerciseCounter(EXERCISE_DEFINITIONS[exerciseId], minConfidence);
  }
}
