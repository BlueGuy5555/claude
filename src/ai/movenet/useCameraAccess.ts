import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

export type CameraFacing = 'front' | 'back';

export interface CameraAccess {
  /** Whether camera permission has been granted. */
  hasPermission: boolean;
  /** Prompt for permission; resolves to the new granted state. */
  requestPermission: () => Promise<boolean>;
  /** Whether a physical camera exists for the requested facing. */
  hasDevice: boolean;
}

/**
 * Thin wrapper over VisionCamera's permission + device hooks. Screens consume
 * this instead of importing the camera library directly, keeping the ML/camera
 * dependency isolated inside `src/ai`.
 */
export function useCameraAccess(facing: CameraFacing): CameraAccess {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);
  return { hasPermission, requestPermission, hasDevice: device != null };
}
