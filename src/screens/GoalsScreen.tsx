import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AppText,
  Button,
  Card,
  ScreenContainer,
  SectionHeader,
  SettingSegment,
} from '@/components';
import { ProgressBar } from '@/charts';
import { useGoals, useHaptics } from '@/hooks';
import { useTheme } from '@/theme';
import {
  GOAL_METRIC_META,
  GOAL_PERIOD_META,
  type GoalMetric,
  type GoalPeriod,
  type GoalProgress,
} from '@/types';

const METRIC_OPTIONS: readonly { value: GoalMetric; label: string }[] = [
  { value: 'reps', label: 'Reps' },
  { value: 'workouts', label: 'Workouts' },
  { value: 'durationMin', label: 'Minutes' },
];

const PERIOD_OPTIONS: readonly { value: GoalPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/** Suggested starting targets per metric, so the stepper opens somewhere sane. */
const DEFAULT_TARGET: Record<GoalMetric, number> = {
  reps: 100,
  workouts: 4,
  durationMin: 30,
};

const STEP: Record<GoalMetric, number> = { reps: 10, workouts: 1, durationMin: 5 };

function GoalCard({
  progress,
  onRemove,
  delay,
}: {
  progress: GoalProgress;
  onRemove: () => void;
  delay: number;
}) {
  const theme = useTheme();
  const { goal, current, target, fraction, completed } = progress;
  const metric = GOAL_METRIC_META[goal.metric];
  const period = GOAL_PERIOD_META[goal.period];

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <Card>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitle}>
            <Ionicons
              name={completed ? 'checkmark-circle' : metric.icon}
              size={20}
              color={completed ? theme.colors.success : theme.colors.primary}
            />
            <AppText variant="bodyStrong" style={{ marginLeft: 8 }}>
              {period.adjective} {metric.label.toLowerCase()}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove goal"
            hitSlop={8}
            onPress={onRemove}
          >
            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <View style={{ marginTop: theme.spacing.md }}>
          <ProgressBar
            fraction={fraction}
            color={completed ? theme.colors.success : theme.colors.primary}
            height={12}
            delay={delay}
          />
        </View>

        <View style={styles.goalFooter}>
          <AppText variant="caption" color={completed ? 'success' : 'textSecondary'}>
            {completed ? 'Goal complete 🎉' : `${current} / ${target} ${metric.unit}`}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {period.label}
          </AppText>
        </View>
      </Card>
    </Animated.View>
  );
}

export function GoalsScreen() {
  const theme = useTheme();
  const { progress, addGoal, removeGoal } = useGoals();
  const { selection, notify } = useHaptics();

  const [metric, setMetric] = useState<GoalMetric>('reps');
  const [period, setPeriod] = useState<GoalPeriod>('daily');
  const [target, setTarget] = useState<number>(DEFAULT_TARGET.reps);

  const anyCompleted = useMemo(() => progress.some((p) => p.completed), [progress]);

  const handleMetricChange = (value: GoalMetric) => {
    selection();
    setMetric(value);
    setTarget(DEFAULT_TARGET[value]);
  };

  const adjustTarget = (delta: number) => {
    selection();
    setTarget((t) => Math.max(STEP[metric], t + delta));
  };

  const handleAdd = async () => {
    await addGoal({ metric, period, target });
    notify('success');
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="Goals"
        subtitle="Set targets and watch your progress fill up."
      />

      {anyCompleted ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card style={[styles.celebrate, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="trophy" size={22} color={theme.colors.primary} />
            <AppText variant="bodyStrong" style={{ marginLeft: 10, flex: 1 }}>
              Nice work — you've hit a goal! Keep the momentum going.
            </AppText>
          </Card>
        </Animated.View>
      ) : null}

      <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        {progress.length === 0 ? (
          <Card style={styles.emptyCard}>
            <AppText variant="body" color="textSecondary" center>
              No goals yet. Add one below to start tracking.
            </AppText>
          </Card>
        ) : (
          progress.map((p, i) => (
            <GoalCard
              key={p.goal.id}
              progress={p}
              onRemove={() => removeGoal(p.goal.id)}
              delay={i * 60}
            />
          ))
        )}
      </View>

      {/* New goal builder */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="New goal" />
        <Card>
          <SettingSegment
            icon="options-outline"
            label="Metric"
            options={METRIC_OPTIONS}
            value={metric}
            onChange={handleMetricChange}
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <SettingSegment
            icon="calendar-outline"
            label="Period"
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(value) => {
              selection();
              setPeriod(value);
            }}
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.targetRow}>
            <AppText variant="bodyStrong">Target</AppText>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease target"
                onPress={() => adjustTarget(-STEP[metric])}
                style={[styles.stepBtn, { backgroundColor: theme.colors.surfaceAlt }]}
              >
                <Ionicons name="remove" size={20} color={theme.colors.text} />
              </Pressable>
              <AppText variant="subtitle" style={styles.targetValue}>
                {target}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase target"
                onPress={() => adjustTarget(STEP[metric])}
                style={[styles.stepBtn, { backgroundColor: theme.colors.surfaceAlt }]}
              >
                <Ionicons name="add" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: theme.spacing.lg }}>
            <Button label="Add goal" icon="add-circle-outline" onPress={handleAdd} />
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalTitle: { flexDirection: 'row', alignItems: 'center' },
  goalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  celebrate: { flexDirection: 'row', alignItems: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetValue: { minWidth: 64, textAlign: 'center' },
});
