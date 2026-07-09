/**
 * Unit tests for the comprehensive statistics snapshot.
 *
 * Run with: `npx tsx src/services/__tests__/statisticsService.test.ts`
 */
import { computeStatistics } from '@/services';
import { EMPTY_STATISTICS } from '@/types';

import { makeCheck, NOW, session, summary, type Counters } from './helpers';

const counters: Counters = { passed: 0, failed: 0 };
const check = makeCheck(counters);

console.log('computeStatistics — empty');
{
  const s = computeStatistics([], NOW);
  check('empty history returns EMPTY_STATISTICS', s === EMPTY_STATISTICS);
}

console.log('computeStatistics — totals and averages');
{
  const sessions = [
    session({ date: '2026-07-09', exercise: 'pushup', reps: 30, durationSec: 60, calories: 10 }),
    session({ date: '2026-07-08', exercise: 'pushup', reps: 10, durationSec: 140, calories: 4 }),
  ];
  const s = computeStatistics(sessions, NOW);
  check('totalWorkouts', s.totalWorkouts === 2);
  check('totalReps', s.totalReps === 40, `got ${s.totalReps}`);
  check('totalDurationSec', s.totalDurationSec === 200);
  check('totalCalories', s.totalCalories === 14, `got ${s.totalCalories}`);
  check('avgWorkoutDurationSec', s.avgWorkoutDurationSec === 100, `got ${s.avgWorkoutDurationSec}`);
  check('avgRepsPerWorkout', s.avgRepsPerWorkout === 20, `got ${s.avgRepsPerWorkout}`);
  check('mostTrainedExerciseId', s.mostTrainedExerciseId === 'pushup');
  check('lastWorkoutAt is the most recent', s.lastWorkoutAt === sessions[0]!.startedAt);
}

console.log('computeStatistics — today / this week / this month');
{
  const sessions = [
    session({ date: '2026-07-09', reps: 30, durationSec: 60, calories: 10 }), // today
    session({ date: '2026-07-06', reps: 20 }), // this week (Mon)
    session({ date: '2026-07-02', reps: 15 }), // this month, prior week
    session({ date: '2026-06-20', reps: 100 }), // last month
  ];
  const s = computeStatistics(sessions, NOW);
  check('repsToday', s.repsToday === 30, `got ${s.repsToday}`);
  check('caloriesToday', s.caloriesToday === 10, `got ${s.caloriesToday}`);
  check('durationTodaySec', s.durationTodaySec === 60);
  check('workoutsThisWeek', s.workoutsThisWeek === 2, `got ${s.workoutsThisWeek}`);
  check('workoutsThisMonth', s.workoutsThisMonth === 3, `got ${s.workoutsThisMonth}`);
}

console.log('computeStatistics — superlatives');
{
  const sessions = [
    session({ date: '2026-07-09', reps: 30 }),
    session({ date: '2026-07-09', reps: 40 }), // same day -> best day 70
    session({ date: '2026-07-01', reps: 25 }),
  ];
  const s = computeStatistics(sessions, NOW);
  check('bestDay aggregates same-day reps', s.bestDay?.value === 70, `got ${s.bestDay?.value}`);
  check('mostProductiveWeek is present', s.mostProductiveWeek !== null);
  check('mostProductiveMonth is present', s.mostProductiveMonth !== null);
}

summary('statisticsService', counters);
