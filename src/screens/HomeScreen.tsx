import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import {
  AppText,
  Button,
  Card,
  ConfirmationDialog,
  HistoryCard,
  IconBadge,
  ScreenContainer,
  SectionHeader,
  StatisticCard,
} from '@/components';
import { useSettings } from '@/context';
import { useActiveSession, useWorkoutHistory } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { computeStatistics, sessionTitle, toHistoryItem } from '@/services';
import { useTheme } from '@/theme';
import { formatClock, formatEnergy, formatNumber, isToday } from '@/utils';

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Small round icon button used in the header. */
function HeaderButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.text} />
    </Pressable>
  );
}

export function HomeScreen({ navigation }: RootStackScreenProps<'Home'>) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { history } = useWorkoutHistory();
  const { activeSession, discard } = useActiveSession();
  const [discardOpen, setDiscardOpen] = useState(false);

  const stats = useMemo(() => computeStatistics(history), [history]);

  // Today's headline numbers, derived from history.
  const today = useMemo(() => {
    const sessions = history.filter((s) => isToday(s.startedAt));
    return {
      workouts: sessions.length,
      reps: sessions.reduce((sum, s) => sum + s.totalReps, 0),
      calories: sessions.reduce((sum, s) => sum + s.calories, 0),
    };
  }, [history]);

  const recent = history[0];

  return (
    <ScreenContainer>
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="body" color="textSecondary">
            {greeting(new Date())}
          </AppText>
          <AppText variant="headline">Ready to move?</AppText>
        </View>
        <View style={styles.headerActions}>
          <HeaderButton
            icon="stats-chart-outline"
            accessibilityLabel="Statistics"
            onPress={() => navigation.navigate('Statistics')}
          />
          <HeaderButton
            icon="settings-outline"
            accessibilityLabel="Settings"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </Animated.View>

      {/* Continue in-progress workout */}
      {activeSession ? (
        <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: theme.spacing.lg }}>
          <Card style={[styles.continueCard, { borderColor: theme.colors.primary }]}>
            <View style={styles.continueTop}>
              <IconBadge name="play-circle-outline" />
              <View style={styles.continueText}>
                <AppText variant="bodyStrong">{sessionTitle(activeSession)} in progress</AppText>
                <AppText variant="caption" color="textMuted">
                  {formatNumber(activeSession.totalReps)} reps · {formatClock(activeSession.durationSec)}
                </AppText>
              </View>
            </View>
            <Button
              label="Resume workout"
              icon="play"
              onPress={() => navigation.navigate('WorkoutSession', { resume: true })}
              style={{ marginTop: theme.spacing.md }}
            />
            <Button
              label="Discard"
              variant="ghost"
              danger
              onPress={() => setDiscardOpen(true)}
              style={{ marginTop: theme.spacing.sm }}
            />
          </Card>
        </Animated.View>
      ) : null}

      {/* Quick start */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(400)}
        style={{ marginTop: theme.spacing.lg }}
      >
        <Button
          label={activeSession ? 'Start a new workout' : 'Quick start workout'}
          icon="barbell-outline"
          size="lg"
          onPress={() => navigation.navigate('WorkoutSession')}
        />
      </Animated.View>

      {/* Today */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(400)}
        style={{ marginTop: theme.spacing.xl }}
      >
        <SectionHeader
          title="Today"
          subtitle={
            today.workouts > 0
              ? 'Nice work — here is what you have done today.'
              : 'No workouts yet today. Your first session is one tap away.'
          }
        />
        <View style={[styles.statRow, { gap: theme.spacing.md }]}>
          <StatisticCard icon="barbell-outline" label="Workouts" value={formatNumber(today.workouts)} />
          <StatisticCard icon="repeat-outline" label="Reps" value={formatNumber(today.reps)} />
          <StatisticCard
            icon="flame-outline"
            label="Energy"
            value={formatEnergy(today.calories, settings.units)}
            tint={theme.colors.warning}
          />
        </View>
      </Animated.View>

      {/* Recent */}
      {recent ? (
        <Animated.View
          entering={FadeInDown.delay(240).duration(400)}
          style={{ marginTop: theme.spacing.xl }}
        >
          <View style={styles.recentHeader}>
            <AppText variant="subtitle">Recent workout</AppText>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => navigation.navigate('History')}
            >
              <AppText variant="caption" color="primary">
                See all
              </AppText>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('History')}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <HistoryCard item={toHistoryItem(recent)} />
          </Pressable>
          {stats.currentStreakDays > 0 ? (
            <View style={styles.streak}>
              <Ionicons name="flame" size={16} color={theme.colors.warning} />
              <AppText variant="caption" color="textSecondary" style={{ marginLeft: 6 }}>
                {stats.currentStreakDays}-day streak · keep it going!
              </AppText>
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      <ConfirmationDialog
        visible={discardOpen}
        title="Discard workout?"
        message="This ends your in-progress session without saving it to history."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          void discard();
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  headerText: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  continueCard: { borderWidth: 1 },
  continueTop: { flexDirection: 'row', alignItems: 'center' },
  continueText: { flex: 1, marginLeft: 12 },
  statRow: { flexDirection: 'row' },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  streak: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  pressed: { opacity: 0.85 },
});
