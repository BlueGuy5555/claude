/**
 * Persistence for user-configured goals. Goals are the one piece of the
 * analytics domain that is *authored* by the user rather than derived, so they
 * are the only thing here that needs storing.
 */
import { StorageKeys } from '@/storage/keys';
import { readJSON, removeKey, writeJSON } from '@/storage/storage';
import { DEFAULT_GOALS, type Goal } from '@/types';

export interface GoalsRepository {
  all(): Promise<Goal[]>;
  save(goals: Goal[]): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Materialize the default starter goals. Seed ids are *deterministic*
 * (`seed_<metric>_<period>`) rather than random, so reading an unsaved default
 * set repeatedly returns stable ids — the Goals list and dashboard preview
 * don't churn/re-animate every time a screen regains focus.
 */
function seedGoals(now: Date): Goal[] {
  return DEFAULT_GOALS.map((g) => ({
    ...g,
    id: `seed_${g.metric}_${g.period}`,
    createdAt: now.toISOString(),
  }));
}

export class AsyncStorageGoalsRepository implements GoalsRepository {
  async all(): Promise<Goal[]> {
    const stored = await readJSON<Goal[]>(StorageKeys.goals);
    // `null` means "never opened the Goals screen" — hand back sensible seeds
    // (an explicit empty array is respected as "the user deleted them all").
    if (stored == null) return seedGoals(new Date());
    return stored;
  }

  async save(goals: Goal[]): Promise<void> {
    await writeJSON(StorageKeys.goals, goals);
  }

  async clear(): Promise<void> {
    await removeKey(StorageKeys.goals);
  }
}

export const goalsRepository: GoalsRepository = new AsyncStorageGoalsRepository();
