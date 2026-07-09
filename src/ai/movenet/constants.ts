import type { TensorflowModelDelegate } from 'react-native-fast-tflite';

// eslint-disable-next-line import/no-unresolved -- resolved by Metro as a bundled asset
import movenetModel from '../../../assets/models/movenet_singlepose_lightning_int8.tflite';

/** Square side length (px) MoveNet SinglePose Lightning expects as input. */
export const MOVENET_INPUT_SIZE = 192;

/** The bundled model asset, passed to `useTensorflowModel`. */
export const MOVENET_MODEL = movenetModel;

/**
 * Inference delegate. `default` uses the CPU (XNNPACK) path, which is the most
 * portable and reliably supports the INT8 model on both iOS and Android. GPU
 * delegates (`core-ml`, `android-gpu`) can be faster but aren't universally
 * compatible with quantized models, so we keep the safe default.
 */
export const MOVENET_DELEGATE: TensorflowModelDelegate = 'default';
