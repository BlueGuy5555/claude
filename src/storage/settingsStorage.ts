import { DEFAULT_SETTINGS, type Settings } from '@/types';

import { StorageKeys } from './keys';
import { readJSON, writeJSON } from './storage';

/**
 * Load settings, merging any stored values over the defaults. Merging (rather
 * than replacing) means new settings added in future releases get a sane value
 * for users who already have data on disk.
 */
export async function loadSettings(): Promise<Settings> {
  const stored = await readJSON<Partial<Settings>>(StorageKeys.settings);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJSON(StorageKeys.settings, settings);
}
