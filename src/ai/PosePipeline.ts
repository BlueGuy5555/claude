import type { ExerciseId } from '@/types';

import { meanScore } from './keypoints';
import { EXERCISE_CONFIGS } from './repcounting';
import type { ExerciseConfig, ExercisePhase } from './repcounting';
import { RepCounter } from './repcounting';
import { PoseSmoother } from './smoothing';
import type { Pose } from './types';

export interface PipelineOptions {
  /** Minimum per-keypoint score for a joint to be trusted, `[0, 1]`. */
  minConfidence: number;
}

/** Everything the UI needs after one pose has been processed. */
export interface PipelineResult {
  /** Smoothed pose (for the skeleton overlay). */
  pose: Pose;
  reps: number;
  phase: ExercisePhase;
  /** Human-readable phase, e.g. "Up" / "Down". */
  phaseLabel: string;
  repCompleted: boolean;
  /** Mean confidence over the joints this exercise relies on, `[0, 1]`. */
  confidence: number;
  signal: number | null;
}

/**
 * Pure, framework-free pipeline: smooth → measure → count. Kept out of the UI
 * and free of any React or ML-library imports so it can be unit-tested against
 * synthetic pose sequences (see `PosePipeline.test.ts`).
 */
export class PosePipeline {
  private readonly config: ExerciseConfig;
  private readonly smoother: PoseSmoother;
  private readonly counter: RepCounter;

  /** Minimum joint confidence; may be tuned live from Settings. */
  minConfidence: number;

  constructor(exerciseId: ExerciseId, options: PipelineOptions) {
    this.config = EXERCISE_CONFIGS[exerciseId];
    this.smoother = new PoseSmoother();
    this.counter = new RepCounter(this.config);
    this.minConfidence = options.minConfidence;
  }

  reset(): void {
    this.smoother.reset();
    this.counter.reset();
  }

  push(rawPose: Pose): PipelineResult {
    const pose = this.smoother.smooth(rawPose);
    const update = this.counter.update(pose.keypoints, pose.timestamp, this.minConfidence);

    return {
      pose,
      reps: update.reps,
      phase: update.phase,
      phaseLabel: this.labelFor(update.phase),
      repCompleted: update.repCompleted,
      confidence: meanScore(pose.keypoints, this.config.relevantKeypoints),
      signal: update.signal,
    };
  }

  private labelFor(phase: ExercisePhase): string {
    if (phase === 'active') return this.config.activeLabel;
    if (phase === 'rest') return this.config.restLabel;
    return 'Ready';
  }
}
