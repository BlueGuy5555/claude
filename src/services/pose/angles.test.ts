import { describe, expect, it } from 'vitest';

import { jointAngle, normalizeProgress, segmentAngle } from './angles';

const kp = (x: number, y: number, score = 1) => ({ x, y, score });

describe('jointAngle', () => {
  it('measures a right angle as 90°', () => {
    // Vertex at origin, arms along +x and +y (y is "down" but magnitude is same).
    const angle = jointAngle(kp(1, 0), kp(0, 0), kp(0, 1));
    expect(angle).toBeCloseTo(90, 4);
  });

  it('measures a straight limb as 180°', () => {
    const angle = jointAngle(kp(-1, 0), kp(0, 0), kp(1, 0));
    expect(angle).toBeCloseTo(180, 4);
  });

  it('measures a fully folded limb as 0°', () => {
    const angle = jointAngle(kp(1, 0), kp(0, 0), kp(2, 0));
    expect(angle).toBeCloseTo(0, 4);
  });

  it('returns null for a zero-length segment', () => {
    expect(jointAngle(kp(0, 0), kp(0, 0), kp(1, 1))).toBeNull();
  });
});

describe('segmentAngle', () => {
  it('is 0° for a horizontal segment and 90° for a downward one', () => {
    expect(segmentAngle(kp(0, 0), kp(1, 0))).toBeCloseTo(0, 4);
    expect(segmentAngle(kp(0, 0), kp(0, 1))).toBeCloseTo(90, 4);
  });
});

describe('normalizeProgress', () => {
  it('maps the endpoints to 0 and 1 and clamps outside the range', () => {
    expect(normalizeProgress(170, 170, 90)).toBeCloseTo(0, 6);
    expect(normalizeProgress(90, 170, 90)).toBeCloseTo(1, 6);
    expect(normalizeProgress(130, 170, 90)).toBeCloseTo(0.5, 6);
    expect(normalizeProgress(200, 170, 90)).toBe(0);
    expect(normalizeProgress(50, 170, 90)).toBe(1);
  });
});
