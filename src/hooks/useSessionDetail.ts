import { useMemo } from 'react';

import { useWorkoutData } from '@/context';
import { buildSessionDetail, type SessionDetailViewModel } from '@/services';
import type { WorkoutRecord } from '@/database';

interface UseSessionDetail {
  session: WorkoutRecord | null;
  detail: SessionDetailViewModel | null;
  isLoading: boolean;
}

/** Look up a single session by id and build its detail view-model (memoized). */
export function useSessionDetail(id: string): UseSessionDetail {
  const { records, isReady } = useWorkoutData();

  const session = useMemo(
    () => records.find((r) => r.id === id) ?? null,
    [records, id],
  );
  const detail = useMemo(
    () => (session ? buildSessionDetail(session) : null),
    [session],
  );

  return { session, detail, isLoading: !isReady };
}
