import type { ExerciseId } from '@/types';

import type { Keypoint, KeypointName, Point } from '../types';

/**
 * The five phases of one repetition, plus the implicit resting state.
 *
 * ```
 *   READY ──▶ DESCENDING ──▶ BOTTOM ──▶ ASCENDING ──▶ LOCKOUT ──▶ READY
 *     ▲            │                         │            │
 *     └── abort ───┘                         └── re-dip ──┘
 * ```
 *
 * The names are written from the point of view of a push-up or squat (a body
 * that goes *down* then *up*), but the machine is generic: "descending" always
 * means "progressing toward the active extreme" and "bottom" always means "at
 * the active extreme". For a pull-up the active extreme is the top of the bar;
 * for a jumping jack it is arms-open.
 */
export type RepState = 'READY' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING' | 'LOCKOUT';

/** Backwards-compatible alias used by the pipeline/overlay layer. */
export type ExercisePhase = RepState;

/**
 * A rich, mostly-normalized description of a single pose. `PoseAnalyzer`
 * produces one of these per frame; every exercise definition reads only the
 * fields it needs. A field is `null` when the joints it depends on were not
 * confidently visible, which lets the counter cleanly *hold* its state instead
 * of guessing.
 */
export interface PoseFeatures {
  /** Mean elbow angle, shoulder–elbow–wrist (deg). Small = arms bent. */
  elbowAngle: number | null;
  /** Mean armpit angle, elbow–shoulder–hip (deg). */
  shoulderAngle: number | null;
  /** Mean knee angle, hip–knee–ankle (deg). Small = knees bent. */
  kneeAngle: number | null;
  /** Mean torso/thigh angle, shoulder–hip–knee (deg). ~180 = straight body. */
  hipAngle: number | null;

  /** Midpoint of the two shoulders (normalized coords). */
  shoulderMid: Point | null;
  /** Midpoint of the two hips. */
  hipMid: Point | null;
  /** Midpoint of the two wrists. */
  wristMid: Point | null;
  /** Midpoint of the two ankles. */
  ankleMid: Point | null;
  /** Nose position (head proxy). */
  nose: Point | null;

  /** Torso inclination from horizontal, deg `[0, 90]`. 0 = plank, 90 = upright. */
  torsoInclination: number | null;
  /**
   * Body-scale reference length (shoulder-centre → hip-centre distance). All
   * positional thresholds are expressed as fractions of this so they are
   * invariant to how far the athlete is from the camera.
   */
  bodyScale: number | null;
}

/**
 * Cross-frame context the counter maintains and hands to a definition so it can
 * judge *vertical travel* without re-deriving a baseline itself. Values are
 * `null` until a resting baseline has been observed.
 */
export interface SignalContext {
  /** Smoothed shoulder height captured while the athlete rests at the top. */
  baselineShoulderY: number | null;
  /** Smoothed hip height captured while the athlete rests at the top. */
  baselineHipY: number | null;
}

/**
 * What a definition computes from one pose. `depth` is the primary progression
 * signal; the two booleans are the multi-condition guards that make counting
 * robust.
 */
export interface ExerciseSignals {
  /**
   * Repetition progress in `[0, 1]`: `0` at the resting extreme (top / arms
   * extended), `1` at the active extreme (bottom / full flexion). `null` when
   * the pose can't be measured this frame.
   */
  depth: number | null;
  /**
   * Per-frame form gate. Must be `true` for the machine to make any progress.
   * Encodes orientation, body straightness and anchoring — the checks that
   * reject arm-waving, sitting and standing-still.
   */
  formValid: boolean;
  /**
   * Whether a `depth ≥ bottomEnter` reading is corroborated by whole-body
   * descent (shoulders *and* hips travelled down together). Checked only when
   * accepting the BOTTOM state, so arm-only motion can never register a bottom.
   * Fails *open* when it cannot be evaluated (no baseline yet).
   */
  bottomCorroborated: boolean;
  /** Optional human-readable reasons a gate failed (debug/overlay only). */
  reasons?: readonly string[];
}

/** Tuning for the generic state machine. All thresholds are documented inline. */
export interface StateMachineConfig {
  /** `depth ≤ topEnter` ⇒ "at the top". Completing a rep requires returning here. */
  topEnter: number;
  /** `depth ≥ descendEnter` ⇒ committed to descending (arms the rep). */
  descendEnter: number;
  /** `depth ≥ bottomEnter` ⇒ deep enough to count as a real bottom. */
  bottomEnter: number;
  /** `depth ≤ bottomExit` while at the bottom ⇒ the ascent has begun. */
  bottomExit: number;
  /** Minimum ms between two counted reps — debounces residual noise. */
  minRepIntervalMs: number;
  /**
   * Minimum |depth velocity| (per second) to *confirm a direction change*. A
   * small dead-zone: jitter hovers near zero velocity and cannot arm a rep,
   * while even a slow deliberate rep clears it.
   */
  minVelocity: number;
  /**
   * How long (ms) form/confidence may be lost mid-rep before the machine gives
   * up and returns to READY without counting. Absorbs brief dropouts; aborts
   * genuinely abandoned reps.
   */
  lostResetMs: number;
}

/**
 * Everything needed to detect one exercise. Adding pull-ups, lunges or burpees
 * is a matter of writing one of these — no changes to the state machine or the
 * counter engine.
 */
export interface ExerciseDefinition {
  id: ExerciseId;
  /** Joints whose mean score drives the confidence gate + UI indicator. */
  relevantKeypoints: readonly KeypointName[];
  /** State-machine tuning. */
  fsm: StateMachineConfig;
  /** UI label for each phase, e.g. `{ DESCENDING: 'Down', LOCKOUT: 'Up' }`. */
  phaseLabels: Record<RepState, string>;
  /** Reduce a pose (+ baseline context) to the progression signal and guards. */
  computeSignals(features: PoseFeatures, context: SignalContext): ExerciseSignals;
}

/** Result of feeding one pose to a counter. */
export interface RepUpdate {
  reps: number;
  state: RepState;
  /** `true` on exactly the frame a rep is completed (for haptics/sound). */
  repCompleted: boolean;
  /** Smoothed depth `[0, 1]`, or `null` when not measurable (debug/overlay). */
  depth: number | null;
}

/** Minimal shape a counter must satisfy so the pipeline can stay generic. */
export interface RepCounterLike {
  reset(): void;
  update(keypoints: readonly Keypoint[], timestamp: number): RepUpdate;
  setMinConfidence(value: number): void;
  readonly count: number;
  labelFor(state: RepState): string;
  readonly relevantKeypoints: readonly KeypointName[];
}
