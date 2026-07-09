import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { AppText, Button, Card, IconBadge, ScreenContainer } from '@/components';
import { ProgressBar } from '@/charts';
import { APP, EXERCISES } from '@/constants';
import { useDashboard, useGoals, useHaptics } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { loadPreferences, savePreferences } from '@/storage';
import { toHistoryItem } from '@/services';
import { useTheme } from '@/theme';
import { GOAL_METRIC_META, GOAL_PERIOD_META, type ExerciseId } from '@/types';
import { formatCalories, formatDuration, formatNumber } from '@/utils';

function ExerciseChip({
  name,
  icon,
  selected,
  onPress,
}: {
  name: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={selected ? theme.colors.onPrimary : theme.colors.primary}
      />
      <AppText
        variant="caption"
        style={{
          marginTop: 6,
          color: selected ? theme.colors.onPrimary : theme.colors.text,
        }}
      >
        {name}
      </AppText>
    </Pressable>
  );
}

/** A compact metric shown inside the "Today" summary card. */
function MiniStat({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  tint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={18} color={tint ?? theme.colors.primary} />
      <AppText variant="subtitle" style={{ marginTop: 4 }}>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

export function HomeScreen({ navigation }: RootStackScreenProps<'Home'>) {
  const theme = useTheme();
  const { selection } = useHaptics();
  const { statistics, recent, hasData } = useDashboard();
  const { progress } = useGoals();
  const [selected, setSelected] = useState<ExerciseId>(EXERCISES[0]!.id);

  // Restore the exercise chosen last time.
  useEffect(() => {
    let cancelled = false;
    loadPreferences().then((prefs) => {
      if (!cancelled && prefs.lastExerciseId) setSelected(prefs.lastExerciseId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = () => {
    void savePreferences({
      lastExerciseId: selected,
      hasCompletedOnboarding: true,
      units: 'metric',
    });
    navigation.navigate('WorkoutSession', { exerciseId: selected });
  };

  const primaryGoal = progress[0] ?? null;
  const recentItem = recent ? toHistoryItem(recent) : null;

  return (
    <ScreenContainer>
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(450)} style={styles.header}>
        <View>
          <AppText variant="caption" color="textMuted">
            {APP.name}
          </AppText>
          <AppText variant="headline">Today</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          onPress={() => navigation.navigate('Settings')}
        >
          <IconBadge name="settings-outline" size={20} containerSize={40} />
        </Pressable>
      </Animated.View>

      {/* Today summary */}
      <Animated.View entering={FadeInDown.delay(60).duration(450)}>
        <Card style={{ marginTop: theme.spacing.lg }}>
          <View style={styles.todayRow}>
            <MiniStat
              icon="repeat-outline"
              value={formatNumber(statistics.repsToday)}
              label="Reps"
            />
            <MiniStat
              icon="flame-outline"
              value={formatCalories(statistics.caloriesToday)}
              label="Burned"
              tint={theme.colors.warning}
            />
            <MiniStat
              icon="time-outline"
              value={formatDuration(statistics.durationTodaySec)}
              label="Active"
              tint={theme.colors.accent}
            />
          </View>
          <View style={[styles.streakRow, { borderTopColor: theme.colors.border }]}>
            <AppText variant="caption" color="textSecondary">
              🔥 {statistics.currentStreakDays}-day streak
            </AppText>
            <AppText variant="caption" color="textMuted">
              Best {statistics.longestStreakDays}d · {statistics.workoutsThisWeek} this week ·{' '}
              {statistics.workoutsThisMonth} this month
            </AppText>
          </View>
        </Card>
      </Animated.View>

      {/* Start a workout */}
      <Animated.View
        entering={FadeInDown.delay(120).duration(450)}
        style={{ marginTop: theme.spacing.xl }}
      >
        <AppText variant="subtitle" style={{ marginBottom: theme.spacing.md }}>
          Start a workout
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.xl }}
        >
          {EXERCISES.map((exercise) => (
            <ExerciseChip
              key={exercise.id}
              name={exercise.name}
              icon={exercise.icon}
              selected={exercise.id === selected}
              onPress={() => {
                selection();
                setSelected(exercise.id);
              }}
            />
          ))}
        </ScrollView>
        <View style={{ marginTop: theme.spacing.lg }}>
          <Button label="Start Workout" icon="barbell-outline" size="lg" onPress={handleStart} />
        </View>
      </Animated.View>

      {/* Primary goal progress */}
      {primaryGoal ? (
        <Animated.View
          entering={FadeInDown.delay(180).duration(450)}
          style={{ marginTop: theme.spacing.xl }}
        >
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Goals')}>
            <Card>
              <View style={styles.goalHeader}>
                <AppText variant="bodyStrong">
                  {GOAL_PERIOD_META[primaryGoal.goal.period].adjective}{' '}
                  {GOAL_METRIC_META[primaryGoal.goal.metric].label.toLowerCase()} goal
                </AppText>
                <AppText variant="caption" color={primaryGoal.completed ? 'success' : 'textMuted'}>
                  {primaryGoal.completed ? 'Complete 🎉' : `${primaryGoal.current}/${primaryGoal.target}`}
                </AppText>
              </View>
              <View style={{ marginTop: theme.spacing.md }}>
                <ProgressBar
                  fraction={primaryGoal.fraction}
                  color={primaryGoal.completed ? theme.colors.success : theme.colors.primary}
                />
              </View>
            </Card>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Recent workout preview */}
      {recentItem ? (
        <Animated.View
          entering={FadeInDown.delay(240).duration(450)}
          style={{ marginTop: theme.spacing.xl }}
        >
          <View style={styles.sectionHeaderRow}>
            <AppText variant="subtitle">Recent workout</AppText>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('History')}>
              <AppText variant="caption" color="primary">
                See all
              </AppText>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('SessionDetail', { sessionId: recentItem.id })
            }
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Card style={styles.recentCard}>
              <IconBadge name={recentItem.icon} />
              <View style={[styles.recentText, { marginHorizontal: theme.spacing.md }]}>
                <AppText variant="bodyStrong">{recentItem.title}</AppText>
                <AppText variant="caption" color="textMuted">
                  {recentItem.relativeDate} · {recentItem.durationLabel}
                </AppText>
              </View>
              <View style={styles.recentReps}>
                <AppText variant="subtitle" color="primary">
                  {recentItem.totalReps}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  reps
                </AppText>
              </View>
            </Card>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Navigation tiles */}
      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
        <NavTile
          icon="stats-chart-outline"
          title="Statistics"
          subtitle="Trends, charts and records"
          onPress={() => navigation.navigate('Statistics')}
        />
        <NavTile
          icon="flag-outline"
          title="Goals"
          subtitle="Set targets and track progress"
          onPress={() => navigation.navigate('Goals')}
        />
        <NavTile
          icon="time-outline"
          title="History"
          subtitle={hasData ? 'Browse every past workout' : 'Your workouts will appear here'}
          onPress={() => navigation.navigate('History')}
        />
      </View>
    </ScreenContainer>
  );
}

function NavTile({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.tile}>
        <IconBadge name={icon} />
        <View style={[styles.tileText, { marginHorizontal: theme.spacing.md }]}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="caption" color="textMuted" style={styles.tileSubtitle}>
            {subtitle}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniStat: { flex: 1, alignItems: 'center' },
  streakRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentCard: { flexDirection: 'row', alignItems: 'center' },
  recentText: { flex: 1 },
  recentReps: { alignItems: 'center', minWidth: 44 },
  tile: { flexDirection: 'row', alignItems: 'center' },
  tileText: { flex: 1 },
  tileSubtitle: { marginTop: 2 },
  chip: {
    width: 92,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.85 },
});
