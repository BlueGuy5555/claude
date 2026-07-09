import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Apply default horizontal + vertical padding (default true). */
  padded?: boolean;
  /** Safe-area edges to inset. Defaults to top + bottom. */
  edges?: readonly Edge[];
  style?: ViewStyle;
}

/**
 * Consistent screen scaffold: fills the safe area, paints the themed
 * background, and optionally scrolls and pads its content. Every screen renders
 * inside one of these so spacing and background handling live in one place.
 */
export function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  edges = ['top', 'bottom'],
  style,
}: ScreenContainerProps) {
  const theme = useTheme();
  const padding = padded
    ? { paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg }
    : undefined;

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, padding, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
