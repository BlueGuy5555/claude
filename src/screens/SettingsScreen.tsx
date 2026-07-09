import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ScreenContainer,
  SectionHeader,
  SettingRow,
  SettingSegment,
} from '@/components';
import { APP } from '@/constants';
import { useSettings, useWorkoutData } from '@/context';
import { useHaptics } from '@/hooks';
import type { ConfidenceLevel, Settings } from '@/types';
import { useTheme } from '@/theme';

interface ToggleConfig {
  key: keyof Settings;
  icon: React.ComponentProps<typeof SettingRow>['icon'];
  label: string;
  description: string;
}

const GENERAL_TOGGLES: ToggleConfig[] = [
  {
    key: 'vibration',
    icon: 'pulse-outline',
    label: 'Vibration',
    description: 'Haptic feedback on taps and on each counted rep',
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

const AI_TOGGLES: ToggleConfig[] = [
  {
    key: 'showSkeleton',
    icon: 'body-outline',
    label: 'Skeleton overlay',
    description: 'Draw the detected pose over the camera',
  },
  {
    key: 'mirrorFrontCamera',
    icon: 'camera-reverse-outline',
    label: 'Mirror front camera',
    description: 'Flip the front-camera preview selfie-style',
  },
  {
    key: 'debugFps',
    icon: 'speedometer-outline',
    label: 'Show FPS',
    description: 'Overlay the processing frame rate (debug)',
  },
];

const CONFIDENCE_OPTIONS: readonly { value: ConfidenceLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSetting } = useSettings();
  const { clear } = useWorkoutData();
  const { selection, notify } = useHaptics();

  const handleToggle = (key: keyof Settings, value: boolean) => {
    selection();
    updateSetting(key, value as Settings[typeof key]);
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
            await clear();
            notify('success');
            Alert.alert('History cleared', 'Your workout history has been deleted.');
          },
        },
      ],
    );
  };

  const renderToggles = (toggles: ToggleConfig[]) =>
    toggles.map((toggle, index) => (
      <View key={toggle.key}>
        {index > 0 ? (
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        ) : null}
        <SettingRow
          icon={toggle.icon}
          label={toggle.label}
          description={toggle.description}
          value={settings[toggle.key] as boolean}
          onValueChange={(value) => handleToggle(toggle.key, value)}
        />
      </View>
    ));

  return (
    <ScreenContainer>
      <SectionHeader title="Preferences" />
      <Card style={styles.group}>{renderToggles(GENERAL_TOGGLES)}</Card>

      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader
          title="Pose detection"
          subtitle="Rep counting runs entirely on-device."
        />
        <Card style={styles.group}>
          {renderToggles(AI_TOGGLES)}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <SettingSegment
            icon="options-outline"
            label="Confidence"
            description="How sure the model must be before trusting a joint"
            options={CONFIDENCE_OPTIONS}
            value={settings.confidence}
            onChange={(value) => {
              selection();
              updateSetting('confidence', value);
            }}
          />
        </Card>
      </View>

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
