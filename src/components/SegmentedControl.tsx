import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useHaptics } from '@/hooks';
import { useTheme } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

/**
 * A compact pill of mutually-exclusive options. Used for multi-choice settings
 * such as the theme mode and measurement units. Generic over the value type so
 * callers keep full type-safety on the selected value.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const { selection } = useHaptics();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, padding: 4 },
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              selection();
              onChange(option.value);
            }}
            style={[
              styles.segment,
              {
                borderRadius: theme.radius.sm,
                backgroundColor: active ? theme.colors.primary : 'transparent',
              },
            ]}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={16}
                color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
                style={styles.icon}
              />
            ) : null}
            <AppText
              variant="caption"
              style={{
                color: active ? theme.colors.onPrimary : theme.colors.textSecondary,
                fontWeight: '600',
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row' },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  icon: { marginRight: 6 },
});
