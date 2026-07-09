import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { AppLogo, AppText, Button, Card, IconBadge, ScreenContainer } from '@/components';
import { APP, EXERCISES } from '@/constants';
import { useHaptics } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { loadPreferences, savePreferences } from '@/storage';
import { useTheme } from '@/theme';
import type { ExerciseId } from '@/types';

interface ActionTileProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}

function ActionTile({ icon, title, subtitle, onPress }: ActionTileProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.tile}>
        <IconBadge name={icon} />
        <View style={[styles.tileText, { marginHorizontal: theme.spacing.md }]}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="caption" color="textMuted" style={styles.tileSubtitle}>
            {subtitle}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </Card>
    </Pressable>
  );
}

function ExerciseChip({
  name,
  icon,
  selected,
  onPress,
}: {
  name: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={selected ? theme.colors.onPrimary : theme.colors.primary}
      />
      <AppText
        variant="caption"
        style={{
          marginTop: 6,
          color: selected ? theme.colors.onPrimary : theme.colors.text,
        }}
      >
        {name}
      </AppText>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: RootStackScreenProps<'Home'>) {
  const theme = useTheme();
  const { selection } = useHaptics();
  const [selected, setSelected] = useState<ExerciseId>(EXERCISES[0]!.id);

  // Restore the exercise chosen last time.
  useEffect(() => {
    let cancelled = false;
    loadPreferences().then((prefs) => {
      if (!cancelled && prefs.lastExerciseId) setSelected(prefs.lastExerciseId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = () => {
    void savePreferences({
      lastExerciseId: selected,
      hasCompletedOnboarding: true,
      units: 'metric',
    });
    navigation.navigate('WorkoutSession', { exerciseId: selected });
  };

  const tiles: ActionTileProps[] = [
    {
      icon: 'time-outline',
      title: 'History',
      subtitle: 'Review your past workouts',
      onPress: () => navigation.navigate('History'),
    },
    {
      icon: 'stats-chart-outline',
      title: 'Statistics',
      subtitle: 'Track your progress over time',
      onPress: () => navigation.navigate('Statistics'),
    },
    {
      icon: 'settings-outline',
      title: 'Settings',
      subtitle: 'Vibration, sound, appearance and AI',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScreenContainer>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.hero}>
        <AppLogo size={88} />
        <AppText variant="hero" style={{ marginTop: theme.spacing.lg }}>
          {APP.name}
        </AppText>
        <AppText variant="body" color="textSecondary" center style={styles.tagline}>
          {APP.tagline} — your data never leaves this device.
        </AppText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(120).duration(500)}
        style={{ marginTop: theme.spacing.xxl }}
      >
        <AppText variant="subtitle" style={{ marginBottom: theme.spacing.md }}>
          Choose an exercise
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.xl }}
        >
          {EXERCISES.map((exercise) => (
            <ExerciseChip
              key={exercise.id}
              name={exercise.name}
              icon={exercise.icon}
              selected={exercise.id === selected}
              onPress={() => {
                selection();
                setSelected(exercise.id);
              }}
            />
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).duration(500)}
        style={{ marginTop: theme.spacing.xl }}
      >
        <Button label="Start Workout" icon="barbell-outline" size="lg" onPress={handleStart} />
      </Animated.View>

      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
        {tiles.map((tile, index) => (
          <Animated.View
            key={tile.title}
            entering={FadeInDown.delay(280 + index * 80).duration(500)}
          >
            <ActionTile {...tile} />
          </Animated.View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 24 },
  tagline: { marginTop: 8, maxWidth: 300 },
  tile: { flexDirection: 'row', alignItems: 'center' },
  tileText: { flex: 1 },
  tileSubtitle: { marginTop: 2 },
  chip: {
    width: 92,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.85 },
});
