import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { formatClock } from '@/utils';

import { AppText } from './AppText';

interface TimerProps {
  seconds: number;
  /** Show a pulsing dot to indicate the timer is actively counting. */
  running?: boolean;
  /** Render for placement on a dark overlay (e.g. over the camera). */
  onOverlay?: boolean;
}

/** A large mm:ss clock with a pulsing "live" dot while running. */
export function Timer({ seconds, running, onOverlay }: TimerProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (running) {
      pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    } else {
      pulse.value = withTiming(0);
    }
  }, [running, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.6,
    transform: [{ scale: 0.8 + pulse.value * 0.5 }],
  }));

  const textColor = onOverlay ? theme.colors.onOverlay : theme.colors.text;

  return (
    <View style={styles.row}>
      {running ? (
        <Animated.View style={[styles.dot, { backgroundColor: theme.colors.danger }, dotStyle]} />
      ) : null}
      <AppText variant="hero" style={[styles.clock, { color: textColor }]}>
        {formatClock(seconds)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  clock: { fontVariant: ['tabular-nums'], letterSpacing: 1 },
});
