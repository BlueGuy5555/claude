import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/context/SettingsContext';

import { getTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme | undefined>(undefined);

/**
 * Derives the active theme from the user's `theme` preference. `'system'`
 * follows the OS appearance (via `useColorScheme`), while `'light'`/`'dark'`
 * force a palette. Because it reads from `SettingsProvider`, that provider must
 * sit above this one in the tree.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();

  const isDark =
    settings.theme === 'system' ? systemScheme === 'dark' : settings.theme === 'dark';

  const theme = useMemo(() => getTheme(isDark), [isDark]);

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
