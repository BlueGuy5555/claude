import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useSettings } from '@/context';
import { exerciseIcon, exerciseName, sessionTitle } from '@/services';
import { useTheme } from '@/theme';
import type { WorkoutSession } from '@/types';
import { formatDuration, formatEnergy, formatNumber } from '@/utils';

import { AppText } from './AppText';
import { Card } from './Card';
import { IconBadge } from './IconBadge';

interface WorkoutSummaryProps {
  session: WorkoutSession;
}

interface MetricProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}

function Metric({ icon, value, label }: MetricProps) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <AppText variant="title" style={{ marginTop: theme.spacing.xs }}>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

/** A read-only recap of a completed session: headline metrics + breakdown. */
export function WorkoutSummary({ session }: WorkoutSummaryProps) {
  const theme = useTheme();
  const { settings } = useSettings();

  return (
    <View>
      <Card>
        <AppText variant="subtitle">{sessionTitle(session)}</AppText>
        <View style={[styles.metrics, { marginTop: theme.spacing.lg }]}>
          <Metric icon="repeat-outline" value={formatNumber(session.totalReps)} label="Reps" />
          <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
          <Metric icon="time-outline" value={formatDuration(session.durationSec)} label="Duration" />
          <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
          <Metric
            icon="flame-outline"
            value={formatEnergy(session.calories, settings.units)}
            label="Energy"
          />
        </View>
      </Card>

      {session.sets.length > 0 ? (
        <Card style={{ marginTop: theme.spacing.md }}>
          <AppText variant="caption" color="textMuted" style={styles.breakdownTitle}>
            EXERCISES
          </AppText>
          {session.sets.map((set, index) => (
            <View
              key={set.exerciseId}
              style={[
                styles.setRow,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.border,
                },
              ]}
            >
              <IconBadge name={exerciseIcon(set.exerciseId)} size={18} containerSize={36} />
              <AppText variant="body" style={{ flex: 1, marginHorizontal: theme.spacing.md }}>
                {exerciseName(set.exerciseId)}
              </AppText>
              <AppText variant="bodyStrong" color="primary">
                {formatNumber(set.reps)} reps
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center' },
  separator: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  breakdownTitle: { letterSpacing: 0.5, marginBottom: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
});
