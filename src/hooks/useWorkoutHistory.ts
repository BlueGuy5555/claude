import { useWorkoutData } from '@/context';
import type { WorkoutRecord } from '@/database';

interface UseWorkoutHistory {
  history: WorkoutRecord[];
  isLoading: boolean;
  /** Re-read history from storage. */
  refresh: () => Promise<void>;
  /** Wipe all stored history. */
  clear: () => Promise<void>;
}

/**
 * Thin adapter over the shared workout-data context. History is loaded once by
 * the provider and kept in memory, so this hook no longer reads from disk on
 * focus — newly-saved sessions are already reflected because writes flow
 * through the same context.
 */
export function useWorkoutHistory(): UseWorkoutHistory {
  const { records, isReady, refresh, clear } = useWorkoutData();
  return { history: records, isLoading: !isReady, refresh, clear };
}
