import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  ConfirmationDialog,
  ScreenContainer,
  SectionHeader,
  SegmentedControl,
  SettingRow,
  type SegmentOption,
} from '@/components';
import { APP } from '@/constants';
import { useSettings } from '@/context';
import { useHaptics } from '@/hooks';
import { clearAll } from '@/storage';
import { useTheme } from '@/theme';
import type { ThemeMode, Units } from '@/types';

const THEME_OPTIONS: readonly SegmentOption<ThemeMode>[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

const UNIT_OPTIONS: readonly SegmentOption<Units>[] = [
  { value: 'metric', label: 'Metric · kJ' },
  { value: 'imperial', label: 'Imperial · kcal' },
];

export function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { selection, notify } = useHaptics();
  const [resetOpen, setResetOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const handleReset = () => {
    resetSettings();
    notify('success');
    setResetOpen(false);
  };

  const handleClearAll = async () => {
    await clearAll();
    resetSettings();
    notify('success');
    setClearOpen(false);
  };

  return (
    <ScreenContainer>
      {/* Appearance */}
      <SectionHeader title="Appearance" />
      <Card>
        <AppText variant="bodyStrong">Theme</AppText>
        <AppText variant="caption" color="textMuted" style={styles.hint}>
          Choose light, dark, or match your device.
        </AppText>
        <SegmentedControl
          options={THEME_OPTIONS}
          value={settings.themeMode}
          onChange={(value) => updateSetting('themeMode', value)}
          style={{ marginTop: theme.spacing.md }}
        />
      </Card>

      {/* Feedback */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Feedback" />
        <Card style={styles.group}>
          <SettingRow
            icon="pulse-outline"
            label="Haptic feedback"
            description="Vibrate when you tap controls and count reps"
            value={settings.vibration}
            onValueChange={(value) => {
              selection();
              updateSetting('vibration', value);
            }}
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <SettingRow
            icon="volume-high-outline"
            label="Sound"
            description="Play sound effects during workouts"
            value={settings.sound}
            onValueChange={(value) => {
              selection();
              updateSetting('sound', value);
            }}
          />
        </Card>
      </View>

      {/* Units */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Units" />
        <Card>
          <AppText variant="bodyStrong">Measurement units</AppText>
          <AppText variant="caption" color="textMuted" style={styles.hint}>
            Energy is shown in kilojoules (metric) or kilocalories (imperial).
          </AppText>
          <SegmentedControl
            options={UNIT_OPTIONS}
            value={settings.units}
            onChange={(value) => updateSetting('units', value)}
            style={{ marginTop: theme.spacing.md }}
          />
        </Card>
      </View>

      {/* Data */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader
          title="Data"
          subtitle="Everything is stored locally and never leaves this device."
        />
        <Card style={styles.group}>
          <SettingRow
            icon="refresh-outline"
            label="Reset settings"
            description="Restore appearance, feedback, and units to defaults"
            onPress={() => setResetOpen(true)}
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <SettingRow
            icon="trash-outline"
            label="Clear all data"
            description="Delete every workout and reset all settings"
            danger
            onPress={() => setClearOpen(true)}
          />
        </Card>
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color="textMuted" center>
          {APP.name} · Version {APP.version}
        </AppText>
        <AppText variant="caption" color="textMuted" center style={styles.footerHint}>
          Offline-first · No account required
        </AppText>
      </View>

      <ConfirmationDialog
        visible={resetOpen}
        title="Reset settings?"
        message="This restores appearance, feedback, and units to their defaults. Your workout history is kept."
        confirmLabel="Reset"
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />

      <ConfirmationDialog
        visible={clearOpen}
        title="Clear all data?"
        message="This permanently deletes every saved workout and resets all settings on this device. This cannot be undone."
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => void handleClearAll()}
        onCancel={() => setClearOpen(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  group: { paddingVertical: 0 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  hint: { marginTop: 2 },
  footer: { marginTop: 40, alignItems: 'center' },
  footerHint: { marginTop: 2 },
});
