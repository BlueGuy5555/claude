import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  IconBadge,
  ScreenContainer,
  SectionHeader,
} from '@/components';
import { BarChart } from '@/charts';
import { useWorkoutData } from '@/context';
import { useSessionDetail } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { useTheme } from '@/theme';
import type { ChartPoint } from '@/types';

/** Effort badge colour by level. */
function effortColor(level: string, theme: ReturnType<typeof useTheme>): string {
  if (level === 'Intense') return theme.colors.danger;
  if (level === 'Moderate') return theme.colors.warning;
  return theme.colors.success;
}

export function SessionDetailScreen({
  route,
  navigation,
}: RootStackScreenProps<'SessionDetail'>) {
  const theme = useTheme();
  const { sessionId } = route.params;
  const { session, detail, isLoading } = useSessionDetail(sessionId);
  const { updateSession } = useWorkoutData();

  const [notes, setNotes] = useState<string>(session?.notes ?? '');
  const [savedNote, setSavedNote] = useState<string>(session?.notes ?? '');

  if (isLoading) {
    return (
      <ScreenContainer scroll={false} style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!session || !detail) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="help-circle-outline"
          title="Workout not found"
          message="This session may have been deleted."
          action={<Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} />}
        />
      </ScreenContainer>
    );
  }

  const paceChart: ChartPoint[] = detail.repPaceSec.map((sec, i) => ({
    label: `${i + 1}`,
    value: sec,
    isoDate: `rep-${i}`,
  }));

  const handleSaveNote = async () => {
    await updateSession(session.id, { notes: notes.trim() || undefined });
    setSavedNote(notes.trim());
  };

  return (
    <ScreenContainer>
      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={styles.hero}>
          <IconBadge name={detail.icon} size={28} containerSize={64} />
          <AppText variant="title" style={{ marginTop: theme.spacing.md }}>
            {detail.title}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {detail.dateLabel}
          </AppText>
          <View
            style={[
              styles.effortBadge,
              { backgroundColor: effortColor(detail.effort, theme) + '22' },
            ]}
          >
            <Ionicons
              name="pulse-outline"
              size={14}
              color={effortColor(detail.effort, theme)}
            />
            <AppText
              variant="caption"
              style={{ color: effortColor(detail.effort, theme), marginLeft: 6 }}
            >
              {detail.effort} effort
            </AppText>
          </View>
        </View>
      </Animated.View>

      {/* Start / finish times */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)}>
        <Card style={[styles.timeCard, { marginTop: theme.spacing.lg }]}>
          <View style={styles.timeCol}>
            <AppText variant="caption" color="textMuted">
              STARTED
            </AppText>
            <AppText variant="bodyStrong" style={{ marginTop: 2 }}>
              {detail.startLabel}
            </AppText>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.textMuted} />
          <View style={styles.timeCol}>
            <AppText variant="caption" color="textMuted">
              FINISHED
            </AppText>
            <AppText variant="bodyStrong" style={{ marginTop: 2 }}>
              {detail.finishLabel}
            </AppText>
          </View>
        </Card>
      </Animated.View>

      {/* Metric grid */}
      <Animated.View
        entering={FadeInDown.delay(120).duration(400)}
        style={{ marginTop: theme.spacing.xl }}
      >
        <View style={styles.metricGrid}>
          {detail.metrics.map((metric) => (
            <Card key={metric.label} style={styles.metricCard}>
              <IconBadge
                name={metric.icon}
                size={18}
                containerSize={36}
                background={theme.colors.primarySoft}
              />
              <AppText variant="subtitle" style={{ marginTop: theme.spacing.sm }}>
                {metric.value}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {metric.label}
              </AppText>
            </Card>
          ))}
        </View>
      </Animated.View>

      {/* Rep pace chart */}
      {paceChart.length >= 2 ? (
        <Animated.View
          entering={FadeInDown.delay(180).duration(400)}
          style={{ marginTop: theme.spacing.xl }}
        >
          <SectionHeader title="Rep pace" subtitle="Seconds between each rep." />
          <Card>
            <BarChart data={paceChart} height={140} labelEvery={Math.ceil(paceChart.length / 12)} />
          </Card>
        </Animated.View>
      ) : null}

      {/* Notes */}
      <Animated.View
        entering={FadeInDown.delay(220).duration(400)}
        style={{ marginTop: theme.spacing.xl }}
      >
        <SectionHeader title="Notes" />
        <Card>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How did this workout feel?"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[styles.notesInput, { color: theme.colors.text }]}
          />
          {notes.trim() !== savedNote ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Button label="Save note" icon="save-outline" onPress={handleSaveNote} />
            </View>
          ) : null}
        </Card>
      </Animated.View>

      {/* Form analysis placeholder */}
      <Animated.View
        entering={FadeInDown.delay(280).duration(400)}
        style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.xl }}
      >
        <SectionHeader
          title="Form analysis"
          subtitle="Coming soon — deeper per-rep form breakdowns."
        />
        <Card style={{ gap: theme.spacing.md }}>
          {detail.formPlaceholders.map((label) => (
            <View key={label} style={styles.placeholderRow}>
              <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textMuted} />
              <AppText variant="body" color="textSecondary" style={{ marginLeft: 10 }}>
                {label}
              </AppText>
            </View>
          ))}
        </Card>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 8 },
  effortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeCol: { alignItems: 'center', flex: 1 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { width: '47%', flexGrow: 1 },
  notesInput: { minHeight: 72, textAlignVertical: 'top', fontSize: 15 },
  placeholderRow: { flexDirection: 'row', alignItems: 'center' },
});
