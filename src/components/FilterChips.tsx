import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface FilterChipsProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A horizontally scrolling row of selectable pills. Used for the statistics
 * date-range filter, but generic over any string-valued option set.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: FilterChipsProps<T>) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                borderColor: active ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radius.pill,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={{ color: active ? theme.colors.onPrimary : theme.colors.textSecondary }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8, paddingRight: 24 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
