import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { workoutRepository } from '@/database';
import type { WorkoutRecord, WorkoutPatch } from '@/database';
import { saveCachedStatistics } from '@/storage';
import { computeStatistics } from '@/services';
import type { WorkoutSession } from '@/types';

interface WorkoutDataContextValue {
  /** All workout records, newest first. */
  records: WorkoutRecord[];
  /** `false` until history has been read from disk once. */
  isReady: boolean;
  /** Re-read history from the repository. */
  refresh: () => Promise<void>;
  /** Persist a completed session and update in-memory state. */
  addSession: (session: WorkoutSession) => Promise<void>;
  /** Patch a stored session (e.g. notes) and update in-memory state. */
  updateSession: (id: string, patch: WorkoutPatch) => Promise<void>;
  /** Wipe all history. */
  clear: () => Promise<void>;
}

const WorkoutDataContext = createContext<WorkoutDataContextValue | undefined>(undefined);

/**
 * Loads workout history from the repository exactly once and holds it in memory
 * as the single source of truth. Every mutation goes through here and updates
 * the in-memory list, so screens never have to re-read from disk on focus and
 * the (potentially expensive) analytics derivations downstream only recompute
 * when the `records` array reference actually changes.
 */
export function WorkoutDataProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [isReady, setIsReady] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const all = await workoutRepository.all();
    if (mounted.current) {
      setRecords(all);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addSession = useCallback(async (session: WorkoutSession) => {
    const next = await workoutRepository.add(session);
    if (mounted.current) setRecords(next);
  }, []);

  const updateSession = useCallback(async (id: string, patch: WorkoutPatch) => {
    await workoutRepository.update(id, patch);
    const next = await workoutRepository.all();
    if (mounted.current) setRecords(next);
  }, []);

  const clear = useCallback(async () => {
    await workoutRepository.clear();
    if (mounted.current) setRecords([]);
  }, []);

  // Keep the cached statistics snapshot fresh so any future cold-start surface
  // can render instantly. Fire-and-forget; failures are swallowed by storage.
  useEffect(() => {
    if (!isReady) return;
    void saveCachedStatistics(computeStatistics(records));
  }, [records, isReady]);

  const value = useMemo<WorkoutDataContextValue>(
    () => ({ records, isReady, refresh, addSession, updateSession, clear }),
    [records, isReady, refresh, addSession, updateSession, clear],
  );

  return (
    <WorkoutDataContext.Provider value={value}>{children}</WorkoutDataContext.Provider>
  );
}

export function useWorkoutData(): WorkoutDataContextValue {
  const ctx = useContext(WorkoutDataContext);
  if (!ctx) {
    throw new Error('useWorkoutData must be used within a WorkoutDataProvider');
  }
  return ctx;
}
