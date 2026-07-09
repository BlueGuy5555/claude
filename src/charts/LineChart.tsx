import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  ClipPath,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { AppText } from '@/components';
import { useTheme } from '@/theme';
import type { ChartPoint } from '@/types';

import {
  areaPath,
  isEmptySeries,
  linePath,
  niceMax,
  seriesMax,
  toLinePoints,
} from './chartUtils';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface LineChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  labelEvery?: number;
}

const PADDING = { top: 8, bottom: 8 };

/**
 * An animated line chart with a soft gradient area fill. The reveal is a single
 * animated clip rectangle whose width sweeps left-to-right, wiping the line and
 * area into view — cheap, smooth, and independent of the number of points.
 */
export function LineChart({
  data,
  height = 160,
  color,
  showLabels = true,
  labelEvery = 1,
}: LineChartProps) {
  const theme = useTheme();
  const [width, setWidth] = React.useState(0);
  const lineColor = color ?? theme.colors.primary;
  const empty = isEmptySeries(data);

  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(width, { duration: 700 });
  }, [width, data, reveal]);

  const clipProps = useAnimatedProps(() => ({ width: reveal.value }));

  const max = niceMax(seriesMax(data));
  const coords = width > 0 ? toLinePoints(data, width, height, PADDING, max) : [];
  const dLine = linePath(coords);
  const dArea = areaPath(coords, height, PADDING.bottom);

  return (
    <View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lineColor} stopOpacity={0.28} />
                <Stop offset="1" stopColor={lineColor} stopOpacity={0.02} />
              </LinearGradient>
              <ClipPath id="reveal">
                <AnimatedRect x={0} y={0} height={height} animatedProps={clipProps} />
              </ClipPath>
            </Defs>

            {empty ? (
              <Rect
                x={0}
                y={height - PADDING.bottom - 1}
                width={width}
                height={2}
                rx={1}
                fill={theme.colors.border}
              />
            ) : (
              <>
                <Path d={dArea} fill="url(#lineFill)" clipPath="url(#reveal)" />
                <Path
                  d={dLine}
                  stroke={lineColor}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                  clipPath="url(#reveal)"
                />
              </>
            )}
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
