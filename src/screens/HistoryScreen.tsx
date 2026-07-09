import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  IconBadge,
  ScreenContainer,
} from '@/components';
import { useWorkoutHistory } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { toHistoryItem, type WorkoutHistoryItem } from '@/services';
import { useTheme } from '@/theme';

function HistoryRow({
  item,
  onPress,
}: {
  item: WorkoutHistoryItem;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.row}>
        <IconBadge name={item.icon} />
        <View style={[styles.rowText, { marginHorizontal: theme.spacing.md }]}>
          <AppText variant="bodyStrong">{item.title}</AppText>
          <AppText variant="caption" color="textMuted" style={styles.rowMeta}>
            {item.relativeDate} · {item.timeLabel} · {item.durationLabel}
            {item.caloriesLabel ? ` · ${item.caloriesLabel}` : ''}
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
      </Card>
    </Pressable>
  );
}

export function HistoryScreen({ navigation }: RootStackScreenProps<'History'>) {
  const theme = useTheme();
  const { history, isLoading } = useWorkoutHistory();

  if (isLoading) {
    return (
      <ScreenContainer scroll={false} style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (history.length === 0) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="time-outline"
          title="No workouts yet"
          message="Completed workouts will appear here. Start your first session to begin building your history."
          action={
            <Button
              label="Start a workout"
              icon="barbell-outline"
              onPress={() => navigation.navigate('Home')}
            />
          }
        />
      </ScreenContainer>
    );
  }

  const items = history.map(toHistoryItem);

  return (
    <ScreenContainer scroll={false} padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryRow
            item={item}
            onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
          />
        )}
        contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.md }}
        showsVerticalScrollIndicator={false}
        // Perf: even thousands of rows stay smooth by windowing aggressively.
        initialNumToRender={12}
        windowSize={11}
        removeClippedSubviews
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1 },
  rowMeta: { marginTop: 2 },
  reps: { alignItems: 'center', minWidth: 44 },
  pressed: { opacity: 0.85 },
});
