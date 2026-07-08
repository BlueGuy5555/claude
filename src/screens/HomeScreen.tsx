import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { AppLogo, AppText, Button, Card, IconBadge, ScreenContainer } from '@/components';
import { APP } from '@/constants';
import type { RootStackScreenProps } from '@/navigation';
import { useTheme } from '@/theme';

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

export function HomeScreen({ navigation }: RootStackScreenProps<'Home'>) {
  const theme = useTheme();

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
      subtitle: 'Vibration, sound and appearance',
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
        <Button
          label="Start Workout"
          icon="barbell-outline"
          size="lg"
          onPress={() => navigation.navigate('WorkoutSession')}
        />
      </Animated.View>

      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
        {tiles.map((tile, index) => (
          <Animated.View
            key={tile.title}
            entering={FadeInDown.delay(200 + index * 80).duration(500)}
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
  pressed: { opacity: 0.85 },
});
