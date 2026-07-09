import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { IconBadge } from './IconBadge';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SettingSegmentProps<T extends string> {
  icon: IconName;
  label: string;
  description?: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A labelled row whose value is chosen from a small segmented control. */
export function SettingSegment<T extends string>({
  icon,
  label,
  description,
  options,
  value,
  onChange,
}: SettingSegmentProps<T>) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { paddingVertical: theme.spacing.md }]}>
      <View style={styles.header}>
        <IconBadge name={icon} size={20} containerSize={40} />
        <View style={[styles.text, { marginHorizontal: theme.spacing.md }]}>
          <AppText variant="bodyStrong">{label}</AppText>
          {description ? (
            <AppText variant="caption" color="textMuted" style={styles.description}>
              {description}
            </AppText>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.segment,
          { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
        ]}
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
                styles.option,
                { borderRadius: theme.radius.md - 2 },
                active && { backgroundColor: theme.colors.primary },
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {},
  header: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  description: { marginTop: 2 },
  segment: { flexDirection: 'row', marginTop: 12, marginLeft: 52, padding: 3 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 8 },
});
