import type { ExerciseId } from '@/types';

import { angleDeg, mean } from '../geometry';
import { getPoint } from '../keypoints';
import type { Keypoint, KeypointName } from '../types';

import type { ExerciseConfig } from './types';

/**
 * Mean of a bilateral joint angle (left and right), using whichever sides are
 * confidently visible. Returns `null` when neither side can be measured, which
 * makes the counter simply hold its state instead of guessing.
 */
function bilateralAngle(
  keypoints: readonly Keypoint[],
  minScore: number,
  a: [KeypointName, KeypointName, KeypointName],
  b: [KeypointName, KeypointName, KeypointName],
): number | null {
  const angles: number[] = [];
  const left = tripleAngle(keypoints, minScore, a);
  const right = tripleAngle(keypoints, minScore, b);
  if (left !== null) angles.push(left);
  if (right !== null) angles.push(right);
  return mean(angles);
}

function tripleAngle(
  keypoints: readonly Keypoint[],
  minScore: number,
  names: [KeypointName, KeypointName, KeypointName],
): number | null {
  const p1 = getPoint(keypoints, names[0], minScore);
  const p2 = getPoint(keypoints, names[1], minScore);
  const p3 = getPoint(keypoints, names[2], minScore);
  if (!p1 || !p2 || !p3) return null;
  return angleDeg(p1, p2, p3);
}

const ELBOW_KEYPOINTS: readonly KeypointName[] = [
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
];

const KNEE_KEYPOINTS: readonly KeypointName[] = [
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

const SHOULDER_KEYPOINTS: readonly KeypointName[] = [
  'left_hip',
  'right_hip',
  'left_shoulder',
  'right_shoulder',
  'left_wrist',
  'right_wrist',
];

/** Mean elbow angle (shoulder–elbow–wrist). */
function elbowAngle(keypoints: readonly Keypoint[], minScore: number): number | null {
  return bilateralAngle(
    keypoints,
    minScore,
    ['left_shoulder', 'left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow', 'right_wrist'],
  );
}

/** Mean knee angle (hip–knee–ankle). */
function kneeAngle(keypoints: readonly Keypoint[], minScore: number): number | null {
  return bilateralAngle(
    keypoints,
    minScore,
    ['left_hip', 'left_knee', 'left_ankle'],
    ['right_hip', 'right_knee', 'right_ankle'],
  );
}

/** The more-bent knee (used for lunges, where only the front knee flexes). */
function minKneeAngle(keypoints: readonly Keypoint[], minScore: number): number | null {
  const left = tripleAngle(keypoints, minScore, ['left_hip', 'left_knee', 'left_ankle']);
  const right = tripleAngle(keypoints, minScore, ['right_hip', 'right_knee', 'right_ankle']);
  const present = [left, right].filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return Math.min(...present);
}

/** Mean shoulder abduction angle (hip–shoulder–wrist): small = arms down. */
function shoulderAngle(keypoints: readonly Keypoint[], minScore: number): number | null {
  return bilateralAngle(
    keypoints,
    minScore,
    ['left_hip', 'left_shoulder', 'left_wrist'],
    ['right_hip', 'right_shoulder', 'right_wrist'],
  );
}

/**
 * Per-exercise tuning. Thresholds are in degrees; the gap between
 * `activeThreshold` and `restThreshold` is the hysteresis band that prevents a
 * single wobble near the turnaround from being counted twice.
 */
export const EXERCISE_CONFIGS: Record<ExerciseId, ExerciseConfig> = {
  pushup: {
    id: 'pushup',
    restZone: 'high',
    activeThreshold: 100,
    restThreshold: 150,
    restLabel: 'Up',
    activeLabel: 'Down',
    minRepIntervalMs: 220,
    relevantKeypoints: ELBOW_KEYPOINTS,
    signal: elbowAngle,
  },
  squat: {
    id: 'squat',
    restZone: 'high',
    activeThreshold: 110,
    restThreshold: 155,
    restLabel: 'Up',
    activeLabel: 'Down',
    minRepIntervalMs: 220,
    relevantKeypoints: KNEE_KEYPOINTS,
    signal: kneeAngle,
  },
  pullup: {
    id: 'pullup',
    restZone: 'high',
    activeThreshold: 80,
    restThreshold: 150,
    restLabel: 'Hang',
    activeLabel: 'Up',
    minRepIntervalMs: 300,
    relevantKeypoints: ELBOW_KEYPOINTS,
    signal: elbowAngle,
  },
  lunge: {
    id: 'lunge',
    restZone: 'high',
    activeThreshold: 110,
    restThreshold: 155,
    restLabel: 'Up',
    activeLabel: 'Down',
    minRepIntervalMs: 250,
    relevantKeypoints: KNEE_KEYPOINTS,
    signal: minKneeAngle,
  },
  jumping_jack: {
    id: 'jumping_jack',
    restZone: 'low',
    activeThreshold: 120,
    restThreshold: 60,
    restLabel: 'Closed',
    activeLabel: 'Open',
    minRepIntervalMs: 200,
    relevantKeypoints: SHOULDER_KEYPOINTS,
    signal: shoulderAngle,
  },
};
