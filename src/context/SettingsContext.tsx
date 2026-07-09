import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loadSettings, saveSettings } from '@/storage';
import { DEFAULT_SETTINGS, type Settings } from '@/types';

interface SettingsContextValue {
  settings: Settings;
  /** `false` until settings have been read from disk once. */
  isReady: boolean;
  /** Update a single setting and persist the whole object. */
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((stored) => {
      if (!cancelled) {
        setSettings(stored);
        setIsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSetting = useCallback<SettingsContextValue['updateSetting']>((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      // Fire-and-forget persistence; the wrapper already swallows failures.
      void saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, isReady, updateSetting }),
    [settings, isReady, updateSetting],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
