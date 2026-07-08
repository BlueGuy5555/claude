import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { IconBadge } from './IconBadge';

interface SettingRowProps {
  icon: IconName;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** A labelled toggle row used to render a single boolean setting. */
export function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: SettingRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { paddingVertical: theme.spacing.md }]}>
      <IconBadge name={icon} size={20} containerSize={40} />
      <View style={[styles.text, { marginHorizontal: theme.spacing.md }]}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" color="textMuted" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.colors.surfaceAlt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  description: { marginTop: 2 },
});
