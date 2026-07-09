/**
 * Unit tests for goal-progress computation.
 *
 * Run with: `npx tsx src/services/__tests__/goalService.test.ts`
 */
import { computeGoalProgress } from '@/services';
import type { Goal } from '@/types';

import { makeCheck, NOW, session, summary, type Counters } from './helpers';

const counters: Counters = { passed: 0, failed: 0 };
const check = makeCheck(counters);

function goal(partial: Omit<Goal, 'id' | 'createdAt'>): Goal {
  return { id: 'g', createdAt: NOW.toISOString(), ...partial };
}

console.log('computeGoalProgress — daily reps');
{
  const sessions = [
    session({ date: '2026-07-09', reps: 40 }), // today
    session({ date: '2026-07-09', reps: 30 }), // today
    session({ date: '2026-07-08', reps: 100 }), // yesterday, excluded
  ];
  const p = computeGoalProgress(goal({ metric: 'reps', period: 'daily', target: 100 }), sessions, NOW);
  check('sums only today', p.current === 70, `got ${p.current}`);
  check('fraction is current/target', Math.abs(p.fraction - 0.7) < 1e-9, `got ${p.fraction}`);
  check('not completed below target', p.completed === false);
}

console.log('computeGoalProgress — completion + clamping');
{
  const sessions = [session({ date: '2026-07-09', reps: 150 })];
  const p = computeGoalProgress(goal({ metric: 'reps', period: 'daily', target: 100 }), sessions, NOW);
  check('completed when target reached', p.completed === true);
  check('fraction clamps to 1', p.fraction === 1, `got ${p.fraction}`);
  check('current is not clamped', p.current === 150);
}

console.log('computeGoalProgress — weekly workouts');
{
  const sessions = [
    session({ date: '2026-07-09' }),
    session({ date: '2026-07-08' }),
    session({ date: '2026-07-06' }), // Monday of this week
    session({ date: '2026-06-30' }), // last week, excluded
  ];
  const p = computeGoalProgress(goal({ metric: 'workouts', period: 'weekly', target: 4 }), sessions, NOW);
  check('counts workouts this week', p.current === 3, `got ${p.current}`);
}

console.log('computeGoalProgress — monthly minutes');
{
  const sessions = [
    session({ date: '2026-07-09', durationSec: 600 }), // 10 min
    session({ date: '2026-07-02', durationSec: 1200 }), // 20 min
    session({ date: '2026-06-15', durationSec: 3000 }), // excluded
  ];
  const p = computeGoalProgress(goal({ metric: 'durationMin', period: 'monthly', target: 60 }), sessions, NOW);
  check('sums minutes this month', p.current === 30, `got ${p.current}`);
}

console.log('computeGoalProgress — zero target guard');
{
  const p = computeGoalProgress(goal({ metric: 'reps', period: 'daily', target: 0 }), [], NOW);
  check('zero target never divides by zero', p.fraction === 0 && p.completed === false);
}

summary('goalService', counters);
