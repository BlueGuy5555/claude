import type { Exercise, ExerciseId } from '@/types';

/**
 * The catalogue of supported exercises. Defined here (not fetched) because the
 * app is fully offline. This drives menus, labels, calorie estimates, and which
 * rep-counting state machine is used.
 *
 * MET values come from the Compendium of Physical Activities and are used only
 * for a rough calorie estimate.
 */
export const EXERCISES: readonly Exercise[] = [
  {
    id: 'pushup',
    name: 'Push-up',
    icon: 'fitness-outline',
    kind: 'reps',
    met: 8,
    cue: 'Lower until your elbows bend to ~90°, then press back up.',
  },
  {
    id: 'squat',
    name: 'Squat',
    icon: 'body-outline',
    kind: 'reps',
    met: 5,
    cue: 'Sit back until your thighs are parallel, then drive up.',
  },
  {
    id: 'pullup',
    name: 'Pull-up',
    icon: 'barbell-outline',
    kind: 'reps',
    met: 8,
    cue: 'Pull until your chin clears the bar, then lower with control.',
  },
  {
    id: 'lunge',
    name: 'Lunge',
    icon: 'trending-up-outline',
    kind: 'reps',
    met: 6,
    cue: 'Step down until your front knee bends to ~90°, then return.',
  },
  {
    id: 'jumping_jack',
    name: 'Jumping Jack',
    icon: 'walk-outline',
    kind: 'reps',
    met: 8,
    cue: 'Arms overhead and feet wide, then back to the start.',
  },
  {
    id: 'plank',
    name: 'Plank',
    icon: 'accessibility-outline',
    kind: 'timed',
    met: 4,
    cue: 'Hold a straight line from shoulders to ankles.',
  },
] as const;

const EXERCISE_BY_ID: Readonly<Record<ExerciseId, Exercise>> = EXERCISES.reduce(
  (acc, exercise) => {
    acc[exercise.id] = exercise;
    return acc;
  },
  {} as Record<ExerciseId, Exercise>,
);

/** Look up an exercise by id. Throws only on an impossible (untyped) id. */
export function getExercise(id: ExerciseId): Exercise {
  const exercise = EXERCISE_BY_ID[id];
  if (!exercise) throw new Error(`Unknown exercise id: ${id}`);
  return exercise;
}
