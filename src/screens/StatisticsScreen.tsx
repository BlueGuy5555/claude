import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AppText,
  Card,
  FilterChips,
  IconBadge,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/components';
import { BarChart, ExerciseDistribution, LineChart } from '@/charts';
import {
  useAnalytics,
  useInsights,
  usePersonalRecords,
  useStatistics,
} from '@/hooks';
import { exerciseName } from '@/services';
import { useTheme } from '@/theme';
import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  type Insight,
  type PersonalRecord,
} from '@/types';
import {
  formatCalories,
  formatDuration,
  formatNumber,
} from '@/utils';

/** A labelled chart inside its own card, with a section title. */
function ChartCard({
  title,
  subtitle,
  children,
  delay,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  delay: number;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(450)}
      style={{ marginTop: theme.spacing.xl }}
    >
      <SectionHeader title={title} subtitle={subtitle} />
      <Card>{children}</Card>
    </Animated.View>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const theme = useTheme();
  const tint =
    insight.tone === 'positive'
      ? theme.colors.success
      : insight.tone === 'negative'
        ? theme.colors.danger
        : theme.colors.primary;
  return (
    <View style={styles.insightRow}>
      <IconBadge
        name={insight.icon}
        size={18}
        containerSize={36}
        color={tint}
        background={theme.colors.surfaceAlt}
      />
      <AppText variant="body" style={{ flex: 1, marginLeft: 12 }}>
        {insight.text}
      </AppText>
    </View>
  );
}

function RecordRow({ record }: { record: PersonalRecord }) {
  const theme = useTheme();
  return (
    <View style={styles.recordRow}>
      <IconBadge
        name={record.icon}
        size={18}
        containerSize={36}
        color={theme.colors.accent}
        background={theme.colors.surfaceAlt}
      />
      <AppText variant="body" style={{ flex: 1, marginLeft: 12 }}>
        {record.label}
      </AppText>
      <AppText variant="bodyStrong" color="primary">
        {record.display}
      </AppText>
    </View>
  );
}

export function StatisticsScreen() {
  const theme = useTheme();
  const [preset, setPreset] = useState<DateRangePreset>('7d');

  const { statistics, isLoading } = useStatistics();
  const { summary, charts } = useAnalytics(preset);
  const { records } = usePersonalRecords();
  const { insights } = useInsights();

  if (isLoading) {
    return (
      <ScreenContainer scroll={false} style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const isEmpty = statistics.totalWorkouts === 0;

  if (isEmpty) {
    return (
      <ScreenContainer>
        <SectionHeader
          title="Your progress"
          subtitle="Complete a workout to start filling in these numbers."
        />
        <Card style={styles.emptyCard}>
          <IconBadge name="stats-chart-outline" size={28} containerSize={64} />
          <AppText variant="bodyStrong" center style={{ marginTop: theme.spacing.md }}>
            No data yet
          </AppText>
          <AppText variant="body" color="textSecondary" center style={{ marginTop: 4 }}>
            Your charts, records and insights will appear here after your first workout.
          </AppText>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Your progress"
        subtitle="Everything you've logged, at a glance."
      />

      {/* Filter */}
      <FilterChips options={DATE_RANGE_PRESETS} value={preset} onChange={setPreset} />

      {/* Range summary */}
      <Animated.View
        entering={FadeInDown.delay(40).duration(450)}
        style={{ marginTop: theme.spacing.lg }}
      >
        <View style={[styles.row, { gap: theme.spacing.md }]}>
          <StatCard icon="barbell-outline" label="Workouts" value={formatNumber(summary.workouts)} />
          <StatCard icon="repeat-outline" label="Reps" value={formatNumber(summary.reps)} />
        </View>
        <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
          <StatCard
            icon="time-outline"
            label="Time"
            value={formatDuration(summary.durationSec)}
          />
          <StatCard
            icon="flame-outline"
            label="Calories"
            value={formatCalories(summary.calories)}
            tint={theme.colors.warning}
          />
        </View>
      </Animated.View>

      {/* Insights */}
      {insights.length > 0 ? (
        <Animated.View
          entering={FadeInDown.delay(80).duration(450)}
          style={{ marginTop: theme.spacing.xl }}
        >
          <SectionHeader title="Insights" />
          <Card style={{ gap: theme.spacing.md }}>
            {insights.map((insight) => (
              <InsightRow key={insight.id} insight={insight} />
            ))}
          </Card>
        </Animated.View>
      ) : null}

      {/* Charts */}
      <ChartCard title="Daily reps" subtitle="Reps completed each day." delay={120}>
        <BarChart data={charts.dailyReps} labelEvery={charts.dailyReps.length > 10 ? 5 : 1} />
      </ChartCard>

      <ChartCard title="Calories over time" delay={160}>
        <LineChart
          data={charts.caloriesOverTime}
          color={theme.colors.warning}
          labelEvery={charts.caloriesOverTime.length > 10 ? 5 : 1}
        />
      </ChartCard>

      <ChartCard title="Workout duration" subtitle="Active minutes per day." delay={200}>
        <LineChart
          data={charts.durationOverTime}
          color={theme.colors.accent}
          labelEvery={charts.durationOverTime.length > 10 ? 5 : 1}
        />
      </ChartCard>

      <ChartCard title="Workout frequency" subtitle="Sessions per day." delay={240}>
        <BarChart
          data={charts.frequency}
          color={theme.colors.success}
          labelEvery={charts.frequency.length > 10 ? 5 : 1}
        />
      </ChartCard>

      <ChartCard title="Streak history" subtitle="Days you trained." delay={260}>
        <BarChart
          data={charts.activity}
          color={theme.colors.warning}
          labelEvery={charts.activity.length > 10 ? 5 : 1}
        />
      </ChartCard>

      <ChartCard title="Weekly reps" subtitle="Trailing 12 weeks." delay={280}>
        <BarChart data={charts.weeklyReps} labelEvery={2} />
      </ChartCard>

      <ChartCard title="Monthly reps" subtitle="Trailing 12 months." delay={320}>
        <BarChart data={charts.monthlyReps} color={theme.colors.accent} labelEvery={1} />
      </ChartCard>

      <ChartCard title="Exercise distribution" delay={360}>
        <ExerciseDistribution data={charts.distribution} />
      </ChartCard>

      {/* All-time summary */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(450)}
        style={{ marginTop: theme.spacing.xl }}
      >
        <SectionHeader title="All time" subtitle="Lifetime totals and superlatives." />
        <Card style={{ gap: theme.spacing.md }}>
          <SummaryLine label="Total workouts" value={formatNumber(statistics.totalWorkouts)} />
          <SummaryLine label="Total reps" value={formatNumber(statistics.totalReps)} />
          <SummaryLine label="Total time" value={formatDuration(statistics.totalDurationSec)} />
          <SummaryLine
            label="Avg workout length"
            value={formatDuration(statistics.avgWorkoutDurationSec)}
          />
          <SummaryLine
            label="Avg reps / workout"
            value={formatNumber(statistics.avgRepsPerWorkout)}
          />
          <SummaryLine label="Calories burned" value={formatCalories(statistics.totalCalories)} />
          {statistics.mostTrainedExerciseId ? (
            <SummaryLine
              label="Most trained"
              value={exerciseName(statistics.mostTrainedExerciseId)}
            />
          ) : null}
          <SummaryLine label="Current streak" value={`${statistics.currentStreakDays} days`} />
          <SummaryLine label="Longest streak" value={`${statistics.longestStreakDays} days`} />
          {statistics.bestDay ? (
            <SummaryLine
              label="Best day"
              value={`${statistics.bestDay.label} · ${formatNumber(statistics.bestDay.value)} reps`}
            />
          ) : null}
          {statistics.mostProductiveWeek ? (
            <SummaryLine
              label="Best week"
              value={`${formatNumber(statistics.mostProductiveWeek.value)} reps`}
            />
          ) : null}
          {statistics.mostProductiveMonth ? (
            <SummaryLine
              label="Best month"
              value={`${statistics.mostProductiveMonth.label} · ${formatNumber(
                statistics.mostProductiveMonth.value,
              )} reps`}
            />
          ) : null}
        </Card>
      </Animated.View>

      {/* Personal records */}
      {records.length > 0 ? (
        <Animated.View
          entering={FadeInDown.delay(440).duration(450)}
          style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.xl }}
        >
          <SectionHeader title="Personal records" subtitle="Your all-time bests." />
          <Card style={{ gap: theme.spacing.md }}>
            {records.map((record) => (
              <RecordRow key={record.id} record={record} />
            ))}
          </Card>
        </Animated.View>
      ) : null}
    </ScreenContainer>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <AppText variant="body" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  insightRow: { flexDirection: 'row', alignItems: 'center' },
  recordRow: { flexDirection: 'row', alignItems: 'center' },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
