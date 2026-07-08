import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { Exercise } from '@/types';

import { AppText } from './AppText';
import { IconBadge } from './IconBadge';

interface ExerciseCardProps {
  exercise: Exercise;
  selected?: boolean;
  onPress: () => void;
  /** Compact layout (used in horizontal pickers). */
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * A selectable card representing one exercise. Highlights its border and shows
 * a check when selected, so it works both as a picker item and a menu entry.
 */
export function ExerciseCard({ exercise, selected, onPress, compact, style }: ExerciseCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.compact : styles.full,
        {
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <IconBadge
        name={exercise.icon}
        size={20}
        containerSize={40}
        background={selected ? theme.colors.primary : theme.colors.primarySoft}
        color={selected ? theme.colors.onPrimary : theme.colors.primary}
      />
      <View style={compact ? styles.compactText : styles.fullText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {exercise.name}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {exercise.focus}
        </AppText>
      </View>
      {selected && !compact ? (
        <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  full: { flexDirection: 'row', alignItems: 'center' },
  fullText: { flex: 1, marginHorizontal: 12 },
  compact: { width: 132, alignItems: 'flex-start' },
  compactText: { marginTop: 10 },
  pressed: { opacity: 0.85 },
});
