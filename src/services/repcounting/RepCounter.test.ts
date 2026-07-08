import { beforeEach, describe, expect, it } from 'vitest';

import { PoseSmoother, SimulatedPoseDetector } from '@/services/pose';
import { KEYPOINT_INDEX, KEYPOINT_NAMES, type ExerciseId, type Keypoint, type Pose } from '@/types';

import { RepCounter } from './RepCounter';
import type { MeasureOptions } from './definitions';

const OPTIONS: MeasureOptions = { confidenceThreshold: 0.3, handedness: 'right' };
const DEG = Math.PI / 180;

/** Drive the full simulator → smoother → counter pipeline for `seconds`. */
async function runSimulated(exercise: ExerciseId, seconds: number, repsPerSecond = 0.5) {
  const detector = new SimulatedPoseDetector({
    exercise,
    repsPerSecond,
    noise: 0,
    dropoutProbability: 0,
    random: () => 0.5,
    now: () => 0,
  });
  await detector.load();
  const smoother = new PoseSmoother(0.2);
  const counter = new RepCounter(exercise);

  const dt = 33;
  let snapshot = counter.update(smoother.smooth(detector.getLatestPose(0)!), OPTIONS, 0);
  for (let t = dt; t <= seconds * 1000; t += dt) {
    const pose = detector.getLatestPose(t)!;
    snapshot = counter.update(smoother.smooth(pose), OPTIONS, t);
  }
  return snapshot;
}

/** A pose with only the leg joints visible, posed to a specific knee angle. */
function squatPose(kneeDeg: number, timestamp: number): Pose {
  const keypoints: Keypoint[] = KEYPOINT_NAMES.map(() => ({ x: 0, y: 0, score: 0 }));
  const set = (name: keyof typeof KEYPOINT_INDEX, x: number, y: number) => {
    keypoints[KEYPOINT_INDEX[name]] = { x, y, score: 0.9 };
  };
  const lowerDeg = 270 - kneeDeg;
  for (const side of ['left', 'right'] as const) {
    const hipX = side === 'left' ? 0.45 : 0.55;
    const hip = { x: hipX, y: 0.45 };
    const knee = { x: hipX, y: hip.y + 0.16 };
    const ankle = {
      x: knee.x + 0.17 * Math.cos(lowerDeg * DEG),
      y: knee.y + 0.17 * Math.sin(lowerDeg * DEG),
    };
    set(`${side}_hip`, hip.x, hip.y);
    set(`${side}_knee`, knee.x, knee.y);
    set(`${side}_ankle`, ankle.x, ankle.y);
  }
  return { keypoints, score: 0.9, timestamp };
}

/** A completely un-tracked pose (every joint below threshold). */
function blankPose(timestamp: number): Pose {
  return {
    keypoints: KEYPOINT_NAMES.map(() => ({ x: 0, y: 0, score: 0 })),
    score: 0,
    timestamp,
  };
}

function feed(counter: RepCounter, angles: number[], startMs = 0, stepMs = 50) {
  let snapshot = counter.update(squatPose(angles[0]!, startMs), OPTIONS, startMs);
  for (let i = 1; i < angles.length; i += 1) {
    snapshot = counter.update(squatPose(angles[i]!, startMs + i * stepMs), OPTIONS, startMs + i * stepMs);
  }
  return snapshot;
}

describe('RepCounter — simulated movement', () => {
  const cases: ExerciseId[] = ['pushup', 'squat', 'pullup', 'lunge', 'jumping_jack'];

  for (const exercise of cases) {
    it(`counts ~10 reps of ${exercise} over 20s at 0.5 rep/s`, async () => {
      const snapshot = await runSimulated(exercise, 20.5, 0.5);
      expect(snapshot.reps).toBeGreaterThanOrEqual(9);
      expect(snapshot.reps).toBeLessThanOrEqual(11);
      expect(snapshot.avgConfidence).toBeGreaterThan(0.5);
    });
  }

  it('accumulates hold time for a plank and counts no reps', async () => {
    const snapshot = await runSimulated('plank', 10);
    expect(snapshot.reps).toBe(0);
    expect(snapshot.holdSec).toBeGreaterThan(8);
    expect(snapshot.phase).toBe('hold');
  });
});

describe('RepCounter — robustness', () => {
  let counter: RepCounter;
  beforeEach(() => {
    counter = new RepCounter('squat');
  });

  it('does not count a partial rep that never reaches the bottom', () => {
    const snapshot = feed(counter, [170, 150, 130, 150, 170]);
    expect(snapshot.reps).toBe(0);
  });

  it('counts one rep for a full down-and-up, even with a long pause at the bottom', () => {
    const angles = [170, 150, 120, 100, 90, ...Array(15).fill(90), 100, 120, 150, 170];
    const snapshot = feed(counter, angles);
    expect(snapshot.reps).toBe(1);
  });

  it('does not double-count while hovering around the bottom threshold', () => {
    const angles = [170, 120, 90, 120, 90, 120, 90, 170];
    const snapshot = feed(counter, angles);
    expect(snapshot.reps).toBe(1);
  });

  it('recovers after a burst of untracked frames and keeps counting', () => {
    // One clean rep...
    feed(counter, [170, 120, 90, 120, 170], 0, 60);
    // ...a burst of total tracking loss (held, not miscounted)...
    let t = 5 * 60;
    for (let i = 0; i < 12; i += 1, t += 60) counter.update(blankPose(t), OPTIONS, t);
    // ...then another clean rep.
    const angles = [170, 120, 90, 120, 170];
    let snapshot = counter.update(squatPose(angles[0]!, t), OPTIONS, t);
    for (let i = 1; i < angles.length; i += 1) {
      t += 60;
      snapshot = counter.update(squatPose(angles[i]!, t), OPTIONS, t);
    }
    expect(snapshot.reps).toBe(2);
  });
});
