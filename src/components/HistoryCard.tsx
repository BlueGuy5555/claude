import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSettings } from '@/context';
import type { WorkoutHistoryItem } from '@/services';
import { useTheme } from '@/theme';
import { formatEnergy } from '@/utils';

import { AppText } from './AppText';
import { Card } from './Card';
import { IconBadge } from './IconBadge';

interface HistoryCardProps {
  item: WorkoutHistoryItem;
  /** When provided, renders a delete affordance on the right. */
  onDelete?: () => void;
}

/** A single saved workout row: exercise, date, duration, energy and reps. */
export function HistoryCard({ item, onDelete }: HistoryCardProps) {
  const theme = useTheme();
  const { settings } = useSettings();

  return (
    <Card style={styles.row}>
      <IconBadge name={item.icon} />
      <View style={[styles.text, { marginHorizontal: theme.spacing.md }]}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {item.title}
        </AppText>
        <AppText variant="caption" color="textMuted" style={styles.meta} numberOfLines={1}>
          {item.relativeDate} · {item.durationLabel} · {formatEnergy(item.calories, settings.units)}
        </AppText>
      </View>

      <View style={styles.reps}>
        <AppText variant="subtitle" color="primary">
          {item.totalReps}
        </AppText>
        <AppText variant="caption" color="textMuted">
          reps
        </AppText>
      </View>

      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.title} workout`}
          hitSlop={8}
          onPress={onDelete}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  meta: { marginTop: 2 },
  reps: { alignItems: 'center', minWidth: 44 },
  delete: { padding: 6, marginLeft: 4 },
  pressed: { opacity: 0.6 },
});
