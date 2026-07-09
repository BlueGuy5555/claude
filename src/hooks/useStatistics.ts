import { useMemo } from 'react';

import { useWorkoutData } from '@/context';
import { computeStatistics } from '@/services';
import { type Statistics } from '@/types';

interface UseStatistics {
  statistics: Statistics;
  isLoading: boolean;
}

/**
 * Derives the comprehensive {@link Statistics} snapshot from the shared,
 * in-memory workout history. The computation is memoized on the `records`
 * reference, so it only re-runs when history actually changes — not on every
 * render — which keeps the Statistics screen smooth even with a large history.
 */
export function useStatistics(): UseStatistics {
  const { records, isReady } = useWorkoutData();
  const statistics = useMemo(() => computeStatistics(records), [records]);
  return { statistics, isLoading: !isReady };
}
