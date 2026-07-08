import type { ExerciseId } from '@/types';

import type { PoseDetector } from './PoseDetector';
import { SimulatedPoseDetector } from './SimulatedPoseDetector';

export interface CreatePoseDetectorOptions {
  exercise?: ExerciseId;
}

/**
 * Single place that decides which pose source the app uses.
 *
 * Today it returns the {@link SimulatedPoseDetector} so the app is fully
 * functional offline with zero native dependencies. To go live with real
 * on-device inference, add a `MoveNetPoseDetector` that implements
 * {@link PoseDetector} (running a `.tflite` MoveNet model on a
 * react-native-vision-camera frame processor via react-native-fast-tflite) and
 * return it here. Nothing else in the app changes — every consumer talks to the
 * {@link PoseDetector} interface. See the README for the full recipe.
 */
export function createPoseDetector(options: CreatePoseDetectorOptions = {}): PoseDetector {
  return new SimulatedPoseDetector({ exercise: options.exercise });
}
