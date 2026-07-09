import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useWorkoutData } from '@/context';
import { goalsRepository } from '@/database';
import { computeAllGoalProgress } from '@/services';
import { createId } from '@/utils';
import type { Goal, GoalMetric, GoalPeriod, GoalProgress } from '@/types';

interface UseGoals {
  goals: Goal[];
  progress: GoalProgress[];
  isLoading: boolean;
  addGoal: (input: { metric: GoalMetric; period: GoalPeriod; target: number }) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Pick<Goal, 'target'>>) => Promise<void>;
}

/**
 * Loads user goals from their repository and computes live progress against the
 * shared workout history. Goals are the only *authored* part of the analytics
 * domain, so they get their own persisted state here; progress itself is always
 * derived (memoized on `[goals, records]`) and never stored.
 *
 * Goals are re-read whenever the consuming screen regains focus, so edits made
 * on the Goals screen are reflected on the Home dashboard without a restart.
 */
export function useGoals(): UseGoals {
  const { records } = useWorkoutData();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      goalsRepository.all().then((stored) => {
        if (mounted.current) {
          setGoals(stored);
          setIsLoading(false);
        }
      });
      return () => {
        mounted.current = false;
      };
    }, []),
  );

  const persist = useCallback(async (next: Goal[]) => {
    setGoals(next);
    await goalsRepository.save(next);
  }, []);

  const addGoal = useCallback<UseGoals['addGoal']>(
    async ({ metric, period, target }) => {
      const goal: Goal = {
        id: createId('goal'),
        metric,
        period,
        target,
        createdAt: new Date().toISOString(),
      };
      await persist([...goals, goal]);
    },
    [goals, persist],
  );

  const removeGoal = useCallback<UseGoals['removeGoal']>(
    async (id) => {
      await persist(goals.filter((g) => g.id !== id));
    },
    [goals, persist],
  );

  const updateGoal = useCallback<UseGoals['updateGoal']>(
    async (id, patch) => {
      await persist(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    },
    [goals, persist],
  );

  const progress = useMemo(
    () => computeAllGoalProgress(goals, records),
    [goals, records],
  );

  return { goals, progress, isLoading, addGoal, removeGoal, updateGoal };
}
