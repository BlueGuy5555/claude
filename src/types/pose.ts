/**
 * Pose domain types.
 *
 * The app uses the 17-keypoint COCO topology (the output of MoveNet / BlazePose
 * "full body" models). Keeping a single, model-agnostic representation here
 * means the rep-counting and analysis code never depends on which detector
 * produced the pose — a real on-device model or the bundled simulated detector
 * both emit this exact shape.
 */

/** The 17 COCO keypoints, in the canonical MoveNet output order. */
export const KEYPOINT_NAMES = [
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

export type KeypointName = (typeof KEYPOINT_NAMES)[number];

/** Map from keypoint name to its index in a `Pose.keypoints` array. */
export const KEYPOINT_INDEX: Readonly<Record<KeypointName, number>> = KEYPOINT_NAMES.reduce(
  (acc, name, index) => {
    acc[name] = index;
    return acc;
  },
  {} as Record<KeypointName, number>,
);

/**
 * A single detected joint. Coordinates are normalized to `[0, 1]` relative to
 * the image, with the origin at the top-left and `y` increasing downward (the
 * usual image-space convention). `score` is the detector's confidence in `[0, 1]`.
 */
export interface Keypoint {
  x: number;
  y: number;
  score: number;
}

/**
 * A full-body pose for a single frame.
 *
 * `keypoints` always has 17 entries indexed to match {@link KEYPOINT_NAMES};
 * absent joints are still present but carry a low `score`. `timestamp` is a
 * monotonic time in milliseconds so downstream code can measure motion speed
 * and FPS without wall-clock drift.
 */
export interface Pose {
  keypoints: Keypoint[];
  score: number;
  timestamp: number;
}

/** The skeletal connections used to draw a stick figure over the camera. */
export const POSE_CONNECTIONS: readonly (readonly [KeypointName, KeypointName])[] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];
