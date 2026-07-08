/**
 * Pose-detection domain types.
 *
 * These describe the *output* of pose estimation in an implementation-agnostic
 * way — nothing here references TensorFlow, VisionCamera, Skia or any concrete
 * model. The screens and components depend only on these types (and the
 * `usePoseDetection` hook), never on the AI implementation itself.
 */

/** The 17 body landmarks produced by a COCO-topology single-person model. */
export type PoseKeypointName =
  | 'nose'
  | 'leftEye'
  | 'rightEye'
  | 'leftEar'
  | 'rightEar'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftElbow'
  | 'rightElbow'
  | 'leftWrist'
  | 'rightWrist'
  | 'leftHip'
  | 'rightHip'
  | 'leftKnee'
  | 'rightKnee'
  | 'leftAnkle'
  | 'rightAnkle';

/** A single detected landmark. `x`/`y` are normalized to the frame in [0, 1]. */
export interface Keypoint {
  name: PoseKeypointName;
  /** Horizontal position, normalized to frame width, in [0, 1]. */
  x: number;
  /** Vertical position, normalized to frame height, in [0, 1]. */
  y: number;
  /** Model confidence for this landmark, in [0, 1]. */
  score: number;
}

/** A full-body pose for a single person in one frame. */
export interface Pose {
  keypoints: Keypoint[];
  /** Overall confidence — the mean score of the visible keypoints, in [0, 1]. */
  score: number;
}

/** Detector lifecycle, surfaced to the UI to drive loading/error states. */
export type PoseStatus = 'loading' | 'ready' | 'error';

/** Tunable detection parameters. */
export interface PoseConfig {
  /** Keypoints scoring below this are treated as "not visible" and hidden. */
  minKeypointScore: number;
  /** Poses whose overall score is below this are treated as "no person". */
  minPoseScore: number;
  /**
   * Temporal smoothing factor in (0, 1]. It is the weight given to the newest
   * measurement in an exponential moving average: lower = smoother but laggier,
   * `1` disables smoothing entirely.
   */
  smoothingFactor: number;
}

export const DEFAULT_POSE_CONFIG: PoseConfig = {
  minKeypointScore: 0.3,
  minPoseScore: 0.2,
  smoothingFactor: 0.35,
};

/**
 * Visual styling for the skeleton overlay. Sizes are expressed against a
 * nominal ~400px-wide preview and are scaled to the real frame size at draw
 * time, so they look consistent across devices and resolutions.
 */
export interface SkeletonStyle {
  jointColor: string;
  boneColor: string;
  /** Joint (circle) radius in device-independent pixels. */
  jointRadius: number;
  /** Bone (line) stroke width in device-independent pixels. */
  boneWidth: number;
}

export const DEFAULT_SKELETON_STYLE: SkeletonStyle = {
  jointColor: '#8A7BFF',
  boneColor: '#F3F4FA',
  jointRadius: 5,
  boneWidth: 3,
};
