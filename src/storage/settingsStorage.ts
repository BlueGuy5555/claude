import { DEFAULT_SETTINGS, type Settings } from '@/types';

import { StorageKeys } from './keys';
import { readJSON, writeJSON } from './storage';

/** Shape of settings as they may exist on disk from an earlier app version. */
type StoredSettings = Partial<Settings> & { darkMode?: boolean };

/**
 * Load settings, merging any stored values over the defaults. Merging (rather
 * than replacing) means new settings added in future releases get a sane value
 * for users who already have data on disk.
 *
 * A small migration maps the legacy boolean `darkMode` onto the newer
 * `theme` preference so early adopters keep their choice.
 */
export async function loadSettings(): Promise<Settings> {
  const stored = await readJSON<StoredSettings>(StorageKeys.settings);
  const merged: Settings = { ...DEFAULT_SETTINGS, ...stored };

  if (stored && stored.theme === undefined && typeof stored.darkMode === 'boolean') {
    merged.theme = stored.darkMode ? 'dark' : 'light';
  }

  return merged;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJSON(StorageKeys.settings, settings);
}
