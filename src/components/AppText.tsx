import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { TextVariant } from '@/theme';

type ColorKey =
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'primary'
  | 'onPrimary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'onOverlay';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** Semantic theme color key; defaults to primary text. */
  color?: ColorKey;
  center?: boolean;
}

/**
 * The single text primitive used across the app. It applies a typographic
 * variant and a theme-aware color so screens never repeat font/color styling.
 */
export function AppText({
  variant = 'body',
  color = 'text',
  center,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const variantStyle = theme.textVariants[variant] as TextStyle;

  return (
    <Text
      style={[
        variantStyle,
        { color: theme.colors[color] },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
