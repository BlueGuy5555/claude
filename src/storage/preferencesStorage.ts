import { DEFAULT_PREFERENCES, type Preferences } from '@/types';

import { StorageKeys } from './keys';
import { readJSON, writeJSON } from './storage';

export async function loadPreferences(): Promise<Preferences> {
  const stored = await readJSON<Partial<Preferences>>(StorageKeys.preferences);
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  await writeJSON(StorageKeys.preferences, preferences);
}
