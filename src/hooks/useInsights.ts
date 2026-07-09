import { useMemo } from 'react';

import { useWorkoutData } from '@/context';
import { generateInsights } from '@/services';
import type { Insight } from '@/types';

/** Memoized, rule-based insights derived from the shared workout history. */
export function useInsights(limit = 4): { insights: Insight[]; isLoading: boolean } {
  const { records, isReady } = useWorkoutData();
  const insights = useMemo(
    () => generateInsights(records, new Date(), limit),
    [records, limit],
  );
  return { insights, isLoading: !isReady };
}
