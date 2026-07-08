import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { clearActiveSession, loadActiveSession } from '@/storage';
import type { WorkoutSession } from '@/types';

interface UseActiveSession {
  /** The unfinished session that can be resumed, or null. */
  activeSession: WorkoutSession | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Drop the in-progress session without saving it. */
  discard: () => Promise<void>;
}

/**
 * Exposes the single in-progress session (if any) so surfaces like Home can
 * offer to resume it. Re-reads whenever the calling screen regains focus.
 */
export function useActiveSession(): UseActiveSession {
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const stored = await loadActiveSession();
    setActiveSession(stored);
    setIsLoading(false);
  }, []);

  const discard = useCallback(async () => {
    await clearActiveSession();
    setActiveSession(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      loadActiveSession().then((stored) => {
        if (!cancelled) {
          setActiveSession(stored);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { activeSession, isLoading, refresh, discard };
}
