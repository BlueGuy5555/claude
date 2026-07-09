import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

interface ProgressBarProps {
  /** Progress in `[0, 1]`. */
  fraction: number;
  color?: string;
  trackColor?: string;
  height?: number;
  delay?: number;
}

/**
 * A rounded, animated progress bar. The fill width eases to its target on the
 * UI thread, so it animates smoothly the first time a goal renders and again
 * whenever progress changes.
 */
export function ProgressBar({
  fraction,
  color,
  trackColor,
  height = 10,
  delay = 0,
}: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, fraction));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(clamped, { duration: 700 }));
  }, [clamped, delay, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? theme.colors.surfaceAlt,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { borderRadius: height / 2, backgroundColor: color ?? theme.colors.primary },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
