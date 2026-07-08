import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ScreenContainer,
  SectionHeader,
  SettingRow,
} from '@/components';
import { APP } from '@/constants';
import { useSettings } from '@/context';
import { useHaptics } from '@/hooks';
import { clearHistory } from '@/storage';
import type { Settings } from '@/types';
import { useTheme } from '@/theme';

interface ToggleConfig {
  key: keyof Settings;
  icon: React.ComponentProps<typeof SettingRow>['icon'];
  label: string;
  description: string;
}

const TOGGLES: ToggleConfig[] = [
  {
    key: 'vibration',
    icon: 'pulse-outline',
    label: 'Vibration',
    description: 'Haptic feedback when you tap controls',
  },
  {
    key: 'sound',
    icon: 'volume-high-outline',
    label: 'Sound',
    description: 'Play sound effects during workouts',
  },
  {
    key: 'darkMode',
    icon: 'moon-outline',
    label: 'Dark mode',
    description: 'Use the dark color theme',
  },
];

export function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSetting } = useSettings();
  const { selection, notify } = useHaptics();

  const handleToggle = (key: keyof Settings, value: boolean) => {
    selection();
    updateSetting(key, value);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear workout history?',
      'This permanently deletes all saved workouts from this device. Your settings are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            notify('success');
            Alert.alert('History cleared', 'Your workout history has been deleted.');
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <SectionHeader title="Preferences" />
      <Card style={styles.group}>
        {TOGGLES.map((toggle, index) => (
          <View key={toggle.key}>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            ) : null}
            <SettingRow
              icon={toggle.icon}
              label={toggle.label}
              description={toggle.description}
              value={settings[toggle.key]}
              onValueChange={(value) => handleToggle(toggle.key, value)}
            />
          </View>
        ))}
      </Card>

      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader
          title="Data"
          subtitle="Everything is stored locally and never leaves this device."
        />
        <Button
          label="Clear workout history"
          icon="trash-outline"
          variant="ghost"
          onPress={handleClearHistory}
        />
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color="textMuted" center>
          {APP.name} · Version {APP.version}
        </AppText>
        <AppText variant="caption" color="textMuted" center style={styles.footerHint}>
          Offline-first · No account required
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  group: { paddingVertical: 0 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  footer: { marginTop: 40, alignItems: 'center' },
  footerHint: { marginTop: 2 },
});
