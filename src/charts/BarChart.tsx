import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { AppText } from '@/components';
import { useTheme } from '@/theme';
import type { ChartPoint } from '@/types';

import { isEmptySeries, niceMax, seriesMax } from './chartUtils';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface BarChartProps {
  data: ChartPoint[];
  /** Plot height in px (excludes the label row). */
  height?: number;
  color?: string;
  /** Show the x-axis label under each bar. */
  showLabels?: boolean;
  /** Only render every Nth label to avoid crowding. */
  labelEvery?: number;
}

/** A single animated bar; grows from the baseline on mount / value change. */
function Bar({
  x,
  width,
  value,
  max,
  plotHeight,
  color,
  radius,
  delay,
}: {
  x: number;
  width: number;
  value: number;
  max: number;
  plotHeight: number;
  color: string;
  radius: number;
  delay: number;
}) {
  const target = max > 0 ? (value / max) * plotHeight : 0;
  const h = useSharedValue(0);

  useEffect(() => {
    h.value = withDelay(delay, withTiming(target, { duration: 550 }));
  }, [target, delay, h]);

  const y = useDerivedValue(() => plotHeight - h.value);
  const animatedProps = useAnimatedProps(() => ({ height: h.value, y: y.value }));

  return (
    <AnimatedRect
      x={x}
      width={width}
      rx={radius}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

/**
 * A grouped, animated bar chart. Bars grow from the baseline in a quick stagger
 * when the data first appears (or changes), giving the "charts animate smoothly"
 * feel without any per-frame JS work — everything runs on the UI thread via
 * Reanimated's `useAnimatedProps`.
 */
export function BarChart({
  data,
  height = 160,
  color,
  showLabels = true,
  labelEvery = 1,
}: BarChartProps) {
  const theme = useTheme();
  const [width, setWidth] = React.useState(0);
  const barColor = color ?? theme.colors.primary;

  const max = niceMax(seriesMax(data));
  const empty = isEmptySeries(data);
  const count = Math.max(1, data.length);
  const gap = count > 20 ? 2 : count > 10 ? 4 : 8;
  const barWidth = width > 0 ? Math.max(2, (width - gap * (count - 1)) / count) : 0;

  return (
    <View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {/* Baseline track so an all-zero series still reads as a chart. */}
            <Rect
              x={0}
              y={height - 2}
              width={width}
              height={2}
              rx={1}
              fill={theme.colors.border}
            />
            {data.map((point, i) => (
              <Bar
                key={point.isoDate}
                x={i * (barWidth + gap)}
                width={barWidth}
                value={point.value}
                max={max}
                plotHeight={height}
                color={empty ? theme.colors.border : barColor}
                radius={Math.min(4, barWidth / 2)}
                delay={i * 25}
              />
            ))}
          </Svg>
        ) : null}
      </View>

      {showLabels ? (
        <View style={[styles.labels, { width }]}>
          {data.map((point, i) => (
            <AppText
              key={point.isoDate}
              variant="caption"
              color="textMuted"
              style={styles.label}
            >
              {i % labelEvery === 0 ? point.label : ''}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: 10 },
});
