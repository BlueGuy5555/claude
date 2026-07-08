/**
 * The low-level pose detector: it owns the TensorFlow Lite model and the raw
 * per-frame inference. This is the ONLY module that talks to the ML runtime
 * (`react-native-fast-tflite`) and the frame resizer, so swapping the model or
 * library later means touching just this file.
 */
import { Platform } from 'react-native';
import type { Frame } from 'react-native-vision-camera';
import {
  loadTensorflowModel,
  type TensorflowModelDelegate,
  type TensorflowModel,
} from 'react-native-fast-tflite';
import type { ResizePlugin } from 'vision-camera-resize-plugin';

import type { Keypoint } from './PoseTypes';
import { parseKeypoints } from './PoseUtils';

/**
 * The bundled model: MoveNet SinglePose Lightning, int8.
 * Input:  uint8  [1, 192, 192, 3]  (RGB, values 0-255)
 * Output: float32 [1, 1, 17, 3]    ([y, x, score] per keypoint, normalized)
 *
 * `.tflite` must be registered as a Metro asset extension (see metro.config.js).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const POSE_MODEL = require('../../../assets/models/movenet-lightning-int8.tflite');

/** Default MoveNet input edge length; overridden by the model's real shape. */
const DEFAULT_INPUT_SIZE = 192;

export interface LoadedPoseModel {
  model: TensorflowModel;
  /** Square input edge length the model expects (e.g. 192). */
  inputSize: number;
  /** Human-readable label of the compute delegate that was actually used. */
  delegate: string;
}

/**
 * Ordered list of delegates to try per platform. Each entry is attempted in
 * turn and we fall back to the pure-CPU delegate (`[]`) if a hardware-
 * accelerated one is unavailable or rejects this model — so the app degrades
 * gracefully instead of failing outright.
 */
function delegateAttempts(): TensorflowModelDelegate[][] {
  if (Platform.OS === 'ios') return [['core-ml'], []];
  if (Platform.OS === 'android') return [['android-gpu'], ['nnapi'], []];
  return [[]];
}

/** Load the pose model, preferring GPU/NPU acceleration, then falling back. */
export async function loadPoseModel(): Promise<LoadedPoseModel> {
  let lastError: unknown;
  for (const delegates of delegateAttempts()) {
    try {
      const model = await loadTensorflowModel(POSE_MODEL, delegates);
      const inputSize = model.inputs[0]?.shape[1] ?? DEFAULT_INPUT_SIZE;
      return { model, inputSize, delegate: delegates[0] ?? 'cpu' };
    } catch (error) {
      lastError = error;
      console.warn(
        `[pose] delegate "${delegates[0] ?? 'cpu'}" unavailable, trying next`,
        error,
      );
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to load pose model');
}

/**
 * Run one inference on a camera frame and return normalized keypoints.
 *
 * Runs entirely on the camera thread (worklet). The frame is stretched to the
 * model's square input (full-frame, no crop) so that normalized outputs map
 * straight back to the full frame by a simple multiply.
 */
export function detectPose(
  frame: Frame,
  model: TensorflowModel,
  resizer: ResizePlugin,
  inputSize: number,
): Keypoint[] {
  'worklet';
  const resized = resizer.resize(frame, {
    crop: { x: 0, y: 0, width: frame.width, height: frame.height },
    scale: { width: inputSize, height: inputSize },
    pixelFormat: 'rgb',
    dataType: 'uint8',
  });

  const outputs = model.runSync([resized.buffer as ArrayBuffer]);
  const raw = new Float32Array(outputs[0]!);
  return parseKeypoints(raw);
}
