import { describe, expect, it } from 'vitest';

import { EMPTY_STATISTICS, type ExerciseId, type WorkoutSession } from '@/types';

import { computeStatistics } from './statisticsService';

const NOW = new Date(2026, 6, 8, 12, 0, 0); // Wed 8 Jul 2026, local time

function daysAgoISO(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function session(
  exerciseId: ExerciseId,
  reps: number,
  durationSec: number,
  calories: number,
  daysAgo: number,
): WorkoutSession {
  return {
    id: `s-${daysAgo}`,
    startedAt: daysAgoISO(daysAgo),
    endedAt: daysAgoISO(daysAgo),
    durationSec,
    sets: [{ exerciseId, reps }],
    totalReps: reps,
    calories,
    avgConfidence: 0.8,
  };
}

const SESSIONS: WorkoutSession[] = [
  session('squat', 20, 300, 30, 0),
  session('squat', 15, 200, 20, 1),
  session('pushup', 25, 250, 25, 3),
  session('plank', 0, 600, 40, 40),
];

describe('computeStatistics', () => {
  it('returns EMPTY_STATISTICS for no history', () => {
    expect(computeStatistics([], NOW)).toEqual(EMPTY_STATISTICS);
  });

  it('computes headline totals', () => {
    const stats = computeStatistics(SESSIONS, NOW);
    expect(stats.totalWorkouts).toBe(4);
    expect(stats.totalReps).toBe(60);
    expect(stats.totalDurationSec).toBe(1350);
    expect(stats.totalCalories).toBe(115);
    expect(stats.longestWorkoutSec).toBe(600);
    expect(stats.averageDurationSec).toBe(338);
  });

  it('computes weekly and monthly windows', () => {
    const stats = computeStatistics(SESSIONS, NOW);
    expect(stats.workoutsThisWeek).toBe(3);
    expect(stats.repsThisWeek).toBe(60);
    expect(stats.workoutsThisMonth).toBe(3);
    expect(stats.repsThisMonth).toBe(60);
  });

  it('computes current and longest streaks by calendar day', () => {
    const stats = computeStatistics(SESSIONS, NOW);
    expect(stats.currentStreakDays).toBe(2); // today + yesterday
    expect(stats.longestStreakDays).toBe(2);
  });

  it('builds an exercise breakdown ordered by reps', () => {
    const stats = computeStatistics(SESSIONS, NOW);
    expect(stats.exerciseBreakdown.map((e) => e.exerciseId)).toEqual([
      'squat',
      'pushup',
      'plank',
    ]);
    const squat = stats.exerciseBreakdown.find((e) => e.exerciseId === 'squat')!;
    expect(squat).toMatchObject({ workouts: 2, reps: 35, durationSec: 500, calories: 50 });
  });

  it('tracks personal records per exercise', () => {
    const stats = computeStatistics(SESSIONS, NOW);
    const squatPr = stats.personalRecords.find((r) => r.exerciseId === 'squat')!;
    expect(squatPr.bestReps).toBe(20);
    expect(squatPr.bestDurationSec).toBe(300);
    const plankPr = stats.personalRecords.find((r) => r.exerciseId === 'plank')!;
    expect(plankPr.bestDurationSec).toBe(600);
  });
});
