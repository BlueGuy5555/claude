/**
 * Unit tests for the pure analytics engine.
 *
 * Run with: `npx tsx src/services/__tests__/analyticsService.test.ts`
 */
import {
  buildChartData,
  exerciseDistribution,
  filterByRange,
  mostTrainedExercise,
  resolveDateRange,
  summarize,
  summarizeRange,
} from '@/services';

import { makeCheck, NOW, session, summary, type Counters } from './helpers';

const counters: Counters = { passed: 0, failed: 0 };
const check = makeCheck(counters);

// --- resolveDateRange ------------------------------------------------------

console.log('resolveDateRange');
{
  const today = resolveDateRange('today', NOW);
  check('today starts at midnight', today.start?.getHours() === 0);
  check('today has bounded start and end', today.start !== null && today.end !== null);

  const all = resolveDateRange('all', NOW);
  check('all-time is unbounded', all.start === null && all.end === null);

  const week = resolveDateRange('7d', NOW);
  const spanDays = week.end && week.start
    ? Math.round((week.end.getTime() - week.start.getTime()) / 86400000)
    : 0;
  check('7d spans 7 calendar days', spanDays === 7, `got ${spanDays}`);
}

// --- filterByRange ---------------------------------------------------------

console.log('filterByRange');
{
  const sessions = [
    session({ date: '2026-07-09' }), // today
    session({ date: '2026-07-01' }), // 8 days ago
    session({ date: '2026-06-01' }), // last month
  ];
  const last7 = filterByRange(sessions, resolveDateRange('7d', NOW));
  check('7d window keeps only recent sessions', last7.length === 1, `got ${last7.length}`);

  const all = filterByRange(sessions, resolveDateRange('all', NOW));
  check('all-time keeps everything', all.length === 3);
}

// --- summarize -------------------------------------------------------------

console.log('summarize');
{
  const sessions = [
    session({ date: '2026-07-09', reps: 30, durationSec: 60, calories: 10 }),
    session({ date: '2026-07-08', reps: 10, durationSec: 60, calories: 5 }),
  ];
  const s = summarize(sessions);
  check('sums workouts', s.workouts === 2);
  check('sums reps', s.reps === 40, `got ${s.reps}`);
  check('sums calories', s.calories === 15, `got ${s.calories}`);
  check('sums duration', s.durationSec === 120);
  check('avg rep speed = duration / reps', s.avgRepSpeedSec === 3, `got ${s.avgRepSpeedSec}`);

  const empty = summarize([]);
  check('empty summary has null pace', empty.avgRepSpeedSec === null);
  check('empty summary zeroes', empty.reps === 0 && empty.workouts === 0);
}

// --- summarizeRange --------------------------------------------------------

console.log('summarizeRange');
{
  const sessions = [
    session({ date: '2026-07-09', reps: 30 }),
    session({ date: '2026-05-01', reps: 100 }),
  ];
  const month = summarizeRange(sessions, 'month', NOW);
  check('this-month range excludes May', month.reps === 30, `got ${month.reps}`);
}

// --- exerciseDistribution --------------------------------------------------

console.log('exerciseDistribution');
{
  const sessions = [
    session({ date: '2026-07-09', exercise: 'pushup', reps: 60 }),
    session({ date: '2026-07-08', exercise: 'squat', reps: 40 }),
    session({ date: '2026-07-07', exercise: 'pushup', reps: 20 }),
  ];
  const dist = exerciseDistribution(sessions);
  check('groups by exercise', dist.length === 2);
  check('sorted most-trained first', dist[0]!.exerciseId === 'pushup');
  check('aggregates reps across sessions', dist[0]!.reps === 80, `got ${dist[0]!.reps}`);
  check('counts workouts per exercise', dist[0]!.workouts === 2);
  check(
    'fractions sum to 1',
    Math.abs(dist.reduce((a, b) => a + b.fraction, 0) - 1) < 1e-9,
  );
  check('most trained helper agrees', mostTrainedExercise(sessions) === 'pushup');
}

// --- buildChartData --------------------------------------------------------

console.log('buildChartData');
{
  const sessions = [
    session({ date: '2026-07-09', reps: 30 }),
    session({ date: '2026-07-08', reps: 20 }),
  ];
  const charts = buildChartData(sessions, '7d', NOW);
  check('daily series has 7 buckets', charts.dailyReps.length === 7, `got ${charts.dailyReps.length}`);
  check(
    'last daily bucket is today with 30 reps',
    charts.dailyReps[charts.dailyReps.length - 1]!.value === 30,
  );
  check(
    'second-to-last bucket has 20 reps',
    charts.dailyReps[charts.dailyReps.length - 2]!.value === 20,
  );
  check('weekly series has 12 buckets', charts.weeklyReps.length === 12);
  check('monthly series has 12 buckets', charts.monthlyReps.length === 12);
  check('activity is binary', charts.activity.every((p) => p.value === 0 || p.value === 1));
  check(
    'duration series is in minutes',
    charts.durationOverTime[charts.durationOverTime.length - 1]!.value === 2,
    'expected 120s -> 2min',
  );
}

summary('analyticsService', counters);
