import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessibility label for the whole control. */
  accessibilityLabel?: string;
}

/**
 * A compact segmented selector used for enumerated settings (theme, handedness,
 * confidence level). Zero third-party dependencies — built from Pressables so
 * it themes cleanly and stays accessible.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              { borderRadius: theme.radius.md - 2 },
              selected && { backgroundColor: theme.colors.surface },
            ]}
          >
            <AppText
              variant="bodyStrong"
              color={selected ? 'primary' : 'textSecondary'}
              style={styles.label}
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
  track: { flexDirection: 'row', padding: 3 },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14 },
});
