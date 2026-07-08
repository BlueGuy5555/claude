import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

interface RepCounterProps {
  reps: number;
  label?: string;
  /** Small hint shown under the label, e.g. that reps are simulated. */
  caption?: string;
  /** When provided, the counter becomes tappable to add a rep manually. */
  onPress?: () => void;
  /** Render for placement on a dark overlay (e.g. over the camera). */
  onOverlay?: boolean;
  style?: ViewStyle;
}

/**
 * The headline rep number. It springs briefly each time the count changes,
 * giving tactile-feeling feedback for every (simulated) rep.
 */
export function RepCounter({
  reps,
  label = 'REPS',
  caption,
  onPress,
  onOverlay,
  style,
}: RepCounterProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.12, { duration: 110 }),
      withSpring(1, { damping: 6, stiffness: 180 }),
    );
  }, [reps, scale]);

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const primary = onOverlay ? theme.colors.onOverlay : theme.colors.text;
  const secondary = onOverlay ? theme.colors.onOverlay : theme.colors.textMuted;

  const content = (
    <View style={[styles.container, style]}>
      <Animated.Text
        style={[styles.number, { color: primary }, numberStyle]}
        accessibilityLabel={`${reps} reps`}
      >
        {reps}
      </Animated.Text>
      <AppText variant="caption" style={[styles.label, { color: secondary, opacity: onOverlay ? 0.9 : 1 }]}>
        {label}
      </AppText>
      {caption ? (
        <AppText variant="caption" style={[styles.caption, { color: secondary, opacity: 0.75 }]}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Adds a repetition"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  number: { fontSize: 96, fontWeight: '800', lineHeight: 104, fontVariant: ['tabular-nums'] },
  label: { letterSpacing: 3, marginTop: -4, fontWeight: '700' },
  caption: { marginTop: 6 },
  pressed: { opacity: 0.7 },
});
