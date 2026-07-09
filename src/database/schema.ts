/**
 * Persistence schema for the local workout database.
 *
 * The app currently persists to AsyncStorage (see `src/storage`), but every
 * read/write of workout data goes through the repository in this folder rather
 * than touching storage directly. That indirection buys two things:
 *
 *   1. **A migration seam.** History is wrapped in a versioned {@link HistoryEnvelope}
 *      so the shape can evolve; `migrations.ts` upgrades older payloads on read.
 *   2. **A cloud-sync seam.** Every record carries {@link SyncMeta}. Nothing syncs
 *      today, but `updatedAt` + `syncState` + `remoteId` are exactly what a future
 *      sync engine (or a swap to SQLite/WatermelonDB) needs, with no schema churn.
 */
import type { WorkoutSession } from '@/types';

/** Bump when the persisted workout shape changes; drives `migrations.ts`. */
export const DB_SCHEMA_VERSION = 2;

/** Where a record stands relative to a (future) remote backend. */
export type SyncState = 'local' | 'pending' | 'synced';

/** Sync bookkeeping attached to every stored record. */
export interface SyncMeta {
  /** ISO-8601 timestamp of the last local mutation. */
  updatedAt: string;
  /** Local-only until a sync engine reconciles it. */
  syncState: SyncState;
  /** Identifier assigned by the backend once synced; null until then. */
  remoteId: string | null;
}

/**
 * A workout as stored on disk: the domain session plus sync metadata. It is a
 * structural superset of {@link WorkoutSession}, so every service and screen
 * that expects a `WorkoutSession` accepts a `WorkoutRecord` unchanged.
 */
export type WorkoutRecord = WorkoutSession & SyncMeta;

/** The versioned container the workout history is persisted inside. */
export interface HistoryEnvelope {
  schemaVersion: number;
  workouts: WorkoutRecord[];
}

/** Fresh sync metadata for a brand-new local record. */
export function freshSyncMeta(now: Date = new Date()): SyncMeta {
  return { updatedAt: now.toISOString(), syncState: 'local', remoteId: null };
}

/** An empty, current-version envelope. */
export function emptyEnvelope(): HistoryEnvelope {
  return { schemaVersion: DB_SCHEMA_VERSION, workouts: [] };
}
