import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  IconBadge,
  ScreenContainer,
} from '@/components';
import { getExercise } from '@/constants';
import type { RootStackScreenProps } from '@/navigation';
import { loadHistory } from '@/storage';
import type { WorkoutSession } from '@/types';
import { useTheme } from '@/theme';
import { formatCalories, formatClock, formatDuration, formatPercent } from '@/utils';

export function WorkoutSummaryScreen({
  navigation,
  route,
}: RootStackScreenProps<'WorkoutSummary'>) {
  const theme = useTheme();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadHistory().then((history) => {
      if (cancelled) return;
      setSession(history.find((s) => s.id === route.params.sessionId) ?? null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [route.params.sessionId]);

  if (isLoading) {
    return (
      <ScreenContainer scroll={false} style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!session) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="alert-circle-outline"
          title="Workout not found"
          message="We couldn't load this workout summary, but your history is safe."
          action={<Button label="Go home" onPress={() => navigation.popToTop()} />}
        />
      </ScreenContainer>
    );
  }

  const primary = session.sets[0]?.exerciseId ?? 'squat';
  const exercise = getExercise(primary);
  const isTimed = exercise.kind === 'timed';

  const metrics: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }[] = [
    {
      icon: isTimed ? 'timer-outline' : 'repeat-outline',
      label: isTimed ? 'Hold' : 'Reps',
      value: isTimed ? formatClock(session.totalReps) : String(session.totalReps),
    },
    { icon: 'time-outline', label: 'Duration', value: formatDuration(session.durationSec) },
    { icon: 'flame-outline', label: 'Calories', value: formatCalories(session.calories) },
    {
      icon: 'pulse-outline',
      label: 'Avg confidence',
      value: formatPercent(session.avgConfidence),
    },
  ];

  return (
    <ScreenContainer>
      <Animated.View entering={FadeInUp.duration(450)} style={styles.hero}>
        <IconBadge name="trophy-outline" size={38} containerSize={84} color={theme.colors.accent} />
        <AppText variant="headline" style={{ marginTop: theme.spacing.lg }}>
          Workout complete
        </AppText>
        <AppText variant="body" color="textSecondary" center style={styles.subtitle}>
          Nice work — here is how your {exercise.name.toLowerCase()} session went.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.grid}>
        {metrics.map((metric) => (
          <Card key={metric.label} style={styles.metricCard}>
            <IconBadge name={metric.icon} size={20} containerSize={40} />
            <AppText variant="headline" style={{ marginTop: theme.spacing.sm }}>
              {metric.value}
            </AppText>
            <AppText variant="caption" color="textMuted" style={styles.metricLabel}>
              {metric.label.toUpperCase()}
            </AppText>
          </Card>
        ))}
      </Animated.View>

      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
        <Button
          label="New workout"
          icon="barbell-outline"
          onPress={() => navigation.replace('WorkoutSession', { exerciseId: primary })}
        />
        <Button label="Done" variant="ghost" onPress={() => navigation.popToTop()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 16 },
  subtitle: { marginTop: 8, maxWidth: 300 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 32 },
  metricCard: { flexBasis: '47%', flexGrow: 1 },
  metricLabel: { marginTop: 2, letterSpacing: 0.5 },
});
