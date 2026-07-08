/**
 * `usePoseDetection` — the single seam between the camera UI and the pose AI.
 *
 * It owns the model lifecycle (loading / ready / error + retry), builds the
 * Skia frame processor that runs inference and draws the skeleton on the camera
 * thread, and exposes only plain, implementation-agnostic values to the screen:
 * a status, an error message, a `frameProcessor` to attach to `<Camera>`, and
 * lightweight `personDetected` / `fps` signals for the overlays.
 *
 * The screen never imports TensorFlow, the resize plugin or Skia directly — it
 * just consumes this hook.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSharedValue } from 'react-native-worklets-core';
import {
  useSkiaFrameProcessor,
  type DrawableFrameProcessor,
} from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';

import { detectPose, loadPoseModel, type LoadedPoseModel } from './PoseDetector';
import {
  DEFAULT_POSE_CONFIG,
  DEFAULT_SKELETON_STYLE,
  type PoseConfig,
  type PoseStatus,
  type SkeletonStyle,
} from './PoseTypes';
import {
  drawSkeleton,
  keypointsFromFlat,
  meanVisibleScore,
  smoothKeypoints,
} from './PoseUtils';

/** How often the UI polls the camera-thread signals (ms). */
const POLL_INTERVAL_MS = 500;

export interface UsePoseDetectionOptions {
  /** Whether the camera is streaming. When `false`, detection state resets. */
  isActive: boolean;
  /** Mirror the overlay horizontally (front / selfie camera). */
  mirror?: boolean;
  /** Overrides merged over {@link DEFAULT_POSE_CONFIG}. */
  config?: Partial<PoseConfig>;
  /** Overrides merged over {@link DEFAULT_SKELETON_STYLE}. */
  skeletonStyle?: Partial<SkeletonStyle>;
}

export interface PoseDetectionController {
  status: PoseStatus;
  /** Present only when `status === 'error'`. */
  errorMessage: string | null;
  /** Attach to `<Camera frameProcessor={...} />`. */
  frameProcessor: DrawableFrameProcessor;
  /** Whether a person is currently detected (throttled, for the UI). */
  personDetected: boolean;
  /** Detection throughput in frames/second (throttled, for the debug overlay). */
  fps: number;
  /** The active compute delegate, e.g. `'core-ml'` or `'cpu'`. */
  delegate: string | null;
  /** Reload the model after an error. */
  retry: () => void;
}

export function usePoseDetection(
  options: UsePoseDetectionOptions,
): PoseDetectionController {
  const { isActive, mirror = false } = options;

  // Stable config/style regardless of caller object identity.
  const config = useMemo<PoseConfig>(
    () => ({ ...DEFAULT_POSE_CONFIG, ...options.config }),
    [options.config?.minKeypointScore, options.config?.minPoseScore, options.config?.smoothingFactor],
  );
  const style = useMemo<SkeletonStyle>(
    () => ({ ...DEFAULT_SKELETON_STYLE, ...options.skeletonStyle }),
    [
      options.skeletonStyle?.jointColor,
      options.skeletonStyle?.boneColor,
      options.skeletonStyle?.jointRadius,
      options.skeletonStyle?.boneWidth,
    ],
  );

  const resizer = useResizePlugin();

  const [status, setStatus] = useState<PoseStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [delegate, setDelegate] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedPoseModel | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [personDetected, setPersonDetected] = useState(false);
  const [fps, setFps] = useState(0);

  // Camera-thread <-> JS channels (worklets-core shared values).
  const smoothing = useSharedValue<number[] | null>(null);
  const frameCounter = useSharedValue(0);
  const personFlag = useSharedValue(false);

  // Load the model once (and again on retry), with delegate fallback.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    loadPoseModel()
      .then((result) => {
        if (cancelled) return;
        setLoaded(result);
        setDelegate(result.delegate);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : 'Could not start pose detection.',
        );
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // Drop stale smoothing state whenever the camera pauses.
  useEffect(() => {
    if (!isActive) {
      smoothing.value = null;
      personFlag.value = false;
    }
  }, [isActive, smoothing, personFlag]);

  // Poll the camera-thread signals to drive the "no person" + FPS overlays.
  useEffect(() => {
    if (status !== 'ready' || !isActive) {
      setFps(0);
      setPersonDetected(false);
      return;
    }
    let previousCount = frameCounter.value;
    const id = setInterval(() => {
      const currentCount = frameCounter.value;
      setFps(Math.round(((currentCount - previousCount) * 1000) / POLL_INTERVAL_MS));
      previousCount = currentCount;
      setPersonDetected(personFlag.value);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, isActive, frameCounter, personFlag]);

  const model = loaded?.model;
  const inputSize = loaded?.inputSize ?? 192;

  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      'worklet';
      // Always paint the camera frame, even before the model is ready.
      frame.render();
      if (model == null) return;

      frameCounter.value += 1;

      const keypoints = detectPose(frame, model, resizer, inputSize);
      const smoothed = smoothKeypoints(
        smoothing.value,
        keypoints,
        config.smoothingFactor,
        config.minKeypointScore,
      );
      smoothing.value = smoothed;

      const smoothedKeypoints = keypointsFromFlat(smoothed);
      const poseScore = meanVisibleScore(smoothedKeypoints, config.minKeypointScore);
      const present = poseScore >= config.minPoseScore;
      personFlag.value = present;

      if (present) {
        drawSkeleton(
          frame,
          smoothedKeypoints,
          frame.width,
          frame.height,
          mirror,
          style,
          config.minKeypointScore,
        );
      }
    },
    [model, resizer, inputSize, mirror, config, style, smoothing, frameCounter, personFlag],
  );

  return {
    status,
    errorMessage,
    frameProcessor,
    personDetected,
    fps,
    delegate,
    retry: () => setReloadToken((token) => token + 1),
  };
}
