/**
 * Unit tests for the rule-based insights generator.
 *
 * Run with: `npx tsx src/services/__tests__/insightsService.test.ts`
 */
import { generateInsights } from '@/services';
import type { Insight, InsightId } from '@/types';

import { makeCheck, NOW, session, summary, type Counters } from './helpers';

const counters: Counters = { passed: 0, failed: 0 };
const check = makeCheck(counters);

function has(insights: Insight[], id: InsightId): boolean {
  return insights.some((i) => i.id === id);
}

console.log('generateInsights — empty history');
{
  check('no insights without history', generateInsights([], NOW).length === 0);
}

console.log('generateInsights — first workout');
{
  const insights = generateInsights([session({ date: '2026-07-09', reps: 20 })], NOW);
  check('celebrates the first workout', has(insights, 'first_workout'));
}

console.log('generateInsights — inactivity');
{
  const sessions = [
    session({ date: '2026-07-04', reps: 20 }),
    session({ date: '2026-07-03', reps: 20 }),
  ];
  const insights = generateInsights(sessions, NOW);
  check('warns about inactivity after a gap', has(insights, 'inactivity'));
}

console.log('generateInsights — streak');
{
  const sessions = [
    session({ date: '2026-07-09' }),
    session({ date: '2026-07-08' }),
    session({ date: '2026-07-07' }),
    session({ date: '2026-07-06' }),
  ];
  const insights = generateInsights(sessions, NOW);
  check('celebrates an active streak', has(insights, 'streak'));
}

console.log('generateInsights — weekly trend up');
{
  // Last week: 2 sessions × 20 reps = 40. This week: 3 × 40 = 120 (> +10%).
  const sessions = [
    session({ date: '2026-07-01', reps: 20 }), // last ISO week (Wed)
    session({ date: '2026-06-30', reps: 20 }), // last ISO week (Tue)
    session({ date: '2026-07-06', reps: 40 }),
    session({ date: '2026-07-08', reps: 40 }),
    session({ date: '2026-07-09', reps: 40 }),
  ];
  const insights = generateInsights(sessions, NOW);
  check('detects a weekly reps trend', has(insights, 'weekly_reps_trend'));
}

console.log('generateInsights — new record');
{
  const sessions = [
    session({ date: '2026-07-09', reps: 80 }), // latest, all-time best
    session({ date: '2026-07-07', reps: 40 }),
    session({ date: '2026-07-05', reps: 30 }),
  ];
  const insights = generateInsights(sessions, NOW);
  check('announces a new personal record', has(insights, 'new_record'));
}

console.log('generateInsights — respects the limit');
{
  // 10 consecutive days ending on NOW, generated safely from a base date.
  const base = new Date('2026-07-09T12:00:00');
  const sessions = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    return session({ date: d.toISOString().slice(0, 10), reps: 20 + i });
  });
  const insights = generateInsights(sessions, NOW, 3);
  check('returns at most the requested number', insights.length <= 3, `got ${insights.length}`);
}

summary('insightsService', counters);
