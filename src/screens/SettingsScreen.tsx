import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ScreenContainer,
  SectionHeader,
  SegmentedControl,
  SettingRow,
  type SegmentOption,
} from '@/components';
import { APP } from '@/constants';
import { useSettings } from '@/context';
import { useHaptics } from '@/hooks';
import { clearHistory } from '@/storage';
import type { Handedness, ThemePreference } from '@/types';
import { useTheme } from '@/theme';

interface ToggleConfig {
  key: 'showSkeleton' | 'cameraMirror' | 'vibration' | 'sound' | 'showFps';
  icon: React.ComponentProps<typeof SettingRow>['icon'];
  label: string;
  description: string;
}

const THEME_OPTIONS: readonly SegmentOption<ThemePreference>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const HAND_OPTIONS: readonly SegmentOption<Handedness>[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

type ConfidenceLevel = 'low' | 'medium' | 'high';
const CONFIDENCE_OPTIONS: readonly SegmentOption<ConfidenceLevel>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];
const CONFIDENCE_VALUE: Record<ConfidenceLevel, number> = { low: 0.2, medium: 0.3, high: 0.5 };
const levelFromValue = (value: number): ConfidenceLevel =>
  value <= 0.2 ? 'low' : value >= 0.5 ? 'high' : 'medium';

export function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSetting } = useSettings();
  const { selection, notify } = useHaptics();

  const toggle = (key: ToggleConfig['key'], value: boolean) => {
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

  const renderToggles = (items: ToggleConfig[]) => (
    <Card style={styles.group}>
      {items.map((item, index) => (
        <View key={item.key}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          ) : null}
          <SettingRow
            icon={item.icon}
            label={item.label}
            description={item.description}
            value={settings[item.key]}
            onValueChange={(value) => toggle(item.key, value)}
          />
        </View>
      ))}
    </Card>
  );

  return (
    <ScreenContainer>
      <SectionHeader title="Workout" subtitle="How rep detection behaves on the camera screen." />
      {renderToggles([
        {
          key: 'showSkeleton',
          icon: 'body-outline',
          label: 'Show skeleton',
          description: 'Draw the detected pose over the camera',
        },
        {
          key: 'cameraMirror',
          icon: 'camera-reverse-outline',
          label: 'Mirror front camera',
          description: 'Flip the preview like a mirror',
        },
      ])}

      <ChoiceRow
        title="Preferred side"
        description="Used when both sides of your body are visible."
      >
        <SegmentedControl
          accessibilityLabel="Preferred side"
          options={HAND_OPTIONS}
          value={settings.handedness}
          onChange={(value) => {
            selection();
            updateSetting('handedness', value);
          }}
        />
      </ChoiceRow>

      <ChoiceRow
        title="Detection sensitivity"
        description="Higher requires clearer keypoints — fewer false reps, more dropouts."
      >
        <SegmentedControl
          accessibilityLabel="Detection sensitivity"
          options={CONFIDENCE_OPTIONS}
          value={levelFromValue(settings.confidenceThreshold)}
          onChange={(value) => {
            selection();
            updateSetting('confidenceThreshold', CONFIDENCE_VALUE[value]);
          }}
        />
      </ChoiceRow>

      <View style={styles.section}>
        <SectionHeader title="Feedback" />
        {renderToggles([
          {
            key: 'vibration',
            icon: 'pulse-outline',
            label: 'Vibration',
            description: 'Haptics on reps and controls',
          },
          {
            key: 'sound',
            icon: 'volume-high-outline',
            label: 'Sound',
            description: 'Audible cues during workouts',
          },
        ])}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Appearance" />
        <ChoiceRow title="Theme" description="Match the system or force a palette.">
          <SegmentedControl
            accessibilityLabel="Theme"
            options={THEME_OPTIONS}
            value={settings.theme}
            onChange={(value) => {
              selection();
              updateSetting('theme', value);
            }}
          />
        </ChoiceRow>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Advanced" />
        {renderToggles([
          {
            key: 'showFps',
            icon: 'speedometer-outline',
            label: 'Debug overlay',
            description: 'Show FPS and live confidence',
          },
        ])}
      </View>

      <View style={styles.section}>
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

function ChoiceRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <AppText variant="bodyStrong">{title}</AppText>
      {description ? (
        <AppText variant="caption" color="textMuted" style={styles.choiceDescription}>
          {description}
        </AppText>
      ) : null}
      <View style={{ marginTop: theme.spacing.sm }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { paddingVertical: 0 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  section: { marginTop: 24 },
  choiceDescription: { marginTop: 2 },
  footer: { marginTop: 40, alignItems: 'center' },
  footerHint: { marginTop: 2 },
});
