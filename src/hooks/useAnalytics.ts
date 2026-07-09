import { useMemo } from 'react';

import { useWorkoutData } from '@/context';
import { buildChartData, summarizeRange } from '@/services';
import type { ChartData, DateRangePreset, RangeSummary } from '@/types';

interface UseAnalytics {
  summary: RangeSummary;
  charts: ChartData;
  isLoading: boolean;
}

/**
 * Range-filtered analytics for the Statistics screen. Both the headline summary
 * and every chart series are memoized on `[records, preset]`, so switching the
 * filter recomputes instantly and scrolling/re-rendering costs nothing.
 */
export function useAnalytics(preset: DateRangePreset): UseAnalytics {
  const { records, isReady } = useWorkoutData();

  const summary = useMemo(
    () => summarizeRange(records, preset),
    [records, preset],
  );
  const charts = useMemo(
    () => buildChartData(records, preset),
    [records, preset],
  );

  return { summary, charts, isLoading: !isReady };
}
