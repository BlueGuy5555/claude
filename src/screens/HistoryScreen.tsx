import { Ionicons } from '@expo/vector-icons';
import React, { useLayoutEffect, useState } from 'react';
import { FlatList, Pressable } from 'react-native';

import {
  Button,
  ConfirmationDialog,
  EmptyState,
  HistoryCard,
  LoadingSpinner,
  ScreenContainer,
} from '@/components';
import { useWorkoutHistory } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { toHistoryItem, type WorkoutHistoryItem } from '@/services';
import { useTheme } from '@/theme';

export function HistoryScreen({ navigation }: RootStackScreenProps<'History'>) {
  const theme = useTheme();
  const { history, isLoading, remove, clear } = useWorkoutHistory();
  const [pendingDelete, setPendingDelete] = useState<WorkoutHistoryItem | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const hasHistory = history.length > 0;

  // Show a "clear all" action in the navigation header when there is history.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: hasHistory
        ? () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all workouts"
              hitSlop={8}
              onPress={() => setClearOpen(true)}
            >
              <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, hasHistory, theme.colors.danger]);

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  if (!hasHistory) {
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
        renderItem={({ item }) => (
          <HistoryCard item={item} onDelete={() => setPendingDelete(item)} />
        )}
        contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.md }}
        showsVerticalScrollIndicator={false}
      />

      <ConfirmationDialog
        visible={pendingDelete !== null}
        title="Delete workout?"
        message={
          pendingDelete
            ? `This permanently removes your "${pendingDelete.title}" workout from this device.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) void remove(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmationDialog
        visible={clearOpen}
        title="Clear all history?"
        message="This permanently deletes every saved workout from this device. Your settings are kept."
        confirmLabel="Delete all"
        destructive
        onConfirm={() => {
          void clear();
          setClearOpen(false);
        }}
        onCancel={() => setClearOpen(false)}
      />
    </ScreenContainer>
  );
}
