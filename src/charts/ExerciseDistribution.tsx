import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, IconBadge } from '@/components';
import { exerciseIcon } from '@/services';
import { useTheme } from '@/theme';
import type { ExerciseSlice } from '@/types';
import { formatNumber, formatPercent } from '@/utils';

import { ProgressBar } from './ProgressBar';

interface ExerciseDistributionProps {
  data: ExerciseSlice[];
}

/**
 * The exercise mix as a ranked list of animated horizontal bars. A list reads
 * more clearly than a pie/donut on a phone (labels never overlap) while still
 * conveying each exercise's share at a glance.
 */
export function ExerciseDistribution({ data }: ExerciseDistributionProps) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <AppText variant="body" color="textMuted">
        No exercises logged in this range yet.
      </AppText>
    );
  }

  const palette = [
    theme.colors.primary,
    theme.colors.accent,
    theme.colors.warning,
    theme.colors.success,
    theme.colors.danger,
  ];

  return (
    <View style={{ gap: theme.spacing.md }}>
      {data.map((slice, i) => (
        <View key={slice.exerciseId} style={styles.row}>
          <IconBadge
            name={exerciseIcon(slice.exerciseId)}
            size={18}
            containerSize={34}
            color={palette[i % palette.length]}
            background={theme.colors.surfaceAlt}
          />
          <View style={styles.body}>
            <View style={styles.rowHeader}>
              <AppText variant="bodyStrong">{slice.name}</AppText>
              <AppText variant="caption" color="textMuted">
                {formatNumber(slice.reps)} reps · {formatPercent(slice.fraction)}
              </AppText>
            </View>
            <View style={{ marginTop: 6 }}>
              <ProgressBar
                fraction={slice.fraction}
                color={palette[i % palette.length]}
                height={8}
                delay={i * 80}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1, marginLeft: 12 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
