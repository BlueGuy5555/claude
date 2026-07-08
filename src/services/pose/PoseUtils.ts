/**
 * Pure, worklet-safe helpers for turning raw model output into a filtered,
 * smoothed skeleton and drawing it onto a Skia canvas.
 *
 * Every function here is marked with the `'worklet'` directive so it can run
 * inside a VisionCamera frame processor (on the camera thread). They contain no
 * VisionCamera-specific types — only plain data and Skia — which keeps them
 * reusable and unit-testable on the JS thread as well.
 */
import {
  PaintStyle,
  Skia,
  StrokeCap,
  type SkCanvas,
} from '@shopify/react-native-skia';

import type { Keypoint, PoseKeypointName, SkeletonStyle } from './PoseTypes';

/** Number of landmarks emitted by MoveNet. */
export const NUM_KEYPOINTS = 17;

/** MoveNet emits keypoints in this fixed order (COCO topology). */
export const KEYPOINT_NAMES: readonly PoseKeypointName[] = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
];

/** Bones connecting keypoints, as index pairs into {@link KEYPOINT_NAMES}. */
export const SKELETON_EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
];

/** Draw sizes are authored against this nominal preview width, then scaled. */
const REFERENCE_WIDTH = 400;

/**
 * Convert MoveNet's raw output tensor into normalized keypoints.
 *
 * MoveNet SinglePose returns a `[1, 1, 17, 3]` float tensor, flattened here to
 * length 51 with each landmark laid out as `[y, x, score]`, all in [0, 1].
 */
export function parseKeypoints(raw: Float32Array): Keypoint[] {
  'worklet';
  const keypoints: Keypoint[] = [];
  for (let i = 0; i < NUM_KEYPOINTS; i += 1) {
    const base = i * 3;
    keypoints.push({
      name: KEYPOINT_NAMES[i]!,
      y: raw[base] ?? 0,
      x: raw[base + 1] ?? 0,
      score: raw[base + 2] ?? 0,
    });
  }
  return keypoints;
}

/**
 * Temporal smoothing via a confidence-gated exponential moving average.
 *
 * State is carried as a flat `[x, y, score, ...]` array (length 51) so it can
 * live cheaply in a worklet shared value. When a landmark is confidently seen
 * its position is eased toward the new measurement; when it drops below the
 * confidence threshold we hold its last good position (and report the low
 * score) instead of chasing noisy coordinates. This removes most of the frame
 * to-frame jitter without introducing rubber-banding when a limb reappears.
 */
export function smoothKeypoints(
  previous: number[] | null,
  current: Keypoint[],
  smoothingFactor: number,
  minKeypointScore: number,
): number[] {
  'worklet';
  const next: number[] = [];
  for (let i = 0; i < current.length; i += 1) {
    const kp = current[i]!;
    const base = i * 3;
    const hasPrev = previous != null && previous.length >= base + 3;
    const prevX = hasPrev ? previous![base]! : kp.x;
    const prevY = hasPrev ? previous![base + 1]! : kp.y;

    if (kp.score >= minKeypointScore) {
      // Snap into place on first sighting, then ease afterwards.
      const alpha = hasPrev ? smoothingFactor : 1;
      next.push(
        prevX + (kp.x - prevX) * alpha,
        prevY + (kp.y - prevY) * alpha,
        kp.score,
      );
    } else {
      next.push(prevX, prevY, kp.score);
    }
  }
  return next;
}

/** Rebuild structured keypoints from the flat smoothing state. */
export function keypointsFromFlat(flat: number[]): Keypoint[] {
  'worklet';
  const keypoints: Keypoint[] = [];
  for (let i = 0; i < NUM_KEYPOINTS; i += 1) {
    const base = i * 3;
    keypoints.push({
      name: KEYPOINT_NAMES[i]!,
      x: flat[base] ?? 0,
      y: flat[base + 1] ?? 0,
      score: flat[base + 2] ?? 0,
    });
  }
  return keypoints;
}

/** Mean score across the visible keypoints — the pose's overall confidence. */
export function meanVisibleScore(
  keypoints: Keypoint[],
  minKeypointScore: number,
): number {
  'worklet';
  let sum = 0;
  let count = 0;
  for (let i = 0; i < keypoints.length; i += 1) {
    const score = keypoints[i]!.score;
    if (score >= minKeypointScore) {
      sum += score;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

/**
 * Draw the skeleton onto a Skia canvas.
 *
 * Coordinates are supplied normalized in [0, 1] and multiplied up to the frame
 * buffer size (`frameWidth`/`frameHeight`); VisionCamera then rotates/scales
 * the whole canvas to the preview, so the overlay stays glued to the person.
 * For the mirrored (front) camera the X axis is flipped to match the preview.
 */
export function drawSkeleton(
  canvas: SkCanvas,
  keypoints: Keypoint[],
  frameWidth: number,
  frameHeight: number,
  mirror: boolean,
  style: SkeletonStyle,
  minKeypointScore: number,
): void {
  'worklet';
  const scale = frameWidth / REFERENCE_WIDTH;

  const bonePaint = Skia.Paint();
  bonePaint.setColor(Skia.Color(style.boneColor));
  bonePaint.setStyle(PaintStyle.Stroke);
  bonePaint.setStrokeWidth(style.boneWidth * scale);
  bonePaint.setStrokeCap(StrokeCap.Round);
  bonePaint.setAntiAlias(true);

  const jointPaint = Skia.Paint();
  jointPaint.setColor(Skia.Color(style.jointColor));
  jointPaint.setStyle(PaintStyle.Fill);
  jointPaint.setAntiAlias(true);

  // Bones first, so the joints render on top of the line ends.
  for (let i = 0; i < SKELETON_EDGES.length; i += 1) {
    const edge = SKELETON_EDGES[i]!;
    const a = keypoints[edge[0]]!;
    const b = keypoints[edge[1]]!;
    if (a.score < minKeypointScore || b.score < minKeypointScore) continue;
    const ax = mirror ? frameWidth - a.x * frameWidth : a.x * frameWidth;
    const bx = mirror ? frameWidth - b.x * frameWidth : b.x * frameWidth;
    canvas.drawLine(ax, a.y * frameHeight, bx, b.y * frameHeight, bonePaint);
  }

  for (let i = 0; i < keypoints.length; i += 1) {
    const kp = keypoints[i]!;
    if (kp.score < minKeypointScore) continue;
    const x = mirror ? frameWidth - kp.x * frameWidth : kp.x * frameWidth;
    canvas.drawCircle(x, kp.y * frameHeight, style.jointRadius * scale, jointPaint);
  }
}
