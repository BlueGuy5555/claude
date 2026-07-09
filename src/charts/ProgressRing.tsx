import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components';
import { useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** Progress in `[0, 1]`. */
  fraction: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Text rendered in the middle of the ring (e.g. "72%"). */
  centerLabel?: string;
}

/**
 * A circular progress ring. The arc is drawn by animating the stroke dash
 * offset from "empty" to the target fraction, which sweeps the ring clockwise
 * from 12 o'clock.
 */
export function ProgressRing({
  fraction,
  size = 96,
  strokeWidth = 10,
  color,
  trackColor,
  centerLabel,
}: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, fraction));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 800 });
  }, [clamped, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? theme.colors.surfaceAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? theme.colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Start the sweep at 12 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {centerLabel ? (
        <View style={styles.center} pointerEvents="none">
          <AppText variant="bodyStrong">{centerLabel}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
