import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  ExerciseDetector,
  PoseSmoother,
  RepCounter,
  buildWorkoutSession,
  clonePose,
  computeStatistics,
  coreConfidence,
  createPoseDetector,
  estimateCalories,
  type PoseDetector,
} from '@/services';
import { addSessionToHistory, loadHistory, saveCachedStatistics } from '@/storage';
import { getExercise } from '@/constants';
import type { ExerciseId, Pose, Settings, WorkoutPhase, WorkoutSession } from '@/types';

export type SessionStatus =
  | 'loading'
  | 'ready'
  | 'running'
  | 'paused'
  | 'finished'
  | 'error';

export interface WorkoutSnapshot {
  status: SessionStatus;
  exerciseId: ExerciseId;
  autoDetect: boolean;
  detectedExerciseId: ExerciseId | null;
  reps: number;
  holdSec: number;
  phase: WorkoutPhase;
  elapsedSec: number;
  calories: number;
  fps: number;
  confidence: number;
  trackingLost: boolean;
  pose: Pose | null;
  errorMessage: string | null;
  savedSession: WorkoutSession | null;
}

const TARGET_FPS = 24;
const FRAME_MS = 1000 / TARGET_FPS;
const TRACKING_LOSS_MS = 700;

interface Options {
  settings: Pick<Settings, 'confidenceThreshold' | 'handedness' | 'showSkeleton'>;
  initialExercise: ExerciseId;
}

/**
 * Owns the live workout: it drives the pose detector, smooths keypoints, feeds
 * the rep-counting state machine and the auto exercise detector, tracks elapsed
 * time and calories, and persists the finished session. The screen stays a thin
 * view over the {@link WorkoutSnapshot} it publishes.
 */
export function useWorkoutSession({ settings, initialExercise }: Options) {
  const detectorRef = useRef<PoseDetector | null>(null);
  const smootherRef = useRef(new PoseSmoother(0.2));
  const counterRef = useRef(new RepCounter(initialExercise));
  const autoDetectorRef = useRef(new ExerciseDetector());

  // Mutable session bookkeeping kept in refs so the render loop never closes
  // over stale state and never triggers a re-render on its own.
  const statusRef = useRef<SessionStatus>('loading');
  const exerciseRef = useRef<ExerciseId>(initialExercise);
  const autoDetectRef = useRef(true);
  const accumulatedMsRef = useRef(0);
  const runStartMsRef = useRef<number | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const lastMeasurableMsRef = useRef(0);
  const lastFrameMsRef = useRef(0);
  const fpsRef = useRef(0);
  const confidenceRef = useRef(0);

  const [snapshot, setSnapshot] = useState<WorkoutSnapshot>({
    status: 'loading',
    exerciseId: initialExercise,
    autoDetect: true,
    detectedExerciseId: null,
    reps: 0,
    holdSec: 0,
    phase: 'idle',
    elapsedSec: 0,
    calories: 0,
    fps: 0,
    confidence: 0,
    trackingLost: false,
    pose: null,
    errorMessage: null,
    savedSession: null,
  });

  const publish = useCallback((patch: Partial<WorkoutSnapshot>) => {
    setSnapshot((prev) => ({ ...prev, ...patch }));
  }, []);

  // Load the detector once.
  useEffect(() => {
    let cancelled = false;
    const detector = createPoseDetector({ exercise: initialExercise });
    detectorRef.current = detector;
    detector
      .load()
      .then(() => {
        if (cancelled) return;
        statusRef.current = 'ready';
        publish({ status: 'ready' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        statusRef.current = 'error';
        publish({
          status: 'error',
          errorMessage:
            error instanceof Error ? error.message : 'The pose model failed to load.',
        });
      });
    return () => {
      cancelled = true;
      detector.dispose();
      detectorRef.current = null;
    };
    // initialExercise is only meaningful on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish]);

  const elapsedSec = useCallback((now: number): number => {
    const running = runStartMsRef.current !== null ? now - runStartMsRef.current : 0;
    return (accumulatedMsRef.current + running) / 1000;
  }, []);

  // The render/inference loop, active whenever the detector is live.
  useEffect(() => {
    const active =
      snapshot.status === 'ready' ||
      snapshot.status === 'running' ||
      snapshot.status === 'paused';
    const detector = detectorRef.current;
    if (!active || !detector) return;

    const options = {
      confidenceThreshold: settings.confidenceThreshold,
      handedness: settings.handedness,
    };

    const interval = setInterval(() => {
      const now = Date.now();

      // Measure FPS from the true frame delta (exponential moving average).
      if (lastFrameMsRef.current !== 0) {
        const dt = now - lastFrameMsRef.current;
        if (dt > 0) fpsRef.current = fpsRef.current * 0.8 + (1000 / dt) * 0.2;
      }
      lastFrameMsRef.current = now;

      detector.setExercise?.(exerciseRef.current);
      const raw = detector.getLatestPose(now);
      const status = statusRef.current;

      if (!raw) {
        const lost = now - lastMeasurableMsRef.current > TRACKING_LOSS_MS;
        publish({
          fps: Math.round(fpsRef.current),
          trackingLost: lost,
          elapsedSec: elapsedSec(now),
        });
        return;
      }

      const pose = smootherRef.current.smooth(raw);
      const conf = coreConfidence(pose);
      confidenceRef.current = conf;
      const tracked = conf >= settings.confidenceThreshold;
      if (tracked) lastMeasurableMsRef.current = now;

      // Auto-detect only before reps accrue, so a mid-set glitch can't wipe
      // progress. Manual selection disables this entirely.
      let detected: ExerciseId | null = null;
      if (autoDetectRef.current) {
        autoDetectorRef.current.push(pose, settings.confidenceThreshold);
        detected = autoDetectorRef.current.getDetected();
        if (
          detected &&
          detected !== exerciseRef.current &&
          counterRef.current.completedReps === 0 &&
          counterRef.current.heldSeconds === 0
        ) {
          switchExercise(detected);
        }
      }

      if (status === 'running') {
        const result = counterRef.current.update(pose, options, now);
        const seconds = elapsedSec(now);
        publish({
          status,
          exerciseId: exerciseRef.current,
          detectedExerciseId: detected,
          reps: result.reps,
          holdSec: result.holdSec,
          phase: result.phase,
          elapsedSec: seconds,
          calories: estimateCalories(exerciseRef.current, seconds),
          fps: Math.round(fpsRef.current),
          confidence: conf,
          trackingLost: !tracked && now - lastMeasurableMsRef.current > TRACKING_LOSS_MS,
          pose: settings.showSkeleton ? clonePose(pose) : null,
        });
      } else {
        // Ready / paused: keep the preview + detection indicator alive.
        publish({
          status,
          exerciseId: exerciseRef.current,
          detectedExerciseId: detected,
          fps: Math.round(fpsRef.current),
          confidence: conf,
          trackingLost: false,
          pose: settings.showSkeleton ? clonePose(pose) : null,
        });
      }
    }, FRAME_MS);

    return () => clearInterval(interval);
  }, [
    snapshot.status,
    settings.confidenceThreshold,
    settings.handedness,
    settings.showSkeleton,
    elapsedSec,
    publish,
  ]);

  // Auto-pause when the app is backgrounded; the camera + loop should not run
  // while hidden. The user explicitly resumes on return.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active' && statusRef.current === 'running') {
        pauseInternal();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchExercise(id: ExerciseId) {
    exerciseRef.current = id;
    counterRef.current = new RepCounter(id);
    detectorRef.current?.setExercise?.(id);
  }

  function pauseInternal() {
    if (statusRef.current !== 'running') return;
    const now = Date.now();
    if (runStartMsRef.current !== null) {
      accumulatedMsRef.current += now - runStartMsRef.current;
      runStartMsRef.current = null;
    }
    statusRef.current = 'paused';
    publish({ status: 'paused' });
  }

  const start = useCallback(() => {
    if (statusRef.current !== 'ready') return;
    startedAtRef.current = new Date();
    accumulatedMsRef.current = 0;
    runStartMsRef.current = Date.now();
    counterRef.current.reset();
    statusRef.current = 'running';
    publish({ status: 'running', reps: 0, holdSec: 0, elapsedSec: 0, calories: 0 });
  }, [publish]);

  const pause = useCallback(() => pauseInternal(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    runStartMsRef.current = Date.now();
    statusRef.current = 'running';
    publish({ status: 'running' });
  }, [publish]);

  const finish = useCallback(async (): Promise<WorkoutSession | null> => {
    const startedAt = startedAtRef.current;
    if (!startedAt) return null;

    const now = Date.now();
    if (runStartMsRef.current !== null) {
      accumulatedMsRef.current += now - runStartMsRef.current;
      runStartMsRef.current = null;
    }
    const durationSec = accumulatedMsRef.current / 1000;
    const counterSnap = counterRef.current.update(
      smootherRef.current.smooth(
        detectorRef.current?.getLatestPose(now) ?? emptyPose(now),
      ),
      { confidenceThreshold: settings.confidenceThreshold, handedness: settings.handedness },
      now,
    );

    const exercise = getExercise(exerciseRef.current);
    const reps = exercise.kind === 'timed' ? Math.round(counterSnap.holdSec) : counterSnap.reps;

    const session = buildWorkoutSession({
      exerciseId: exerciseRef.current,
      startedAt,
      endedAt: new Date(now),
      durationSec,
      reps,
      avgConfidence: counterSnap.avgConfidence,
    });

    await addSessionToHistory(session);
    const history = await loadHistory();
    await saveCachedStatistics(computeStatistics(history));

    statusRef.current = 'finished';
    publish({ status: 'finished', savedSession: session });
    return session;
  }, [publish, settings.confidenceThreshold, settings.handedness]);

  const selectExercise = useCallback(
    (id: ExerciseId) => {
      autoDetectRef.current = false;
      autoDetectorRef.current.reset();
      switchExercise(id);
      publish({ autoDetect: false, exerciseId: id, reps: 0, holdSec: 0, phase: 'idle' });
    },
    [publish],
  );

  const setAutoDetect = useCallback(
    (on: boolean) => {
      autoDetectRef.current = on;
      autoDetectorRef.current.reset();
      publish({ autoDetect: on });
    },
    [publish],
  );

  return { snapshot, start, pause, resume, finish, selectExercise, setAutoDetect };
}

function emptyPose(timestamp: number): Pose {
  return {
    keypoints: Array.from({ length: 17 }, () => ({ x: 0, y: 0, score: 0 })),
    score: 0,
    timestamp,
  };
}
