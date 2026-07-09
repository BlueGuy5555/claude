import React from 'react';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { SKELETON_EDGES, KEYPOINT_COUNT } from './keypoints';

/** A keypoint in square-normalized `[0, 1]` coordinates, for drawing only. */
export interface OverlayKeypoint {
  x: number;
  y: number;
  score: number;
}

export interface ViewSize {
  width: number;
  height: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

/**
 * Project a square-normalized keypoint into on-screen pixels.
 *
 * The model sees a centre-cropped square, so we map that square onto a centred
 * square band of the preview (side = view width, the portrait-preview case).
 * The `mirror` flag matches a mirrored front-camera preview. This runs on the
 * UI thread as part of `useAnimatedProps`, hence the `'worklet'` directive.
 */
function project(x: number, y: number, size: ViewSize, mirror: boolean) {
  'worklet';
  const side = size.width;
  const offsetY = (size.height - side) / 2;
  const px = mirror ? size.width - x * side : x * side;
  const py = offsetY + y * side;
  return { x: px, y: py };
}

interface JointProps {
  index: number;
  skeleton: SharedValue<OverlayKeypoint[]>;
  viewSize: SharedValue<ViewSize>;
  mirror: boolean;
  minScore: number;
  color: string;
}

function Joint({ index, skeleton, viewSize, mirror, minScore, color }: JointProps) {
  const animatedProps = useAnimatedProps(() => {
    const kp = skeleton.value[index];
    const size = viewSize.value;
    if (!kp || kp.score < minScore || size.width === 0) {
      return { cx: 0, cy: 0, opacity: 0 };
    }
    const p = project(kp.x, kp.y, size, mirror);
    return { cx: p.x, cy: p.y, opacity: 1 };
  });

  return <AnimatedCircle animatedProps={animatedProps} r={6} fill={color} />;
}

interface BoneProps {
  a: number;
  b: number;
  skeleton: SharedValue<OverlayKeypoint[]>;
  viewSize: SharedValue<ViewSize>;
  mirror: boolean;
  minScore: number;
  color: string;
}

function Bone({ a, b, skeleton, viewSize, mirror, minScore, color }: BoneProps) {
  const animatedProps = useAnimatedProps(() => {
    const ka = skeleton.value[a];
    const kb = skeleton.value[b];
    const size = viewSize.value;
    if (!ka || !kb || ka.score < minScore || kb.score < minScore || size.width === 0) {
      return { x1: 0, y1: 0, x2: 0, y2: 0, opacity: 0 };
    }
    const pa = project(ka.x, ka.y, size, mirror);
    const pb = project(kb.x, kb.y, size, mirror);
    return { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, opacity: 1 };
  });

  return <AnimatedLine animatedProps={animatedProps} stroke={color} strokeWidth={3} strokeLinecap="round" />;
}

interface PoseOverlayProps {
  skeleton: SharedValue<OverlayKeypoint[]>;
  viewSize: SharedValue<ViewSize>;
  mirror: boolean;
  minScore: number;
  strokeColor: string;
  jointColor: string;
}

/**
 * Live skeleton overlay. Every joint and bone is driven directly by Reanimated
 * shared values, so the skeleton updates on the UI thread without triggering a
 * single React re-render as poses stream in.
 */
export function PoseOverlay({
  skeleton,
  viewSize,
  mirror,
  minScore,
  strokeColor,
  jointColor,
}: PoseOverlayProps) {
  return (
    <Svg style={StyleSheetAbsoluteFill} pointerEvents="none">
      {SKELETON_EDGES.map(([a, b]) => (
        <Bone
          key={`bone-${a}-${b}`}
          a={a}
          b={b}
          skeleton={skeleton}
          viewSize={viewSize}
          mirror={mirror}
          minScore={minScore}
          color={strokeColor}
        />
      ))}
      {Array.from({ length: KEYPOINT_COUNT }, (_, i) => (
        <Joint
          key={`joint-${i}`}
          index={i}
          skeleton={skeleton}
          viewSize={viewSize}
          mirror={mirror}
          minScore={minScore}
          color={jointColor}
        />
      ))}
    </Svg>
  );
}

const StyleSheetAbsoluteFill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;
