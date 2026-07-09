import { useMemo } from 'react';

import { useWorkoutData } from '@/context';
import { computePersonalRecords } from '@/services';
import type { PersonalRecord } from '@/types';

/** Memoized personal records derived from the shared workout history. */
export function usePersonalRecords(): {
  records: PersonalRecord[];
  isLoading: boolean;
} {
  const { records: history, isReady } = useWorkoutData();
  const records = useMemo(() => computePersonalRecords(history), [history]);
  return { records, isLoading: !isReady };
}
