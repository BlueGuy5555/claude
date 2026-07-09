import type { Keypoint, KeypointName, Point } from './types';

/**
 * Canonical MoveNet / COCO keypoint order. The model outputs 17 keypoints in
 * exactly this sequence, so the index in this array is the index in the model
 * output tensor.
 */
export const KEYPOINT_NAMES: readonly KeypointName[] = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const;

export const KEYPOINT_COUNT = KEYPOINT_NAMES.length;

/**
 * Bones to draw for the skeleton overlay, as pairs of keypoint indices. Kept
 * here (next to the keypoint order) so the overlay never hard-codes indices.
 */
export const SKELETON_EDGES: readonly (readonly [number, number])[] = [
  // Arms
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  // Shoulders / torso
  [5, 6],
  [5, 11],
  [6, 12],
  [11, 12],
  // Legs
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  // Face (light detail)
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
] as const;

/**
 * Look up a keypoint by name, returning it only when the model is confident
 * enough. Returning `null` (rather than a low-confidence guess) lets callers
 * cleanly skip frames where a joint isn't reliably visible.
 */
export function getPoint(
  keypoints: readonly Keypoint[],
  name: KeypointName,
  minScore: number,
): Point | null {
  const kp = keypoints.find((k) => k.name === name);
  if (!kp || kp.score < minScore) return null;
  return { x: kp.x, y: kp.y };
}

/** Mean score over a set of named keypoints (0 when none are present). */
export function meanScore(
  keypoints: readonly Keypoint[],
  names: readonly KeypointName[],
): number {
  let sum = 0;
  let count = 0;
  for (const name of names) {
    const kp = keypoints.find((k) => k.name === name);
    if (kp) {
      sum += kp.score;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}
