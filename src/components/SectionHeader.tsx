import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

/** A title + optional subtitle used to introduce a section of a screen. */
export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <AppText variant="subtitle">{title}</AppText>
      {subtitle ? (
        <AppText variant="body" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 2 },
});
