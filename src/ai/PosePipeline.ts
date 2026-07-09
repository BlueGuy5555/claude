import type { ExerciseId } from '@/types';

import { meanScore } from './keypoints';
import { createCounter } from './repcounting';
import type { RepCounterLike, RepState } from './repcounting';
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
  /** Current finite-state-machine phase. */
  state: RepState;
  /** Human-readable phase, e.g. "Up" / "Down". */
  phaseLabel: string;
  repCompleted: boolean;
  /** Mean confidence over the joints this exercise relies on, `[0, 1]`. */
  confidence: number;
  /** Smoothed rep progress `[0, 1]` (0 = top, 1 = bottom), or `null`. */
  depth: number | null;
}

/**
 * Pure, framework-free pipeline: **smooth → count**. Kept out of the UI and
 * free of any React or ML-library imports so it can be unit-tested against
 * synthetic pose sequences (see `PosePipeline.test.ts`).
 *
 * Landmark smoothing (the adaptive One-Euro filter) lives here, upstream of the
 * counter, so every exercise counter receives an already de-jittered pose and
 * can keep its own temporal filtering light.
 */
export class PosePipeline {
  private readonly smoother: PoseSmoother;
  private readonly counter: RepCounterLike;
  private minConfidenceValue: number;

  constructor(exerciseId: ExerciseId, options: PipelineOptions) {
    this.smoother = new PoseSmoother();
    this.minConfidenceValue = options.minConfidence;
    this.counter = createCounter(exerciseId, options.minConfidence);
  }

  /** Minimum joint confidence; may be tuned live from Settings. */
  get minConfidence(): number {
    return this.minConfidenceValue;
  }

  set minConfidence(value: number) {
    this.minConfidenceValue = value;
    this.counter.setMinConfidence(value);
  }

  reset(): void {
    this.smoother.reset();
    this.counter.reset();
  }

  push(rawPose: Pose): PipelineResult {
    const pose = this.smoother.smooth(rawPose);
    const update = this.counter.update(pose.keypoints, pose.timestamp);

    return {
      pose,
      reps: update.reps,
      state: update.state,
      phaseLabel: this.counter.labelFor(update.state),
      repCompleted: update.repCompleted,
      confidence: meanScore(pose.keypoints, this.counter.relevantKeypoints),
      depth: update.depth,
    };
  }
}
