/**
 * Unit tests for workout construction (rep-timing derivation) and CSV/JSON
 * export builders.
 *
 * Run with: `npx tsx src/services/__tests__/workoutService.test.ts`
 */
import { buildSession, computeRepTiming, estimateCalories, toCSV, toHistoryItem, toJSON } from '@/services';

import { makeCheck, session, summary, type Counters } from './helpers';

const counters: Counters = { passed: 0, failed: 0 };
const check = makeCheck(counters);

console.log('computeRepTiming');
{
  // Reps at 0s, 2s, 5s, 6s -> intervals 2s, 3s, 1s.
  const t = computeRepTiming([0, 2000, 5000, 6000], 6, 4);
  check('avgRepSpeedSec = duration / reps', t.avgRepSpeedSec === 1.5, `got ${t.avgRepSpeedSec}`);
  check('fastestRepSec is the 1s interval', t.fastestRepSec === 1, `got ${t.fastestRepSec}`);
  check('slowestRepSec is the 3s interval', t.slowestRepSec === 3, `got ${t.slowestRepSec}`);
  check('bestRepStreak counts closely-spaced reps', (t.bestRepStreak ?? 0) >= 3, `got ${t.bestRepStreak}`);
}

console.log('computeRepTiming — no offsets');
{
  const t = computeRepTiming([], 100, 10);
  check('avg still derives from duration/reps', t.avgRepSpeedSec === 10);
  check('no fastest/slowest without offsets', t.fastestRepSec === undefined && t.slowestRepSec === undefined);
  check('bestRepStreak falls back to total reps', t.bestRepStreak === 10);
}

console.log('estimateCalories');
{
  check('pushup calories scale with reps', estimateCalories('pushup', 100) === 32);
  check('pullup burns more than pushup', estimateCalories('pullup', 10) > estimateCalories('pushup', 10));
}

console.log('buildSession');
{
  const startedAt = new Date('2026-07-09T12:00:00');
  const endedAt = new Date('2026-07-09T12:02:00');
  const s = buildSession({
    exerciseId: 'squat',
    reps: 24,
    startedAt,
    endedAt,
    repOffsetsMs: [0, 5000, 10000],
    avgConfidence: 0.8,
  });
  check('duration derived from timestamps', s.durationSec === 120, `got ${s.durationSec}`);
  check('totalReps recorded', s.totalReps === 24);
  check('calories estimated', typeof s.calories === 'number');
  check('avg rep speed present', s.avgRepSpeedSec === 5, `got ${s.avgRepSpeedSec}`);
  check('avg confidence carried through', s.avgConfidence === 0.8);
  check('rep offsets stored', Array.isArray(s.repOffsetsMs) && s.repOffsetsMs!.length === 3);
  check('id is prefixed', s.id.startsWith('workout_'));
}

console.log('toJSON');
{
  const sessions = [session({ date: '2026-07-09', reps: 20 })];
  const json = JSON.parse(toJSON(sessions, new Date('2026-07-09T12:00:00')));
  check('includes app + version', json.app === 'RepCount' && typeof json.version === 'number');
  check('includes exportedAt', typeof json.exportedAt === 'string');
  check('round-trips workouts', json.workouts.length === 1 && json.workouts[0].totalReps === 20);
}

console.log('toCSV');
{
  const sessions = [
    session({ date: '2026-07-09', exercise: 'pushup', reps: 20, durationSec: 100 }),
  ];
  const csv = toCSV(sessions);
  const lines = csv.split('\n');
  check('has a header row', lines[0]!.startsWith('id,date,startTime'));
  check('has one data row per session', lines.length === 2, `got ${lines.length}`);
  check('data row contains the exercise name', lines[1]!.includes('Push-up'));
  check('data row contains the rep count', lines[1]!.includes('20'));
}

console.log('toCSV — escaping');
{
  const s = session({ date: '2026-07-09', reps: 5 });
  s.notes = 'felt great, pushed "hard"';
  const csv = toCSV([s]);
  check('quotes fields with commas/quotes', csv.includes('"felt great, pushed ""hard"""'));
}

console.log('toHistoryItem');
{
  const s = session({ date: '2026-07-09', exercise: 'pushup', reps: 20, durationSec: 100, hour: 9 });
  const item = toHistoryItem(s);
  check('title uses the exercise name', item.title === 'Push-up');
  check('exposes a time-of-day label', typeof item.timeLabel === 'string' && item.timeLabel.length > 0);
  check('carries reps through', item.totalReps === 20);
  check('formats a calories label', item.caloriesLabel !== null);
}

summary('workoutService', counters);
