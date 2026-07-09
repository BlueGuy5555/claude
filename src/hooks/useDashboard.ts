import { useMemo } from 'react';

import { useWorkoutData } from '@/context';
import { computeStatistics } from '@/services';
import type { WorkoutRecord } from '@/database';
import type { Statistics } from '@/types';

interface UseDashboard {
  statistics: Statistics;
  /** The most recent workout, for the "recent workout" preview card. */
  recent: WorkoutRecord | null;
  hasData: boolean;
  isLoading: boolean;
}

/**
 * Everything the Home dashboard needs in one memoized pass: the comprehensive
 * statistics snapshot plus the most recent workout. Derived from the shared
 * in-memory history so it updates automatically after every completed session.
 */
export function useDashboard(): UseDashboard {
  const { records, isReady } = useWorkoutData();

  const statistics = useMemo(() => computeStatistics(records), [records]);
  const recent = records[0] ?? null;

  return {
    statistics,
    recent,
    hasData: records.length > 0,
    isLoading: !isReady,
  };
}
