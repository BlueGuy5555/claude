import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { clearHistory, loadHistory } from '@/storage';
import type { WorkoutSession } from '@/types';

interface UseWorkoutHistory {
  history: WorkoutSession[];
  isLoading: boolean;
  /** Re-read history from storage. */
  refresh: () => Promise<void>;
  /** Wipe all stored history and update local state. */
  clear: () => Promise<void>;
}

/**
 * Loads workout history from AsyncStorage and keeps it in sync while the screen
 * is focused (so newly-saved sessions appear when navigating back).
 */
export function useWorkoutHistory(): UseWorkoutHistory {
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const stored = await loadHistory();
    setHistory(stored);
    setIsLoading(false);
  }, []);

  const clear = useCallback(async () => {
    await clearHistory();
    setHistory([]);
  }, []);

  // Reload whenever the screen using this hook gains focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      loadHistory().then((stored) => {
        if (!cancelled) {
          setHistory(stored);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { history, isLoading, refresh, clear };
}
