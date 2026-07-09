/**
 * Persistence for user-configured goals. Goals are the one piece of the
 * analytics domain that is *authored* by the user rather than derived, so they
 * are the only thing here that needs storing.
 */
import { StorageKeys } from '@/storage/keys';
import { readJSON, removeKey, writeJSON } from '@/storage/storage';
import { createId } from '@/utils';
import { DEFAULT_GOALS, type Goal } from '@/types';

export interface GoalsRepository {
  all(): Promise<Goal[]>;
  save(goals: Goal[]): Promise<void>;
  clear(): Promise<void>;
}

/** Materialize the default starter goals with ids + timestamps. */
function seedGoals(now: Date): Goal[] {
  return DEFAULT_GOALS.map((g) => ({
    ...g,
    id: createId('goal'),
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
