import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsProvider, useSettings } from '@/context';
import { RootNavigator } from '@/navigation';
import { ThemeProvider, useTheme } from '@/theme';

/**
 * Provider composition:
 *   SafeAreaProvider → SettingsProvider → ThemeProvider → navigation
 *
 * SettingsProvider sits above ThemeProvider because the active theme is derived
 * from the persisted `darkMode` setting.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AppContent />
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
