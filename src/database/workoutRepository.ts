/**
 * The single gateway for reading and writing workout history.
 *
 * Screens, hooks and services depend on the {@link WorkoutRepository} interface,
 * never on AsyncStorage. The default implementation persists a versioned
 * {@link HistoryEnvelope} via the app's JSON storage wrapper, but the interface
 * is deliberately backend-agnostic: a SQLite or cloud-backed implementation can
 * be dropped in without touching a single caller.
 */
import { StorageKeys } from '@/storage/keys';
import { readJSON, removeKey, writeJSON } from '@/storage/storage';
import type { WorkoutSession } from '@/types';

import { migrateHistory } from './migrations';
import {
  DB_SCHEMA_VERSION,
  freshSyncMeta,
  type HistoryEnvelope,
  type WorkoutRecord,
} from './schema';

/** Fields on a stored workout a caller is allowed to edit after the fact. */
export type WorkoutPatch = Partial<Pick<WorkoutSession, 'notes'>>;

export interface WorkoutRepository {
  /** All records, newest first. */
  all(): Promise<WorkoutRecord[]>;
  getById(id: string): Promise<WorkoutRecord | null>;
  /** Persist a freshly completed session; returns the new list (newest first). */
  add(session: WorkoutSession): Promise<WorkoutRecord[]>;
  /** Patch an existing record (e.g. add notes); returns the updated record. */
  update(id: string, patch: WorkoutPatch): Promise<WorkoutRecord | null>;
  /** Replace the entire history (used by import / bulk operations). */
  replaceAll(sessions: WorkoutSession[]): Promise<WorkoutRecord[]>;
  clear(): Promise<void>;
}

const byNewestFirst = (a: WorkoutRecord, b: WorkoutRecord): number =>
  new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();

/** AsyncStorage-backed repository (the current production backend). */
export class AsyncStorageWorkoutRepository implements WorkoutRepository {
  private async loadEnvelope(): Promise<HistoryEnvelope> {
    const raw = await readJSON<unknown>(StorageKeys.workoutHistory);
    return migrateHistory(raw);
  }

  private async saveEnvelope(envelope: HistoryEnvelope): Promise<void> {
    await writeJSON(StorageKeys.workoutHistory, {
      schemaVersion: DB_SCHEMA_VERSION,
      workouts: envelope.workouts,
    });
  }

  async all(): Promise<WorkoutRecord[]> {
    const { workouts } = await this.loadEnvelope();
    return [...workouts].sort(byNewestFirst);
  }

  async getById(id: string): Promise<WorkoutRecord | null> {
    const { workouts } = await this.loadEnvelope();
    return workouts.find((w) => w.id === id) ?? null;
  }

  async add(session: WorkoutSession): Promise<WorkoutRecord[]> {
    const envelope = await this.loadEnvelope();
    const record: WorkoutRecord = { ...session, ...freshSyncMeta() };
    const workouts = [record, ...envelope.workouts].sort(byNewestFirst);
    await this.saveEnvelope({ schemaVersion: DB_SCHEMA_VERSION, workouts });
    return workouts;
  }

  async update(id: string, patch: WorkoutPatch): Promise<WorkoutRecord | null> {
    const envelope = await this.loadEnvelope();
    let updated: WorkoutRecord | null = null;
    const workouts = envelope.workouts.map((w) => {
      if (w.id !== id) return w;
      updated = {
        ...w,
        ...patch,
        updatedAt: new Date().toISOString(),
        // A previously-synced record becomes 'pending' so a future sync engine
        // knows it needs re-uploading.
        syncState: w.syncState === 'synced' ? 'pending' : w.syncState,
      };
      return updated;
    });
    if (updated) await this.saveEnvelope({ schemaVersion: DB_SCHEMA_VERSION, workouts });
    return updated;
  }

  async replaceAll(sessions: WorkoutSession[]): Promise<WorkoutRecord[]> {
    const now = new Date();
    const workouts = sessions
      .map((s): WorkoutRecord => ({ ...s, ...freshSyncMeta(now) }))
      .sort(byNewestFirst);
    await this.saveEnvelope({ schemaVersion: DB_SCHEMA_VERSION, workouts });
    return workouts;
  }

  async clear(): Promise<void> {
    await removeKey(StorageKeys.workoutHistory);
  }
}

/** Shared singleton used across the app. */
export const workoutRepository: WorkoutRepository = new AsyncStorageWorkoutRepository();
