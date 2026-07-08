import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { WorkoutPhase } from '@/types';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

const PHASE_LABEL: Record<WorkoutPhase, string> = {
  idle: 'Ready',
  top: 'Top',
  descending: 'Down',
  bottom: 'Bottom',
  ascending: 'Up',
  hold: 'Hold',
  broken: 'Reset',
};

interface PhasePillProps {
  phase: WorkoutPhase;
}

/** A colored pill showing the current rep phase (Top, Down, Bottom, …). */
export function PhasePill({ phase }: PhasePillProps) {
  const theme = useTheme();
  const color =
    phase === 'bottom' || phase === 'hold'
      ? theme.colors.accent
      : phase === 'broken'
        ? theme.colors.warning
        : theme.colors.primary;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Phase: ${PHASE_LABEL[phase]}`}
      style={[styles.pill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="bodyStrong" color="onOverlay">
        {PHASE_LABEL[phase]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
});
