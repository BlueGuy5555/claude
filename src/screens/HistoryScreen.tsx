import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

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

function HistoryRow({ item }: { item: WorkoutHistoryItem }) {
  const theme = useTheme();
  return (
    <Card style={styles.row}>
      <IconBadge name={item.icon} />
      <View style={[styles.rowText, { marginHorizontal: theme.spacing.md }]}>
        <AppText variant="bodyStrong">{item.title}</AppText>
        <AppText variant="caption" color="textMuted" style={styles.rowMeta}>
          {item.relativeDate} · {item.durationLabel}
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
              onPress={() => navigation.navigate('WorkoutSession')}
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
        renderItem={({ item }) => <HistoryRow item={item} />}
        contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.md }}
        showsVerticalScrollIndicator={false}
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
});
