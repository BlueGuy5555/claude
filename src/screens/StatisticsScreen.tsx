import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  IconBadge,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/components';
import { getExercise } from '@/constants';
import { useStatistics } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import type { ExerciseStat, PersonalRecord } from '@/types';
import { useTheme } from '@/theme';
import { formatCalories, formatClock, formatDuration, formatNumber } from '@/utils';

export function StatisticsScreen({ navigation }: RootStackScreenProps<'Statistics'>) {
  const theme = useTheme();
  const { statistics, isLoading } = useStatistics();

  if (isLoading) {
    return (
      <ScreenContainer scroll={false} style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (statistics.totalWorkouts === 0) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="stats-chart-outline"
          title="No stats yet"
          message="Finish your first workout and this screen will fill up with reps, streaks, calories and personal records."
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

  return (
    <ScreenContainer>
      <SectionHeader title="Your progress" subtitle="Everything you have logged so far." />

      <View style={[styles.row, { gap: theme.spacing.md }]}>
        <StatCard icon="barbell-outline" label="Workouts" value={formatNumber(statistics.totalWorkouts)} />
        <StatCard icon="repeat-outline" label="Total reps" value={formatNumber(statistics.totalReps)} />
      </View>
      <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
        <StatCard icon="time-outline" label="Time trained" value={formatDuration(statistics.totalDurationSec)} />
        <StatCard icon="flame-outline" label="Calories" value={formatNumber(statistics.totalCalories)} tint={theme.colors.warning} />
      </View>
      <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
        <StatCard icon="calendar-outline" label="This week" value={formatNumber(statistics.workoutsThisWeek)} />
        <StatCard icon="calendar-number-outline" label="This month" value={formatNumber(statistics.workoutsThisMonth)} />
      </View>
      <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
        <StatCard icon="flame" label="Current streak" value={`${statistics.currentStreakDays}d`} tint={theme.colors.warning} />
        <StatCard icon="trophy-outline" label="Best streak" value={`${statistics.longestStreakDays}d`} tint={theme.colors.accent} />
      </View>
      <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
        <StatCard icon="stopwatch-outline" label="Longest workout" value={formatDuration(statistics.longestWorkoutSec)} />
        <StatCard icon="speedometer-outline" label="Avg workout" value={formatDuration(statistics.averageDurationSec)} />
      </View>

      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Exercise breakdown" />
        <Card style={styles.group}>
          {statistics.exerciseBreakdown.map((stat, index) => (
            <View key={stat.exerciseId}>
              {index > 0 ? (
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              ) : null}
              <BreakdownRow stat={stat} />
            </View>
          ))}
        </Card>
      </View>

      {statistics.personalRecords.length > 0 ? (
        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Personal records" />
          <Card style={styles.group}>
            {statistics.personalRecords.map((record, index) => (
              <View key={record.exerciseId}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                ) : null}
                <RecordRow record={record} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function BreakdownRow({ stat }: { stat: ExerciseStat }) {
  const theme = useTheme();
  const exercise = getExercise(stat.exerciseId);
  const value =
    exercise.kind === 'timed' ? formatDuration(stat.durationSec) : `${formatNumber(stat.reps)} reps`;
  return (
    <View style={[styles.itemRow, { paddingVertical: theme.spacing.md }]}>
      <IconBadge name={exercise.icon} size={20} containerSize={40} />
      <View style={[styles.itemText, { marginHorizontal: theme.spacing.md }]}>
        <AppText variant="bodyStrong">{exercise.name}</AppText>
        <AppText variant="caption" color="textMuted" style={styles.itemMeta}>
          {formatNumber(stat.workouts)} {stat.workouts === 1 ? 'workout' : 'workouts'} ·{' '}
          {formatCalories(stat.calories)}
        </AppText>
      </View>
      <AppText variant="bodyStrong" color="primary">
        {value}
      </AppText>
    </View>
  );
}

function RecordRow({ record }: { record: PersonalRecord }) {
  const theme = useTheme();
  const exercise = getExercise(record.exerciseId);
  const value =
    exercise.kind === 'timed'
      ? formatClock(record.bestDurationSec)
      : `${formatNumber(record.bestReps)} reps`;
  return (
    <View style={[styles.itemRow, { paddingVertical: theme.spacing.md }]}>
      <Ionicons name="ribbon-outline" size={22} color={theme.colors.accent} />
      <View style={[styles.itemText, { marginHorizontal: theme.spacing.md }]}>
        <AppText variant="bodyStrong">{exercise.name}</AppText>
        <AppText variant="caption" color="textMuted" style={styles.itemMeta}>
          Best {exercise.kind === 'timed' ? 'hold' : 'set'}
        </AppText>
      </View>
      <AppText variant="bodyStrong" color="accent">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  group: { paddingVertical: 0 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemText: { flex: 1 },
  itemMeta: { marginTop: 2 },
});
