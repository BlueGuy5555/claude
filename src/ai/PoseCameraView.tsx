import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';

import type { ExerciseId } from '@/types';

import { MOVENET_DELEGATE, MOVENET_INPUT_SIZE, MOVENET_MODEL } from './movenet/constants';
import { readKeypoints, toPose, type RawKeypoint } from './movenet/decode';
import type { CameraFacing } from './movenet/useCameraAccess';
import { PosePipeline } from './PosePipeline';
import { PoseOverlay, type OverlayKeypoint, type ViewSize } from './PoseOverlay';

/** Live metrics pushed up to the workout screen. */
export interface WorkoutMetrics {
  reps: number;
  phaseLabel: string;
  /** Mean confidence of the joints this exercise relies on, `[0, 1]`. */
  confidence: number;
  /** Smoothed processing rate (frames actually run through the model). */
  fps: number;
  /** `true` on the exact frame a rep was completed. */
  repCompleted: boolean;
}

export interface PoseCameraViewProps {
  exerciseId: ExerciseId;
  facing: CameraFacing;
  /** Camera preview on/off (tie to screen focus). */
  active: boolean;
  /** Whether to run inference and count reps. */
  counting: boolean;
  minConfidence: number;
  showSkeleton: boolean;
  mirror: boolean;
  /** Upper bound on frames processed per second (adaptive throttle). */
  targetFps: number;
  /** Bump this to start a fresh count (reps back to zero). */
  resetToken: number;
  skeletonColor: string;
  jointColor: string;
  onMetrics: (metrics: WorkoutMetrics) => void;
  onModelReady?: () => void;
  onError?: (message: string) => void;
}

/**
 * The single boundary between the app and the ML stack: this is the only place
 * that touches VisionCamera, fast-tflite and the resize plugin. Everything it
 * exposes to the rest of the app is plain data (`WorkoutMetrics`).
 *
 * Data flow per frame (all on the worklet thread until the very end):
 *   camera frame → resize to 192² → TFLite `runSync` → decode keypoints
 *   → hand off to JS, where the pure `PosePipeline` smooths + counts.
 * The skeleton is drawn from a shared value, so streaming poses never trigger a
 * React re-render.
 */
export function PoseCameraView(props: PoseCameraViewProps) {
  const {
    exerciseId,
    facing,
    active,
    counting,
    minConfidence,
    showSkeleton,
    mirror,
    targetFps,
    resetToken,
    skeletonColor,
    jointColor,
    onMetrics,
    onModelReady,
    onError,
  } = props;

  const device = useCameraDevice(facing);
  const model = useTensorflowModel(MOVENET_MODEL, MOVENET_DELEGATE);
  const { resize } = useResizePlugin();

  const skeleton = useSharedValue<OverlayKeypoint[]>([]);
  const viewSize = useSharedValue<ViewSize>({ width: 0, height: 0 });
  const lastProcessMs = useSharedValue(0);

  const minIntervalMs = useMemo(() => 1000 / Math.max(1, targetFps), [targetFps]);

  // Pure pipeline (smoothing + rep counting), rebuilt when the exercise changes.
  const pipelineRef = useRef<PosePipeline | null>(null);
  useEffect(() => {
    pipelineRef.current = new PosePipeline(exerciseId, { minConfidence });
    skeleton.value = [];
  }, [exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pipelineRef.current) pipelineRef.current.minConfidence = minConfidence;
  }, [minConfidence]);

  // Start each new count from a clean slate (driven by the screen's Start button).
  useEffect(() => {
    pipelineRef.current?.reset();
    skeleton.value = [];
  }, [resetToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // FPS estimate (EMA) and change-detection for throttled state updates.
  const fpsRef = useRef({ last: 0, ema: 0 });
  const lastEmitRef = useRef({ reps: -1, phaseLabel: '', ms: 0 });
  const onMetricsRef = useRef(onMetrics);
  onMetricsRef.current = onMetrics;

  // JS-thread handler. Kept in a ref so the worklet trampoline stays stable.
  const processorRef = useRef<(raw: RawKeypoint[], ts: number) => void>(() => undefined);
  processorRef.current = (raw, ts) => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;

    const result = pipeline.push(toPose(raw, ts));

    if (showSkeleton) {
      skeleton.value = result.pose.keypoints.map((k) => ({ x: k.x, y: k.y, score: k.score }));
    }

    const fpsState = fpsRef.current;
    if (fpsState.last > 0) {
      const dt = ts - fpsState.last;
      if (dt > 0) {
        const inst = 1000 / dt;
        fpsState.ema = fpsState.ema === 0 ? inst : fpsState.ema * 0.9 + inst * 0.1;
      }
    }
    fpsState.last = ts;

    const now = Date.now();
    const last = lastEmitRef.current;
    const changed = result.reps !== last.reps || result.phaseLabel !== last.phaseLabel;
    if (changed || now - last.ms > 250) {
      onMetricsRef.current({
        reps: result.reps,
        phaseLabel: result.phaseLabel,
        confidence: result.confidence,
        fps: fpsState.ema,
        repCompleted: result.repCompleted,
      });
      lastEmitRef.current = { reps: result.reps, phaseLabel: result.phaseLabel, ms: now };
    }
  };

  const onFrameJS = useMemo(
    () => Worklets.createRunOnJS((raw: RawKeypoint[], ts: number) => processorRef.current(raw, ts)),
    [],
  );

  // Report model lifecycle to the screen (loading spinner / error UI).
  const onModelReadyRef = useRef(onModelReady);
  onModelReadyRef.current = onModelReady;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    if (model.state === 'loaded') onModelReadyRef.current?.();
    else if (model.state === 'error') {
      onErrorRef.current?.(model.error?.message ?? 'Failed to load the pose model.');
    }
  }, [model.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!counting) return;

      const tfliteModel = model.state === 'loaded' ? model.model : undefined;
      if (tfliteModel == null) return;

      // Adaptive throttle: cap processing at the target rate so a slow device
      // simply runs fewer frames instead of falling behind.
      const now = Date.now();
      if (now - lastProcessMs.value < minIntervalMs) return;
      lastProcessMs.value = now;

      const resized = resize(frame, {
        scale: { width: MOVENET_INPUT_SIZE, height: MOVENET_INPUT_SIZE },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });

      const outputs = tfliteModel.runSync([resized]);
      // MoveNet's single output is a float32 tensor; narrow it for the decoder.
      const raw = readKeypoints(outputs[0] as unknown as Float32Array);
      onFrameJS(raw, now);
    },
    [counting, model, resize, onFrameJS, minIntervalMs, lastProcessMs],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      viewSize.value = { width, height };
    },
    [viewSize],
  );

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={active}
          frameProcessor={frameProcessor}
        />
      ) : null}
      {showSkeleton ? (
        <PoseOverlay
          skeleton={skeleton}
          viewSize={viewSize}
          mirror={mirror}
          minScore={minConfidence}
          strokeColor={skeletonColor}
          jointColor={jointColor}
        />
      ) : null}
    </View>
  );
}
