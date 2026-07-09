import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { IconName } from '@/types';

interface IconBadgeProps {
  name: IconName;
  size?: number;
  /** Diameter of the badge circle. */
  containerSize?: number;
  /** Foreground (icon) color. Defaults to the primary brand color. */
  color?: string;
  /** Background color. Defaults to a soft tint of the primary color. */
  background?: string;
  style?: ViewStyle;
}

/** A colored circular chip with a centered Ionicon. */
export function IconBadge({
  name,
  size = 22,
  containerSize = 44,
  color,
  background,
  style,
}: IconBadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: background ?? theme.colors.primarySoft,
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
