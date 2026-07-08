import React from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { Card } from './Card';
import { IconBadge } from './IconBadge';

interface StatCardProps {
  icon: IconName;
  label: string;
  value: string;
  /** Optional accent color for the icon badge. */
  tint?: string;
}

/** Compact card showing a single headline metric (icon + value + label). */
export function StatCard({ icon, label, value, tint }: StatCardProps) {
  const theme = useTheme();
  return (
    <Card style={styles.card}>
      <IconBadge
        name={icon}
        size={20}
        containerSize={40}
        color={tint ?? theme.colors.primary}
        background={theme.colors.primarySoft}
      />
      <AppText variant="headline" style={{ marginTop: theme.spacing.md }}>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted" style={styles.label}>
        {label.toUpperCase()}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  label: { marginTop: 2, letterSpacing: 0.5 },
});
