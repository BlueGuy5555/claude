import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys, type StorageKey } from './keys';

/**
 * Thin, typed wrapper around AsyncStorage.
 *
 * This is the ONLY module in the app that talks to AsyncStorage directly.
 * Everything is JSON-serialized and every operation is defensive: storage can
 * genuinely fail on-device (quota, corruption), so reads fall back to `null`
 * and callers layer sensible defaults on top rather than crashing.
 */

export async function readJSON<T>(key: StorageKey): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] failed to read "${key}"`, error);
    return null;
  }
}

export async function writeJSON<T>(key: StorageKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] failed to write "${key}"`, error);
  }
}

export async function removeKey(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] failed to remove "${key}"`, error);
  }
}

/** Remove every key owned by the app. Used by "reset all data". */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(StorageKeys));
  } catch (error) {
    console.warn('[storage] failed to clear all keys', error);
  }
}
