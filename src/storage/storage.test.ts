import { beforeEach, describe, expect, it, vi } from 'vitest';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from './keys';
import { loadSettings, saveSettings } from './settingsStorage';
import { addSessionToHistory, clearHistory, loadHistory } from './workoutStorage';
import type { WorkoutSession } from '@/types';

// In-memory stand-in for the native AsyncStorage module so the persistence
// layer can be exercised in plain Node. `vi.mock` is hoisted above the imports.
vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
      setItem: vi.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      removeItem: vi.fn(async (k: string) => {
        store.delete(k);
      }),
      multiRemove: vi.fn(async (keys: string[]) => {
        keys.forEach((k) => store.delete(k));
      }),
      clear: vi.fn(async () => {
        store.clear();
      }),
    },
  };
});

function makeSession(id: string): WorkoutSession {
  return {
    id,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationSec: 60,
    sets: [{ exerciseId: 'squat', reps: 10 }],
    totalReps: 10,
    calories: 5,
    avgConfidence: 0.8,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('workoutStorage', () => {
  it('starts empty', async () => {
    expect(await loadHistory()).toEqual([]);
  });

  it('prepends new sessions (newest first) and persists across reads', async () => {
    await addSessionToHistory(makeSession('a'));
    await addSessionToHistory(makeSession('b'));
    const history = await loadHistory();
    expect(history.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('clears history', async () => {
    await addSessionToHistory(makeSession('a'));
    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });
});

describe('settingsStorage', () => {
  it('round-trips settings and merges defaults', async () => {
    await saveSettings({
      vibration: false,
      sound: true,
      theme: 'dark',
      cameraMirror: false,
      handedness: 'left',
      showSkeleton: false,
      confidenceThreshold: 0.5,
      showFps: true,
    });
    const loaded = await loadSettings();
    expect(loaded.vibration).toBe(false);
    expect(loaded.theme).toBe('dark');
    expect(loaded.handedness).toBe('left');
  });

  it('migrates the legacy darkMode boolean to the theme preference', async () => {
    await AsyncStorage.setItem(StorageKeys.settings, JSON.stringify({ darkMode: true }));
    expect((await loadSettings()).theme).toBe('dark');
  });

  it('falls back to defaults when nothing is stored', async () => {
    const loaded = await loadSettings();
    expect(loaded.theme).toBe('system');
    expect(loaded.confidenceThreshold).toBe(0.3);
  });
});
