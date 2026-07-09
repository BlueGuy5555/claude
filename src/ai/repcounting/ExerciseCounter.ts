import { meanScore } from '../keypoints';
import type { Keypoint } from '../types';

import { ExerciseStateMachine } from './ExerciseStateMachine';
import { PoseAnalyzer } from './PoseAnalyzer';
import { Ema, TemporalFilter, type TemporalFilterConfig } from './TemporalFilter';
import type {
  ExerciseDefinition,
  RepCounterLike,
  RepState,
  RepUpdate,
  SignalContext,
} from './types';

/**
 * Depth is computed from an already One-Euro-smoothed pose, so this second pass
 * is light (α = 0.7): just enough to tame the angle→depth nonlinearity and to
 * give a stable velocity, without adding the lag that would swallow a fast rep.
 * Jitter rejection is the job of the hysteresis bands and the whole-body
 * corroboration, not of heavy smoothing here.
 */
const DEPTH_FILTER_CONFIG: TemporalFilterConfig = {
  emaAlpha: 0.7,
  windowSize: 5,
  velocitySmoothing: 0.4,
};

/**
 * How quickly the top-position baseline tracks the athlete. Slow (α = 0.2) so
 * it settles to the true resting height and ignores the motion of a rep, but
 * still adapts if the athlete shuffles their stance between reps.
 */
const BASELINE_ALPHA = 0.2;

/**
 * The composed rep-counting engine: **analyze → filter → decide**.
 *
 * ```
 *  keypoints ─▶ PoseAnalyzer ─▶ features
 *                                  │
 *              ExerciseDefinition ─┤─▶ depth + form gate + corroboration
 *                                  │
 *              TemporalFilter ─────┤─▶ smoothed depth + velocity
 *                                  │
 *              ExerciseStateMachine ▶ state + repCompleted
 * ```
 *
 * The engine is exercise-agnostic; all sport-specific knowledge lives in the
 * injected {@link ExerciseDefinition}. It owns the small amount of cross-frame
 * state the definition can't: the smoothed depth/velocity and the top-position
 * baselines used to confirm that the whole body — not just a limb — moved.
 */
export class ExerciseCounter implements RepCounterLike {
  private analyzer: PoseAnalyzer;
  private readonly depthFilter: TemporalFilter;
  private readonly baselineShoulderY: Ema;
  private readonly baselineHipY: Ema;
  private readonly fsm: ExerciseStateMachine;
  private minConfidence: number;

  constructor(
    private readonly definition: ExerciseDefinition,
    minConfidence: number,
  ) {
    this.minConfidence = minConfidence;
    this.analyzer = new PoseAnalyzer(minConfidence);
    this.depthFilter = new TemporalFilter(DEPTH_FILTER_CONFIG);
    this.baselineShoulderY = new Ema(BASELINE_ALPHA);
    this.baselineHipY = new Ema(BASELINE_ALPHA);
    this.fsm = new ExerciseStateMachine(definition.fsm);
  }

  get count(): number {
    return this.fsm.count;
  }

  get relevantKeypoints() {
    return this.definition.relevantKeypoints;
  }

  /** Live-tunable from Settings; also gates which joints the analyzer trusts. */
  setMinConfidence(value: number): void {
    this.minConfidence = value;
    this.analyzer = new PoseAnalyzer(value);
  }

  labelFor(state: RepState): string {
    return this.definition.phaseLabels[state];
  }

  reset(): void {
    this.depthFilter.reset();
    this.baselineShoulderY.reset();
    this.baselineHipY.reset();
    this.fsm.reset();
  }

  update(keypoints: readonly Keypoint[], timestamp: number): RepUpdate {
    const features = this.analyzer.analyze(keypoints);
    const confidence = meanScore(keypoints, this.definition.relevantKeypoints);
    const confident = confidence >= this.minConfidence;

    const context: SignalContext = {
      baselineShoulderY: this.baselineShoulderY.value,
      baselineHipY: this.baselineHipY.value,
    };
    const signals = this.definition.computeSignals(features, context);

    // Smooth depth and derive velocity; hold (null) when unmeasurable so the
    // machine freezes rather than guessing.
    let depth: number | null = null;
    let velocity = 0;
    if (signals.depth !== null) {
      const filtered = this.depthFilter.update(signals.depth, timestamp);
      depth = filtered.value;
      velocity = filtered.velocity;
    }

    const step = this.fsm.update({
      depth,
      velocity,
      formValid: confident && signals.formValid,
      bottomCorroborated: signals.bottomCorroborated,
      timestamp,
    });

    // Refresh the top-position baseline only while resting at the top, and only
    // when we trust the pose — this is the reference the corroboration compares
    // future descents against.
    if ((step.state === 'READY' || step.state === 'LOCKOUT') && confident) {
      if (features.shoulderMid) this.baselineShoulderY.update(features.shoulderMid.y);
      if (features.hipMid) this.baselineHipY.update(features.hipMid.y);
    }

    return {
      reps: this.fsm.count,
      state: step.state,
      repCompleted: step.repCompleted,
      depth,
    };
  }
}
