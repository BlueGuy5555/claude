import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { useHaptics } from '@/hooks';
import { useTheme } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Render in a destructive (red) tone. */
  danger?: boolean;
  /** Trigger light haptic feedback on press (respects the vibration setting). */
  haptic?: boolean;
  style?: ViewStyle;
}

/**
 * The app's primary tappable control. Handles theming, three visual variants,
 * a destructive tone, an optional leading icon, a loading state, and (opt-in)
 * haptic feedback.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  fullWidth = true,
  danger = false,
  haptic = true,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const { impact } = useHaptics();

  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary'
      ? danger
        ? theme.colors.danger
        : theme.colors.primary
      : variant === 'secondary'
        ? theme.colors.surfaceAlt
        : 'transparent';

  const foreground =
    variant === 'primary'
      ? theme.colors.onPrimary
      : danger
        ? theme.colors.danger
        : theme.colors.text;

  const handlePress = () => {
    if (haptic) impact('light');
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderRadius: theme.radius.md,
          paddingVertical: size === 'lg' ? theme.spacing.lg : theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
        },
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === 'lg' ? 20 : 18}
              color={foreground}
              style={styles.icon}
            />
          ) : null}
          <AppText
            variant="bodyStrong"
            style={{ color: foreground, fontSize: size === 'lg' ? 17 : 15 }}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
