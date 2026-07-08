import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/components';
import { useStatistics } from '@/hooks';
import { useTheme } from '@/theme';
import { formatDuration, formatNumber, formatRelativeDate } from '@/utils';

export function StatisticsScreen() {
  const theme = useTheme();
  const { statistics, isLoading } = useStatistics();

  if (isLoading) {
    return (
      <ScreenContainer scroll={false} style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const isEmpty = statistics.totalWorkouts === 0;
  const lastWorkout = statistics.lastWorkoutAt
    ? formatRelativeDate(statistics.lastWorkoutAt)
    : 'Never';

  return (
    <ScreenContainer>
      <SectionHeader
        title="Your progress"
        subtitle={
          isEmpty
            ? 'Complete a workout to start filling in these numbers.'
            : 'A summary of everything you have logged so far.'
        }
      />

      <View style={[styles.row, { gap: theme.spacing.md }]}>
        <StatCard
          icon="barbell-outline"
          label="Workouts"
          value={formatNumber(statistics.totalWorkouts)}
        />
        <StatCard
          icon="repeat-outline"
          label="Total reps"
          value={formatNumber(statistics.totalReps)}
        />
      </View>

      <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
        <StatCard
          icon="time-outline"
          label="Time trained"
          value={formatDuration(statistics.totalDurationSec)}
        />
        <StatCard
          icon="calendar-outline"
          label="This week"
          value={formatNumber(statistics.workoutsThisWeek)}
        />
      </View>

      <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
        <StatCard
          icon="flame-outline"
          label="Current streak"
          value={`${statistics.currentStreakDays}d`}
          tint={theme.colors.warning}
        />
        <StatCard
          icon="trophy-outline"
          label="Best streak"
          value={`${statistics.longestStreakDays}d`}
          tint={theme.colors.accent}
        />
      </View>

      <Card style={{ marginTop: theme.spacing.xl }}>
        <View style={styles.lastRow}>
          <AppText variant="body" color="textSecondary">
            Last workout
          </AppText>
          <AppText variant="bodyStrong">{lastWorkout}</AppText>
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
