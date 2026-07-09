/**
 * Public surface of the on-device pose-detection layer.
 *
 * The rest of the app imports ONLY from here. Everything ML-specific
 * (TensorFlow Lite, VisionCamera, the resize plugin) lives behind this barrel,
 * so swapping the model or camera backend never ripples into the screens.
 */
export type { Keypoint, KeypointName, Pose, PoseDetectorStatus, Point } from './types';
export { PosePipeline } from './PosePipeline';
export type { PipelineOptions, PipelineResult } from './PosePipeline';
export {
  PushupCounter,
  SquatCounter,
  ExerciseCounter,
  createCounter,
  EXERCISE_DEFINITIONS,
} from './repcounting';
export type {
  RepState,
  ExercisePhase,
  RepUpdate,
  ExerciseDefinition,
  PoseFeatures,
} from './repcounting';

export { PoseCameraView } from './PoseCameraView';
export type { PoseCameraViewProps, WorkoutMetrics } from './PoseCameraView';
export { useCameraAccess } from './movenet/useCameraAccess';
export type { CameraAccess, CameraFacing } from './movenet/useCameraAccess';
export { AIErrorBoundary } from './AIErrorBoundary';
