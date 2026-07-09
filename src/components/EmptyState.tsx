import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { IconBadge } from './IconBadge';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  /** Optional call-to-action rendered below the message. */
  action?: React.ReactNode;
}

/** Friendly placeholder shown when a screen has no data to display yet. */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <IconBadge
        name={icon}
        size={34}
        containerSize={80}
        background={theme.colors.surfaceAlt}
        color={theme.colors.textMuted}
      />
      <AppText variant="title" center style={{ marginTop: theme.spacing.lg }}>
        {title}
      </AppText>
      <AppText
        variant="body"
        color="textSecondary"
        center
        style={{ marginTop: theme.spacing.sm, maxWidth: 300 }}
      >
        {message}
      </AppText>
      {action ? <View style={{ marginTop: theme.spacing.xl }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});
