import type { WorkoutSession } from '@/types';

import { StorageKeys } from './keys';
import { readJSON, removeKey, writeJSON } from './storage';

/**
 * Persistence for workout data. This module knows nothing about how sessions
 * are produced (that is business logic) — it only stores and retrieves them.
 */

/** Completed sessions, always returned newest-first. */
export async function loadHistory(): Promise<WorkoutSession[]> {
  const history = await readJSON<WorkoutSession[]>(StorageKeys.workoutHistory);
  return history ?? [];
}

/** Prepend a completed session to history and persist. Returns the new list. */
export async function addSessionToHistory(
  session: WorkoutSession,
): Promise<WorkoutSession[]> {
  const history = await loadHistory();
  const next = [session, ...history];
  await writeJSON(StorageKeys.workoutHistory, next);
  return next;
}

/** Remove a single session by id and persist. Returns the new list. */
export async function deleteSession(id: string): Promise<WorkoutSession[]> {
  const history = await loadHistory();
  const next = history.filter((session) => session.id !== id);
  await writeJSON(StorageKeys.workoutHistory, next);
  return next;
}

export async function clearHistory(): Promise<void> {
  await removeKey(StorageKeys.workoutHistory);
}

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
