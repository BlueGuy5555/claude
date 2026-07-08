import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  ScreenContainer,
  SectionHeader,
  StatisticCard,
} from '@/components';
import { useSettings } from '@/context';
import { useStatistics } from '@/hooks';
import { exerciseName } from '@/services';
import { useTheme } from '@/theme';
import type { PeriodSummary } from '@/types';
import { formatDuration, formatEnergy, formatNumber, formatRelativeDate } from '@/utils';
import type { RootStackScreenProps } from '@/navigation';

/** A labelled key/value row used inside summary cards. */
function DetailRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.detailRow,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
      ]}
    >
      <AppText variant="body" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

/** A card summarising a bounded period (last 7 / 30 days). */
function SummaryCard({ summary, units }: { summary: PeriodSummary; units: 'metric' | 'imperial' }) {
  return (
    <Card>
      <DetailRow label="Workouts" value={formatNumber(summary.workouts)} />
      <DetailRow label="Reps" value={formatNumber(summary.reps)} divider />
      <DetailRow label="Time" value={formatDuration(summary.durationSec)} divider />
      <DetailRow label="Energy" value={formatEnergy(summary.calories, units)} divider />
    </Card>
  );
}

export function StatisticsScreen({ navigation }: RootStackScreenProps<'Statistics'>) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { statistics, isLoading } = useStatistics();

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  if (statistics.totalWorkouts === 0) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="stats-chart-outline"
          title="No stats yet"
          message="Complete a workout and your totals, streaks, and personal records will appear here."
          action={
            <Button
              label="Start a workout"
              icon="barbell-outline"
              onPress={() => navigation.navigate('WorkoutSession')}
            />
          }
        />
      </ScreenContainer>
    );
  }

  const { personalRecords: pr } = statistics;
  const mostPerformed = statistics.mostPerformedExerciseId
    ? exerciseName(statistics.mostPerformedExerciseId)
    : '—';

  return (
    <ScreenContainer>
      <SectionHeader title="All time" subtitle="Everything you have logged so far." />
      <View style={[styles.row, { gap: theme.spacing.md }]}>
        <StatisticCard icon="barbell-outline" label="Workouts" value={formatNumber(statistics.totalWorkouts)} />
        <StatisticCard icon="repeat-outline" label="Total reps" value={formatNumber(statistics.totalReps)} />
      </View>
      <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
        <StatisticCard icon="time-outline" label="Time trained" value={formatDuration(statistics.totalDurationSec)} />
        <StatisticCard
          icon="flame-outline"
          label="Energy"
          value={formatEnergy(statistics.totalCalories, settings.units)}
          tint={theme.colors.warning}
        />
      </View>
      <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
        <StatisticCard
          icon="flame-outline"
          label="Current streak"
          value={`${statistics.currentStreakDays}d`}
          tint={theme.colors.warning}
        />
        <StatisticCard
          icon="trophy-outline"
          label="Best streak"
          value={`${statistics.longestStreakDays}d`}
          tint={theme.colors.accent}
        />
      </View>

      {/* Most performed exercise */}
      <Card style={{ marginTop: theme.spacing.xl }}>
        <View style={styles.detailRow}>
          <AppText variant="body" color="textSecondary">
            Most performed
          </AppText>
          <AppText variant="bodyStrong">{mostPerformed}</AppText>
        </View>
        {statistics.mostPerformedExerciseReps > 0 ? (
          <DetailRow
            label="Reps of it"
            value={formatNumber(statistics.mostPerformedExerciseReps)}
            divider
          />
        ) : null}
      </Card>

      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Last 7 days" />
        <SummaryCard summary={statistics.thisWeek} units={settings.units} />
      </View>

      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Last 30 days" />
        <SummaryCard summary={statistics.thisMonth} units={settings.units} />
      </View>

      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Personal records" />
        <Card>
          <DetailRow label="Most reps in a session" value={formatNumber(pr.mostRepsInSession)} />
          <DetailRow label="Most reps in a day" value={formatNumber(pr.mostRepsInDay)} divider />
          <DetailRow label="Longest session" value={formatDuration(pr.longestSessionSec)} divider />
          <DetailRow label="Best streak" value={`${pr.bestStreakDays}d`} divider />
        </Card>
      </View>

      <Card style={{ marginTop: theme.spacing.xl }}>
        <View style={styles.detailRow}>
          <AppText variant="body" color="textSecondary">
            Last workout
          </AppText>
          <AppText variant="bodyStrong">
            {statistics.lastWorkoutAt ? formatRelativeDate(statistics.lastWorkoutAt) : 'Never'}
          </AppText>
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
});
