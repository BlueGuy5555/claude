import React, { createContext, useContext, useMemo } from 'react';

import { useSettings } from '@/context/SettingsContext';

import { getTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme | undefined>(undefined);

/**
 * Derives the active theme from the user's `darkMode` setting. Because it reads
 * from `SettingsProvider`, that provider must sit above this one in the tree.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const theme = useMemo(() => getTheme(settings.darkMode), [settings.darkMode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Access the active theme. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}
