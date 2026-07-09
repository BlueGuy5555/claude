import type { WorkoutSession } from '@/types';

import { StorageKeys } from './keys';
import { readJSON, removeKey, writeJSON } from './storage';

/**
 * Persistence for the *in-progress* session only.
 *
 * Completed workout history now lives behind the repository in `src/database`
 * (versioned, migratable, sync-ready). The active session is deliberately kept
 * here as a simple, unversioned scratch value: it is short-lived state used to
 * resume a workout after an app restart, not durable history.
 */

/** The in-progress session, if one was left unfinished. */
export async function loadActiveSession(): Promise<WorkoutSession | null> {
  return readJSON<WorkoutSession>(StorageKeys.activeSession);
}

export async function saveActiveSession(session: WorkoutSession): Promise<void> {
  await writeJSON(StorageKeys.activeSession, session);
}

export async function clearActiveSession(): Promise<void> {
  await removeKey(StorageKeys.activeSession);
}
