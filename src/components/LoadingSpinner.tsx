import React from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

interface LoadingSpinnerProps {
  /** Optional caption shown beneath the spinner. */
  label?: string;
  size?: 'small' | 'large';
  /** Fill and center within the available space (default true). */
  fill?: boolean;
  style?: ViewStyle;
}

/** A themed activity indicator with an optional caption. */
export function LoadingSpinner({ label, size = 'large', fill = true, style }: LoadingSpinnerProps) {
  const theme = useTheme();
  return (
    <View style={[fill && styles.fill, styles.center, style]}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {label ? (
        <AppText variant="caption" color="textMuted" style={{ marginTop: theme.spacing.md }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
