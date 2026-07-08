import { describe, expect, it } from 'vitest';

import { KEYPOINT_NAMES, type Pose } from '@/types';

import { OneEuroFilter, PoseSmoother, clonePose } from './smoothing';

describe('OneEuroFilter', () => {
  it('passes a constant signal through unchanged', () => {
    const filter = new OneEuroFilter();
    let out = 0;
    for (let t = 0; t < 20; t += 1) out = filter.filter(5, t * 33);
    expect(out).toBeCloseTo(5, 3);
  });

  it('substantially reduces zero-mean noise around a constant', () => {
    const filter = new OneEuroFilter();
    // Deterministic pseudo-noise so the test is stable.
    let seed = 1;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff - 0.5;
    };

    let rawVar = 0;
    let filtVar = 0;
    let n = 0;
    for (let t = 0; t < 300; t += 1) {
      const noise = rand() * 0.1;
      const raw = 10 + noise;
      const filtered = filter.filter(raw, t * 33);
      if (t > 30) {
        rawVar += (raw - 10) ** 2;
        filtVar += (filtered - 10) ** 2;
        n += 1;
      }
    }
    expect(filtVar / n).toBeLessThan(rawVar / n);
  });
});

describe('PoseSmoother', () => {
  const makePose = (x: number, t: number): Pose => ({
    keypoints: KEYPOINT_NAMES.map(() => ({ x, y: x, score: 0.9 })),
    score: 0.9,
    timestamp: t,
  });

  it('holds the last position for low-confidence (missing) joints', () => {
    const smoother = new PoseSmoother(0.2);
    smoother.smooth(makePose(0.5, 0));

    const dropped: Pose = {
      keypoints: KEYPOINT_NAMES.map(() => ({ x: 0.99, y: 0.99, score: 0.05 })),
      score: 0.05,
      timestamp: 33,
    };
    const out = smoother.smooth(dropped);
    // Position is held near the last good value, and the low score is preserved
    // so downstream visibility checks still treat the joint as missing.
    expect(out.keypoints[0]!.x).toBeCloseTo(0.5, 2);
    expect(out.keypoints[0]!.score).toBe(0.05);
  });
});

describe('clonePose', () => {
  it('produces an independent copy', () => {
    const pose: Pose = {
      keypoints: [{ x: 1, y: 2, score: 0.5 }],
      score: 0.5,
      timestamp: 0,
    };
    const copy = clonePose(pose);
    copy.keypoints[0]!.x = 99;
    expect(pose.keypoints[0]!.x).toBe(1);
  });
});
