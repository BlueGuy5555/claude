import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsProvider, WorkoutDataProvider, useSettings } from '@/context';
import { RootNavigator } from '@/navigation';
import { ThemeProvider, useTheme } from '@/theme';

/**
 * Provider composition:
 *   SafeAreaProvider → SettingsProvider → ThemeProvider → WorkoutDataProvider → navigation
 *
 * SettingsProvider sits above ThemeProvider because the active theme is derived
 * from the persisted `darkMode` setting. WorkoutDataProvider loads workout
 * history once and holds it in memory as the single source of truth for the
 * dashboard, history, statistics and goals surfaces.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <WorkoutDataProvider>
            <AppContent />
          </WorkoutDataProvider>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

/**
 * Holds rendering until settings have been read from disk once, so the app
 * never flashes the wrong theme on launch.
 */
function AppContent() {
  const { isReady } = useSettings();
  const theme = useTheme();

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return <RootNavigator />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
