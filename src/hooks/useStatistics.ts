import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { computeStatistics } from '@/services';
import { loadHistory, saveCachedStatistics } from '@/storage';
import { EMPTY_STATISTICS, type Statistics } from '@/types';

interface UseStatistics {
  statistics: Statistics;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Reads local workout history and derives aggregate statistics via the pure
 * `statisticsService`. The freshly computed snapshot is also written back to
 * the statistics cache so other surfaces can read it without recomputing.
 */
export function useStatistics(): UseStatistics {
  const [statistics, setStatistics] = useState<Statistics>(EMPTY_STATISTICS);
  const [isLoading, setIsLoading] = useState(true);

  const compute = useCallback(async () => {
    const history = await loadHistory();
    const stats = computeStatistics(history);
    await saveCachedStatistics(stats);
    return stats;
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const stats = await compute();
    setStatistics(stats);
    setIsLoading(false);
  }, [compute]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      compute().then((stats) => {
        if (!cancelled) {
          setStatistics(stats);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [compute]),
  );

  return { statistics, isLoading, refresh };
}
