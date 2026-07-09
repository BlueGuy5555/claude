/**
 * Unit tests for streak calculations.
 *
 * Run with: `npx tsx src/services/__tests__/streakService.test.ts`
 */
import { computeStreaks } from '@/services';

import { makeCheck, NOW, session, summary, type Counters } from './helpers';

const counters: Counters = { passed: 0, failed: 0 };
const check = makeCheck(counters);

console.log('computeStreaks — days');
{
  // Three consecutive days ending today.
  const sessions = [
    session({ date: '2026-07-09' }),
    session({ date: '2026-07-08' }),
    session({ date: '2026-07-07' }),
  ];
  const s = computeStreaks(sessions, NOW);
  check('current day streak counts 3', s.currentStreakDays === 3, `got ${s.currentStreakDays}`);
  check('longest day streak counts 3', s.longestStreakDays === 3);
}

console.log('computeStreaks — grace day (yesterday still counts)');
{
  const sessions = [session({ date: '2026-07-08' }), session({ date: '2026-07-07' })];
  const s = computeStreaks(sessions, NOW);
  check('yesterday keeps the streak alive', s.currentStreakDays === 2, `got ${s.currentStreakDays}`);
}

console.log('computeStreaks — broken streak');
{
  // Last workout 3 days ago -> current streak resets to 0.
  const sessions = [session({ date: '2026-07-06' }), session({ date: '2026-07-05' })];
  const s = computeStreaks(sessions, NOW);
  check('missed days reset current streak', s.currentStreakDays === 0, `got ${s.currentStreakDays}`);
  check('longest streak is retained', s.longestStreakDays === 2);
}

console.log('computeStreaks — multiple workouts same day count once');
{
  const sessions = [
    session({ date: '2026-07-09', hour: 8 }),
    session({ date: '2026-07-09', hour: 18 }),
  ];
  const s = computeStreaks(sessions, NOW);
  check('two workouts today = 1-day streak', s.currentStreakDays === 1, `got ${s.currentStreakDays}`);
}

console.log('computeStreaks — longest not necessarily current');
{
  const sessions = [
    // Old 4-day run.
    session({ date: '2026-06-01' }),
    session({ date: '2026-06-02' }),
    session({ date: '2026-06-03' }),
    session({ date: '2026-06-04' }),
    // Recent 2-day run ending today.
    session({ date: '2026-07-08' }),
    session({ date: '2026-07-09' }),
  ];
  const s = computeStreaks(sessions, NOW);
  check('longest reflects the old 4-day run', s.longestStreakDays === 4, `got ${s.longestStreakDays}`);
  check('current reflects the recent 2-day run', s.currentStreakDays === 2, `got ${s.currentStreakDays}`);
}

console.log('computeStreaks — weeks and months');
{
  const sessions = [
    session({ date: '2026-07-09' }), // this week / month
    session({ date: '2026-07-01' }), // previous ISO week, same month
    session({ date: '2026-06-15' }), // previous month
  ];
  const s = computeStreaks(sessions, NOW);
  check('week streak counts consecutive weeks', s.currentStreakWeeks >= 2, `got ${s.currentStreakWeeks}`);
  check('month streak counts consecutive months', s.currentStreakMonths === 2, `got ${s.currentStreakMonths}`);
}

console.log('computeStreaks — empty');
{
  const s = computeStreaks([], NOW);
  check('empty history yields zero streaks', s.currentStreakDays === 0 && s.longestStreakDays === 0);
}

summary('streakService', counters);
