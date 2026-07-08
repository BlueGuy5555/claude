import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { KEYPOINT_INDEX, POSE_CONNECTIONS, type Pose } from '@/types';
import { useTheme } from '@/theme';

interface PoseSkeletonOverlayProps {
  pose: Pose | null;
  /** Layout size of the camera area the skeleton is drawn over. */
  width: number;
  height: number;
  /** Mirror horizontally to match a mirrored (front-camera) preview. */
  mirror?: boolean;
  /** Joints below this confidence are not drawn. */
  threshold?: number;
}

/**
 * Draws the detected skeleton over the camera feed. Keypoints are in normalized
 * `[0, 1]` space, so this scales them to the on-screen camera size; low-
 * confidence joints (and any bone touching one) are simply skipped, which is
 * what makes brief dropouts look like a flicker rather than a glitch.
 *
 * Memoized so it only re-renders when its props actually change.
 */
function PoseSkeletonOverlayImpl({
  pose,
  width,
  height,
  mirror = false,
  threshold = 0.3,
}: PoseSkeletonOverlayProps) {
  const theme = useTheme();
  if (!pose) return null;

  const px = (x: number) => (mirror ? (1 - x) * width : x * width);
  const py = (y: number) => y * height;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {POSE_CONNECTIONS.map(([from, to], index) => {
          const a = pose.keypoints[KEYPOINT_INDEX[from]];
          const b = pose.keypoints[KEYPOINT_INDEX[to]];
          if (!a || !b || a.score < threshold || b.score < threshold) return null;
          return (
            <Line
              key={`bone-${index}`}
              x1={px(a.x)}
              y1={py(a.y)}
              x2={px(b.x)}
              y2={py(b.y)}
              stroke={theme.colors.primary}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
        {pose.keypoints.map((kp, index) =>
          kp.score < threshold ? null : (
            <Circle
              key={`joint-${index}`}
              cx={px(kp.x)}
              cy={py(kp.y)}
              r={5}
              fill={theme.colors.accent}
            />
          ),
        )}
      </Svg>
    </View>
  );
}

export const PoseSkeletonOverlay = React.memo(PoseSkeletonOverlayImpl);
