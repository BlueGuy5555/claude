import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { IconBadge } from './IconBadge';

interface SettingRowProps {
  icon: IconName;
  label: string;
  description?: string;
  /** When provided, renders a trailing Switch bound to this value. */
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  /** When provided (and no `value`), the whole row is tappable. */
  onPress?: () => void;
  /** Custom trailing accessory (takes precedence over the auto chevron). */
  right?: React.ReactNode;
  /** Style the icon and label in a destructive (red) tone. */
  danger?: boolean;
}

/**
 * A single settings row. Renders as a toggle when `value` is supplied, an
 * actionable row when `onPress` is supplied, or a plain labelled row otherwise.
 */
export function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  onPress,
  right,
  danger,
}: SettingRowProps) {
  const theme = useTheme();
  const isToggle = value !== undefined;
  const tint = danger ? theme.colors.danger : theme.colors.primary;

  const body = (
    <>
      <IconBadge
        name={icon}
        size={20}
        containerSize={40}
        color={tint}
        background={danger ? theme.colors.surfaceAlt : theme.colors.primarySoft}
      />
      <View style={[styles.text, { marginHorizontal: theme.spacing.md }]}>
        <AppText variant="bodyStrong" style={danger ? { color: theme.colors.danger } : undefined}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" color="textMuted" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>

      {isToggle ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={theme.colors.surfaceAlt}
        />
      ) : (
        (right ?? (onPress ? (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        ) : null))
      )}
    </>
  );

  if (onPress && !isToggle) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { paddingVertical: theme.spacing.md },
          pressed && styles.pressed,
        ]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={[styles.row, { paddingVertical: theme.spacing.md }]}>{body}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  description: { marginTop: 2 },
  pressed: { opacity: 0.6 },
});
