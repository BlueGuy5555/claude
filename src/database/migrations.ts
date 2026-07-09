/**
 * Forward-only migrations for the persisted workout history.
 *
 * `migrateHistory` accepts whatever was found on disk (which may be `null`, a
 * legacy bare array, or a versioned envelope from an older build) and always
 * returns a valid, current-version {@link HistoryEnvelope}. It is pure and
 * defensive so a corrupt or partial payload degrades to an empty history rather
 * than crashing the app on launch.
 */
import type { WorkoutSession } from '@/types';

import {
  DB_SCHEMA_VERSION,
  emptyEnvelope,
  freshSyncMeta,
  type HistoryEnvelope,
  type WorkoutRecord,
} from './schema';

/** Attach sync metadata + backfill derived analytics for a legacy session. */
function upgradeSession(session: WorkoutSession, now: Date): WorkoutRecord {
  const avgRepSpeedSec =
    session.avgRepSpeedSec ??
    (session.totalReps > 0 && session.durationSec > 0
      ? Math.round((session.durationSec / session.totalReps) * 10) / 10
      : undefined);

  return {
    ...session,
    avgRepSpeedSec,
    updatedAt: session.endedAt ?? session.startedAt ?? now.toISOString(),
    syncState: 'local',
    remoteId: null,
  };
}

/** Type guard: a value that looks like a persisted session array (v1). */
function isLegacyArray(value: unknown): value is WorkoutSession[] {
  return Array.isArray(value);
}

/** Type guard: a value that looks like a versioned envelope. */
function isEnvelope(value: unknown): value is HistoryEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as HistoryEnvelope).workouts)
  );
}

export function migrateHistory(
  raw: unknown,
  now: Date = new Date(),
): HistoryEnvelope {
  if (raw == null) return emptyEnvelope();

  // v1: a bare array of sessions written before the envelope existed.
  if (isLegacyArray(raw)) {
    return {
      schemaVersion: DB_SCHEMA_VERSION,
      workouts: raw
        .filter((s): s is WorkoutSession => typeof s?.id === 'string')
        .map((s) => upgradeSession(s, now)),
    };
  }

  if (isEnvelope(raw)) {
    // Already current: trust it, but re-stamp any records missing sync meta.
    if (raw.schemaVersion >= DB_SCHEMA_VERSION) {
      return {
        schemaVersion: DB_SCHEMA_VERSION,
        workouts: raw.workouts.map((w) =>
          w.syncState ? w : { ...w, ...freshSyncMeta(now) },
        ),
      };
    }
    // Older envelope: re-run the per-session upgrade to fill new fields.
    return {
      schemaVersion: DB_SCHEMA_VERSION,
      workouts: raw.workouts.map((w) => upgradeSession(w, now)),
    };
  }

  // Unrecognized payload — start clean rather than propagate corruption.
  return emptyEnvelope();
}
