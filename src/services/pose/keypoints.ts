import { KEYPOINT_INDEX, type Keypoint, type KeypointName, type Pose } from '@/types';

/** Read a keypoint by name. Returns `undefined` if the index is out of range. */
export function getKeypoint(pose: Pose, name: KeypointName): Keypoint | undefined {
  return pose.keypoints[KEYPOINT_INDEX[name]];
}

/** True when a keypoint exists and its confidence clears the threshold. */
export function isVisible(
  keypoint: Keypoint | undefined,
  threshold: number,
): keypoint is Keypoint {
  return keypoint !== undefined && keypoint.score >= threshold;
}

/** Euclidean distance between two keypoints in normalized image space. */
export function distance(a: Keypoint, b: Keypoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Midpoint of two keypoints; its score is the lower of the two inputs. */
export function midpoint(a: Keypoint, b: Keypoint): Keypoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, score: Math.min(a.score, b.score) };
}

/**
 * Mean confidence across the "core" joints that matter for exercise scoring
 * (shoulders, hips, knees, elbows). Used as the session confidence signal and
 * to decide whether tracking has been lost.
 */
const CORE_JOINTS: readonly KeypointName[] = [
  'left_shoulder',
  'right_shoulder',
  'left_hip',
  'right_hip',
  'left_elbow',
  'right_elbow',
  'left_knee',
  'right_knee',
];

export function coreConfidence(pose: Pose): number {
  let sum = 0;
  let count = 0;
  for (const name of CORE_JOINTS) {
    const kp = getKeypoint(pose, name);
    if (kp) {
      sum += kp.score;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

/**
 * Pick the better-tracked side for a paired joint, biasing toward the user's
 * preferred side when both are comparably visible. Returns whichever of the
 * left/right keypoint has the higher confidence; the `preferred` side wins ties
 * (and near-ties, within `margin`).
 */
export function pickSide<T>(
  left: Keypoint | undefined,
  right: Keypoint | undefined,
  leftValue: T,
  rightValue: T,
  preferred: 'left' | 'right',
  margin = 0.15,
): T | undefined {
  const leftScore = left?.score ?? 0;
  const rightScore = right?.score ?? 0;
  if (leftScore === 0 && rightScore === 0) return undefined;
  if (Math.abs(leftScore - rightScore) <= margin) {
    return preferred === 'left' ? leftValue : rightValue;
  }
  return leftScore > rightScore ? leftValue : rightValue;
}
