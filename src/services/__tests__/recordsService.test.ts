/**
 * Unit tests for personal-record detection.
 *
 * Run with: `npx tsx src/services/__tests__/recordsService.test.ts`
 */
import { computePersonalRecords } from '@/services';
import type { PersonalRecord, PersonalRecordId } from '@/types';

import { makeCheck, session, summary, type Counters } from './helpers';

const counters: Counters = { passed: 0, failed: 0 };
const check = makeCheck(counters);

function find(records: PersonalRecord[], id: PersonalRecordId): PersonalRecord | undefined {
  return records.find((r) => r.id === id);
}

console.log('computePersonalRecords — empty history');
{
  check('no records without history', computePersonalRecords([]).length === 0);
}

console.log('computePersonalRecords — most reps in a session');
{
  const sessions = [
    session({ date: '2026-07-01', exercise: 'pushup', reps: 30 }),
    session({ date: '2026-07-02', exercise: 'pushup', reps: 55 }),
    session({ date: '2026-07-03', exercise: 'squat', reps: 40 }),
  ];
  const records = computePersonalRecords(sessions);
  const pushups = find(records, 'most_pushups_session');
  const squats = find(records, 'most_squats_session');
  check('detects most push-ups', pushups?.value === 55, `got ${pushups?.value}`);
  check('push-up record links its session', pushups?.sessionId === sessions[1]!.id);
  check('detects most squats', squats?.value === 40, `got ${squats?.value}`);
}

console.log('computePersonalRecords — longest & fastest workout');
{
  const sessions = [
    session({ date: '2026-07-01', reps: 20, durationSec: 300 }),
    session({ date: '2026-07-02', reps: 20, durationSec: 90 }),
  ];
  const records = computePersonalRecords(sessions);
  const longest = find(records, 'longest_workout');
  const fastest = find(records, 'fastest_workout');
  check('longest workout picks the 300s session', longest?.value === 300, `got ${longest?.value}`);
  check('fastest workout picks the 90s session', fastest?.value === 90, `got ${fastest?.value}`);
}

console.log('computePersonalRecords — highest pace (reps per minute)');
{
  const sessions = [
    session({ date: '2026-07-01', reps: 60, durationSec: 120 }), // 30 rpm
    session({ date: '2026-07-02', reps: 60, durationSec: 60 }), // 60 rpm — best
  ];
  const records = computePersonalRecords(sessions);
  const pace = find(records, 'highest_avg_pace');
  check('highest pace is 60 reps/min', pace?.value === 60, `got ${pace?.value}`);
  check('pace record links the faster session', pace?.sessionId === sessions[1]!.id);
}

console.log('computePersonalRecords — most reps in a day (aggregates)');
{
  const sessions = [
    session({ date: '2026-07-01', reps: 40, hour: 8 }),
    session({ date: '2026-07-01', reps: 35, hour: 18 }),
    session({ date: '2026-07-02', reps: 50 }),
  ];
  const records = computePersonalRecords(sessions);
  const day = find(records, 'most_reps_day');
  check('most reps in a day sums same-day sessions', day?.value === 75, `got ${day?.value}`);
}

console.log('computePersonalRecords — most workouts per week/month');
{
  const sessions = [
    session({ date: '2026-07-06' }),
    session({ date: '2026-07-07' }),
    session({ date: '2026-07-08' }),
  ];
  const records = computePersonalRecords(sessions);
  const week = find(records, 'most_workouts_week');
  const month = find(records, 'most_workouts_month');
  check('most workouts / week = 3', week?.value === 3, `got ${week?.value}`);
  check('most workouts / month = 3', month?.value === 3, `got ${month?.value}`);
}

console.log('computePersonalRecords — pace records need >= 10 reps');
{
  const sessions = [session({ date: '2026-07-01', reps: 5, durationSec: 10 })];
  const records = computePersonalRecords(sessions);
  check('tiny sessions do not set fastest', find(records, 'fastest_workout') === undefined);
  check('tiny sessions do not set pace', find(records, 'highest_avg_pace') === undefined);
}

summary('recordsService', counters);
