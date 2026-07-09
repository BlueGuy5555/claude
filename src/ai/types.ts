/**
 * Domain types for the on-device pose-detection layer.
 *
 * These types are the boundary between the ML implementation and the rest of
 * the app: screens, overlays and rep-counting logic depend ONLY on these
 * plain data types, never on a specific ML library (TFLite, VisionCamera, …).
 * Swapping MoveNet for another model means re-implementing the detector while
 * everything downstream keeps working unchanged.
 */

/** The 17 COCO keypoints MoveNet predicts, in model output order. */
export type KeypointName =
  | 'nose'
  | 'left_eye'
  | 'right_eye'
  | 'left_ear'
  | 'right_ear'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle';

/**
 * A single detected joint.
 *
 * `x` and `y` are normalized to `[0, 1]` within the square region fed to the
 * model, so the coordinate space is *isotropic* (one unit of x equals one unit
 * of y). This matters: joint angles computed from these coordinates are
 * geometrically correct and invariant to camera rotation and mirroring.
 */
export interface Keypoint {
  name: KeypointName;
  x: number;
  y: number;
  /** Model confidence for this joint, `[0, 1]`. */
  score: number;
}

/** A full-body pose: exactly 17 keypoints plus aggregate metadata. */
export interface Pose {
  keypoints: Keypoint[];
  /** Mean keypoint score, a rough "is a person clearly visible" signal. */
  score: number;
  /** Milliseconds (monotonic-ish) when the frame was processed. */
  timestamp: number;
}

/** Lifecycle of the detector / underlying model. */
export type PoseDetectorStatus = 'idle' | 'loading' | 'ready' | 'error';

/** A 2-D point; the minimal shape the geometry helpers operate on. */
export interface Point {
  x: number;
  y: number;
}
