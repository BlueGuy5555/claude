/**
 * Tiny assertion helpers shared by the analytics test suite. No test framework
 * — assertions throw and each file prints a pass/fail summary — matching the
 * style of the existing `src/ai/__tests__` suite so `npm test` stays uniform.
 */
import type { ExerciseId, WorkoutSession } from '@/types';

export interface Counters {
  passed: number;
  failed: number;
}

export function makeCheck(counters: Counters) {
  return function check(name: string, cond: boolean, detail = ''): void {
    if (cond) {
      counters.passed += 1;
      console.log(`  ✓ ${name}`);
    } else {
      counters.failed += 1;
      console.log(`  ✗ ${name} ${detail}`);
    }
  };
}

export function summary(title: string, counters: Counters): void {
  console.log(`\n${title}: ${counters.passed} passed, ${counters.failed} failed`);
  if (counters.failed > 0) process.exitCode = 1;
}

/** Approximate equality for floating-point comparisons. */
export function approx(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) <= eps;
}

let seq = 0;

/**
 * Build a workout session at a given date with sensible derived fields. Time of
 * day defaults to noon so day-bucketing is unambiguous regardless of timezone.
 */
export function session(opts: {
  date: string; // 'YYYY-MM-DD'
  exercise?: ExerciseId;
  reps?: number;
  durationSec?: number;
  calories?: number;
  hour?: number;
  repOffsetsMs?: number[];
  avgConfidence?: number;
}): WorkoutSession {
  const {
    date,
    exercise = 'pushup',
    reps = 20,
    durationSec = 120,
    calories,
    hour = 12,
    repOffsetsMs,
    avgConfidence,
  } = opts;
  const started = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
  const ended = new Date(started.getTime() + durationSec * 1000);
  seq += 1;
  return {
    id: `test_${seq}`,
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    durationSec,
    sets: [{ exerciseId: exercise, reps }],
    totalReps: reps,
    calories: calories ?? Math.round(reps * 0.32 * 10) / 10,
    avgRepSpeedSec: reps > 0 ? Math.round((durationSec / reps) * 10) / 10 : undefined,
    repOffsetsMs,
    avgConfidence,
  };
}

/** A fixed "now" so time-relative assertions are deterministic. */
export const NOW = new Date('2026-07-09T12:00:00');
