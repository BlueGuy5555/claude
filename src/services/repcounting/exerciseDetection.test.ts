import { describe, expect, it } from 'vitest';

import { PoseSmoother, SimulatedPoseDetector } from '@/services/pose';
import type { ExerciseId } from '@/types';

import { ExerciseDetector } from './exerciseDetection';

async function detect(exercise: ExerciseId): Promise<ExerciseId | null> {
  const source = new SimulatedPoseDetector({
    exercise,
    repsPerSecond: 0.7,
    noise: 0,
    dropoutProbability: 0,
    random: () => 0.5,
    now: () => 0,
  });
  await source.load();
  const smoother = new PoseSmoother(0.2);
  const detector = new ExerciseDetector(48);
  for (let t = 0; t <= 3200; t += 33) {
    detector.push(smoother.smooth(source.getLatestPose(t)!), 0.3);
  }
  return detector.getDetected();
}

describe('ExerciseDetector', () => {
  const cases: ExerciseId[] = ['pushup', 'squat', 'pullup', 'lunge', 'jumping_jack', 'plank'];

  for (const exercise of cases) {
    it(`recognises ${exercise} from a simulated performance`, async () => {
      expect(await detect(exercise)).toBe(exercise);
    });
  }

  it('returns null before it has enough evidence', () => {
    const detector = new ExerciseDetector(48);
    expect(detector.getDetected()).toBeNull();
  });
});
