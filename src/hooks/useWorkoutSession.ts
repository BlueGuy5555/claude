import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_EXERCISE_ID, WORKOUT } from '@/constants';
import {
  applyReps,
  createSession,
  estimateCalories,
  finalizeSession,
  repsForExercise,
  totalReps as sumReps,
} from '@/services';
import {
  addSessionToHistory,
  clearActiveSession,
  loadActiveSession,
  loadPreferences,
  saveActiveSession,
  savePreferences,
} from '@/storage';
import type { ExerciseId, WorkoutSession, WorkoutSet } from '@/types';

import { useHaptics } from './useHaptics';

/** Lifecycle of a workout session. */
export type SessionStatus = 'idle' | 'running' | 'paused' | 'finished';

interface UseWorkoutSessionOptions {
  /** Resume the persisted in-progress session instead of starting fresh. */
  resume?: boolean;
}

interface UseWorkoutSession {
  status: SessionStatus;
  selectedExerciseId: ExerciseId;
  selectExercise: (id: ExerciseId) => void;
  elapsedSec: number;
  sets: WorkoutSet[];
  totalReps: number;
  /** Reps recorded for the currently selected exercise. */
  currentReps: number;
  calories: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Manually record a rep for the selected exercise (for UI testing). */
  addRep: () => void;
  /** Finalize, persist to history, and return the saved session. */
  finish: () => Promise<WorkoutSession | null>;
  /** Abandon the session without saving it to history. */
  discard: () => Promise<void>;
  /** The session saved by `finish`, shown on the summary. */
  savedSession: WorkoutSession | null;
}

/**
 * Owns the entire workout session lifecycle: the elapsed timer, the (simulated)
 * rep counter that stands in for pose detection, calorie estimation, and
 * persistence of the in-progress session so it can be resumed after leaving the
 * screen. All storage access flows through the storage layer.
 */
export function useWorkoutSession(options: UseWorkoutSessionOptions = {}): UseWorkoutSession {
  const { resume } = options;
  const { impact, notify, selection } = useHaptics();

  const [status, setStatus] = useState<SessionStatus>('idle');
  const [selectedExerciseId, setSelectedExerciseId] = useState<ExerciseId>(DEFAULT_EXERCISE_ID);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<WorkoutSession | null>(null);

  // Mirror the latest state so interval callbacks and cleanup can read it
  // without being re-created on every render.
  const stateRef = useRef({ status, selectedExerciseId, sets, elapsedSec, sessionId, startedAt });
  useEffect(() => {
    stateRef.current = { status, selectedExerciseId, sets, elapsedSec, sessionId, startedAt };
  });

  /** Assemble the current pieces into an in-progress session, or null. */
  const assembleInProgress = useCallback((): WorkoutSession | null => {
    const snapshot = stateRef.current;
    if (!snapshot.sessionId || !snapshot.startedAt) return null;
    return {
      id: snapshot.sessionId,
      startedAt: snapshot.startedAt,
      endedAt: null,
      durationSec: snapshot.elapsedSec,
      sets: snapshot.sets,
      totalReps: sumReps(snapshot.sets),
      calories: estimateCalories(snapshot.sets),
    };
  }, []);

  const persist = useCallback(() => {
    const snapshot = stateRef.current;
    if (snapshot.status !== 'running' && snapshot.status !== 'paused') return;
    const inProgress = assembleInProgress();
    if (inProgress) void saveActiveSession(inProgress);
  }, [assembleInProgress]);

  // Hydrate on mount: resume the stored session, or pick the last-used exercise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (resume) {
        const stored = await loadActiveSession();
        if (stored && !cancelled) {
          setSessionId(stored.id);
          setStartedAt(stored.startedAt);
          setSets(stored.sets);
          setElapsedSec(stored.durationSec);
          setSelectedExerciseId(
            stored.sets[stored.sets.length - 1]?.exerciseId ?? DEFAULT_EXERCISE_ID,
          );
          setStatus('paused');
          return;
        }
      }
      const prefs = await loadPreferences();
      if (!cancelled && prefs.lastExerciseId) setSelectedExerciseId(prefs.lastExerciseId);
    })();
    return () => {
      cancelled = true;
    };
  }, [resume]);

  const addRep = useCallback(
    (haptic = true) => {
      setSets((prev) => applyReps(prev, stateRef.current.selectedExerciseId, 1));
      if (haptic) impact('light');
    },
    [impact],
  );

  // Drive the timer and the simulated rep counter while the session runs. The
  // effect naturally clears both intervals on pause, finish, and unmount.
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
    const reps = setInterval(() => addRep(true), WORKOUT.simulatedRepIntervalMs);
    return () => {
      clearInterval(timer);
      clearInterval(reps);
    };
  }, [status, addRep]);

  // Persist the in-progress session whenever meaningful state changes. Depending
  // on `sets` (which updates on every rep) keeps the stored elapsed time fresh
  // without writing to disk on every one-second tick.
  useEffect(() => {
    persist();
  }, [status, sets, selectedExerciseId, persist]);

  // Capture the freshest state if the screen unmounts mid-session.
  useEffect(() => {
    return () => {
      persist();
    };
  }, [persist]);

  const selectExercise = useCallback(
    (id: ExerciseId) => {
      setSelectedExerciseId(id);
      void savePreferences({ lastExerciseId: id });
      selection();
    },
    [selection],
  );

  const start = useCallback(() => {
    const draft = createSession();
    setSessionId(draft.id);
    setStartedAt(draft.startedAt);
    setSets([]);
    setElapsedSec(0);
    setSavedSession(null);
    setStatus('running');
    impact('medium');
  }, [impact]);

  const pause = useCallback(() => {
    setStatus('paused');
    impact('light');
  }, [impact]);

  const resumeSession = useCallback(() => {
    setStatus('running');
    impact('light');
  }, [impact]);

  const finish = useCallback(async (): Promise<WorkoutSession | null> => {
    const inProgress = assembleInProgress();
    if (!inProgress) return null;
    const finalized = finalizeSession(inProgress, stateRef.current.elapsedSec);
    await addSessionToHistory(finalized);
    await clearActiveSession();
    setSavedSession(finalized);
    setStatus('finished');
    notify('success');
    return finalized;
  }, [assembleInProgress, notify]);

  const discard = useCallback(async () => {
    await clearActiveSession();
    setStatus('idle');
    setSessionId(null);
    setStartedAt(null);
    setSets([]);
    setElapsedSec(0);
    setSavedSession(null);
  }, []);

  return useMemo<UseWorkoutSession>(
    () => ({
      status,
      selectedExerciseId,
      selectExercise,
      elapsedSec,
      sets,
      totalReps: sumReps(sets),
      currentReps: repsForExercise(sets, selectedExerciseId),
      calories: estimateCalories(sets),
      start,
      pause,
      resume: resumeSession,
      addRep,
      finish,
      discard,
      savedSession,
    }),
    [
      status,
      selectedExerciseId,
      selectExercise,
      elapsedSec,
      sets,
      start,
      pause,
      resumeSession,
      addRep,
      finish,
      discard,
      savedSession,
    ],
  );
}
