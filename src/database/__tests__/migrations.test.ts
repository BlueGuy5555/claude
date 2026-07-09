/**
 * Unit tests for the workout-history migration logic.
 *
 * Run with: `npx tsx src/database/__tests__/migrations.test.ts`
 */
import { DB_SCHEMA_VERSION, migrateHistory } from '@/database';
import type { WorkoutSession } from '@/types';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

const NOW = new Date('2026-07-09T12:00:00');

function legacySession(id: string, reps: number, durationSec: number): WorkoutSession {
  return {
    id,
    startedAt: '2026-07-01T12:00:00.000Z',
    endedAt: '2026-07-01T12:02:00.000Z',
    durationSec,
    sets: [{ exerciseId: 'pushup', reps }],
    totalReps: reps,
    calories: 6.4,
  };
}

console.log('migrateHistory — null / garbage');
{
  const empty = migrateHistory(null, NOW);
  check('null becomes an empty current envelope', empty.workouts.length === 0);
  check('null envelope has current schema version', empty.schemaVersion === DB_SCHEMA_VERSION);

  const garbage = migrateHistory(42, NOW);
  check('unrecognized payload degrades to empty', garbage.workouts.length === 0);
}

console.log('migrateHistory — legacy v1 array');
{
  const legacy = [legacySession('a', 40, 120), legacySession('b', 10, 60)];
  const migrated = migrateHistory(legacy, NOW);
  check('array is wrapped in an envelope', migrated.schemaVersion === DB_SCHEMA_VERSION);
  check('all sessions are carried over', migrated.workouts.length === 2);
  check(
    'sync metadata is attached',
    migrated.workouts.every((w) => w.syncState === 'local' && w.remoteId === null && !!w.updatedAt),
  );
  check(
    'avg rep speed backfilled from duration/reps',
    migrated.workouts[0]!.avgRepSpeedSec === 3,
    `got ${migrated.workouts[0]!.avgRepSpeedSec}`,
  );
}

console.log('migrateHistory — legacy array filters invalid entries');
{
  const legacy = [legacySession('a', 40, 120), { nope: true } as unknown as WorkoutSession];
  const migrated = migrateHistory(legacy, NOW);
  check('entries without an id are dropped', migrated.workouts.length === 1);
}

console.log('migrateHistory — current envelope passthrough');
{
  const envelope = {
    schemaVersion: DB_SCHEMA_VERSION,
    workouts: [
      { ...legacySession('a', 40, 120), updatedAt: '2026-07-01T12:02:00.000Z', syncState: 'synced' as const, remoteId: 'r1' },
    ],
  };
  const migrated = migrateHistory(envelope, NOW);
  check('current envelope is preserved', migrated.workouts.length === 1);
  check('existing sync state is retained', migrated.workouts[0]!.syncState === 'synced');
  check('existing remoteId is retained', migrated.workouts[0]!.remoteId === 'r1');
}

console.log('migrateHistory — envelope missing sync meta is restamped');
{
  const envelope = {
    schemaVersion: DB_SCHEMA_VERSION,
    workouts: [legacySession('a', 40, 120) as never],
  };
  const migrated = migrateHistory(envelope, NOW);
  check('records missing sync meta get restamped', migrated.workouts[0]!.syncState === 'local');
}

console.log(`\nmigrations: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
