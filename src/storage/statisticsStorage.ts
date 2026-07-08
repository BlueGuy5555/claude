import type { Statistics } from '@/types';

import { StorageKeys } from './keys';
import { readJSON, writeJSON } from './storage';

/** Load the cached statistics snapshot, or null if none has been computed. */
export async function loadCachedStatistics(): Promise<Statistics | null> {
  return readJSON<Statistics>(StorageKeys.statistics);
}

export async function saveCachedStatistics(stats: Statistics): Promise<void> {
  await writeJSON(StorageKeys.statistics, stats);
}
