import type { ExerciseId } from '@/types';

import type { KeypointName } from '../types';

import type { ExerciseDefinition, ExerciseSignals, PoseFeatures, SignalContext } from './types';

/** Clamp `x` to `[0, 1]`. */
function unit(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Map a joint angle to depth `[0, 1]`, where `extendedDeg` (limb straight) is
 * depth `0` and `flexedDeg` (limb bent at the active extreme) is depth `1`.
 * Using an *angle* as the primary signal is deliberate: angles are invariant to
 * camera distance, rotation and mirroring, so the same thresholds work whether
 * the phone is close or far, portrait or landscape.
 */
function depthFromFlexion(
  angle: number | null,
  extendedDeg: number,
  flexedDeg: number,
): number | null {
  if (angle === null) return null;
  return unit((extendedDeg - angle) / (extendedDeg - flexedDeg));
}

/** Map a *rising* angle (small at rest, large when active) to depth `[0, 1]`. */
function depthFromExtension(
  angle: number | null,
  lowDeg: number,
  highDeg: number,
): number | null {
  if (angle === null) return null;
  return unit((angle - lowDeg) / (highDeg - lowDeg));
}

const UPPER_BODY: readonly KeypointName[] = [
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
];

const LOWER_BODY: readonly KeypointName[] = [
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_shoulder',
  'right_shoulder',
];

// ---------------------------------------------------------------------------
// Threshold rationale (shared)
//
// depth axis:  0 ─ topEnter ─ descendEnter ───── bottomExit ─ bottomEnter ─ 1
//             (rest)   ↑hold band↑   (mid)        ↑hold band↑        (active)
//
// - topEnter (0.20): below this the athlete is "locked out" at the top. A rep
//   only completes on returning here, which enforces full extension and blocks
//   partial reps that never re-straighten.
// - descendEnter (0.35): must be exceeded (while moving down) to arm a rep. The
//   0.15 gap above topEnter is a dead band: jitter around the top can't arm.
// - bottomEnter (0.65): must be reached to count as a real bottom. For a
//   push-up this is elbow ≈ 116°, for a squat knee ≈ 118° — a genuine, if not
//   ultra-deep, rep. Anything shallower is treated as a partial and ignored.
// - bottomExit (0.55): must drop below (while moving up) to leave the bottom.
//   The 0.10 gap under bottomEnter stops a wobble at the turnaround from being
//   read as a second rep.
// - minVelocity (0.12 depth/s): direction dead-zone. Bigger than pose jitter,
//   smaller than the slowest deliberate rep (it still arms an ~8 s descent), so
//   it confirms intent without blocking slow tempo.
// - minRepIntervalMs (300): no two reps closer than this. Debounces residual
//   noise and impossibly fast double transitions; 300 ms allows > 3 reps/s.
// - lostResetMs (900): how long the body may vanish mid-rep before we abort. A
//   brief occlusion is forgiven; a genuinely abandoned rep is discarded.
// ---------------------------------------------------------------------------

const PUSHUP_FSM = {
  topEnter: 0.2,
  descendEnter: 0.35,
  bottomEnter: 0.65,
  bottomExit: 0.55,
  minVelocity: 0.12,
  minRepIntervalMs: 300,
  lostResetMs: 900,
} as const;

// Push-up form gates (why each exists):
// - MAX_TORSO_INCLINATION (45°): the body must be closer to horizontal than
//   vertical. This single check rejects "arm-waving while sitting" and
//   "standing still" — a seated or standing torso is ~90° and fails outright.
// - MIN_HIP_ANGLE (150°): the body must be a straight plank. A seated athlete
//   has a bent (~90°) hip and fails; it also rejects sagging/piking cheats.
// - WRIST_BELOW_SHOULDER_MARGIN (0.15·bodyScale): the hands must be planted
//   below the shoulders (on the ground), not waving in the air.
// - MIN_MEAN_DROP (0.05·bodyScale): to accept the bottom, shoulders AND hips
//   must have descended together from their top baseline — arms bending on
//   their own can never satisfy this.
const PUSHUP_MAX_TORSO_INCLINATION = 45;
const PUSHUP_MIN_HIP_ANGLE = 150;
const PUSHUP_WRIST_MARGIN = 0.15;
const PUSHUP_MIN_MEAN_DROP = 0.05;

function pushupSignals(f: PoseFeatures, ctx: SignalContext): ExerciseSignals {
  const depth = depthFromFlexion(f.elbowAngle, 165, 90);
  const reasons: string[] = [];

  const horizontal =
    f.torsoInclination !== null && f.torsoInclination <= PUSHUP_MAX_TORSO_INCLINATION;
  if (!horizontal) reasons.push('torso not horizontal');

  const straight = f.hipAngle !== null && f.hipAngle >= PUSHUP_MIN_HIP_ANGLE;
  if (!straight) reasons.push('body not straight');

  const armsPlanted =
    f.wristMid !== null &&
    f.shoulderMid !== null &&
    f.bodyScale !== null &&
    f.wristMid.y >= f.shoulderMid.y - PUSHUP_WRIST_MARGIN * f.bodyScale;
  if (!armsPlanted) reasons.push('hands not planted');

  const formValid = horizontal && straight && armsPlanted;

  return {
    depth,
    formValid,
    bottomCorroborated: descendedTogether(f, ctx, PUSHUP_MIN_MEAN_DROP),
    reasons,
  };
}

const SQUAT_FSM = {
  topEnter: 0.2,
  descendEnter: 0.35,
  bottomEnter: 0.65,
  bottomExit: 0.55,
  minVelocity: 0.12,
  minRepIntervalMs: 350,
  lostResetMs: 900,
} as const;

// Squat form gates:
// - MIN_TORSO_INCLINATION (40°): the body must be roughly upright, which
//   distinguishes a standing squat from lying down and rejects torso-only
//   bobbing. Squats allow forward lean, so the bar is generous.
// - MIN_HIP_DROP (0.08·bodyScale): to accept the bottom, the hips must have
//   actually descended from their standing baseline — bending the knees while
//   propped up cannot satisfy it.
const SQUAT_MIN_TORSO_INCLINATION = 40;
const SQUAT_MIN_HIP_DROP = 0.08;

function squatSignals(f: PoseFeatures, ctx: SignalContext): ExerciseSignals {
  const depth = depthFromFlexion(f.kneeAngle, 170, 90);
  const reasons: string[] = [];

  const upright =
    f.torsoInclination !== null && f.torsoInclination >= SQUAT_MIN_TORSO_INCLINATION;
  if (!upright) reasons.push('torso not upright');

  return {
    depth,
    formValid: upright,
    bottomCorroborated: hipDescended(f, ctx, SQUAT_MIN_HIP_DROP),
    reasons,
  };
}

const PULLUP_FSM = {
  topEnter: 0.2,
  descendEnter: 0.4,
  bottomEnter: 0.7,
  bottomExit: 0.6,
  minVelocity: 0.12,
  minRepIntervalMs: 400,
  lostResetMs: 1200,
} as const;

const PULLUP_MIN_TORSO_INCLINATION = 55;

function pullupSignals(f: PoseFeatures, ctx: SignalContext): ExerciseSignals {
  // Active extreme = arms fully flexed pulling the chin to the bar.
  const depth = depthFromFlexion(f.elbowAngle, 160, 55);
  const reasons: string[] = [];

  const hanging =
    f.torsoInclination !== null && f.torsoInclination >= PULLUP_MIN_TORSO_INCLINATION;
  if (!hanging) reasons.push('body not vertical');

  const handsOverhead =
    f.wristMid !== null && f.shoulderMid !== null && f.wristMid.y <= f.shoulderMid.y;
  if (!handsOverhead) reasons.push('hands not overhead');

  return {
    depth,
    formValid: hanging && handsOverhead,
    // The body must actually rise (shoulders move up) to accept the top.
    bottomCorroborated: shouldersRose(f, ctx, 0.05),
    reasons,
  };
}

const LUNGE_FSM = {
  topEnter: 0.2,
  descendEnter: 0.35,
  bottomEnter: 0.62,
  bottomExit: 0.52,
  minVelocity: 0.12,
  minRepIntervalMs: 400,
  lostResetMs: 900,
} as const;

function lungeSignals(f: PoseFeatures, ctx: SignalContext): ExerciseSignals {
  const depth = depthFromFlexion(f.kneeAngle, 170, 90);
  const reasons: string[] = [];

  const upright =
    f.torsoInclination !== null && f.torsoInclination >= SQUAT_MIN_TORSO_INCLINATION;
  if (!upright) reasons.push('torso not upright');

  return {
    depth,
    formValid: upright,
    bottomCorroborated: hipDescended(f, ctx, 0.05),
    reasons,
  };
}

const JACK_FSM = {
  topEnter: 0.2,
  descendEnter: 0.35,
  bottomEnter: 0.7,
  bottomExit: 0.6,
  minVelocity: 0.2,
  minRepIntervalMs: 250,
  lostResetMs: 700,
} as const;

const JACK_MIN_TORSO_INCLINATION = 55;

function jackSignals(f: PoseFeatures): ExerciseSignals {
  // Active extreme = arms raised overhead (large hip–shoulder–wrist angle).
  const depth = depthFromExtension(f.shoulderAngle, 30, 150);
  const reasons: string[] = [];

  const upright =
    f.torsoInclination !== null && f.torsoInclination >= JACK_MIN_TORSO_INCLINATION;
  if (!upright) reasons.push('torso not upright');

  return {
    depth,
    formValid: upright,
    // Arm motion is the whole point; no whole-body corroboration required.
    bottomCorroborated: true,
    reasons,
  };
}

// --- Whole-body descent corroboration helpers ------------------------------
//
// Each reads the top-position baseline the counter captured while resting.
// They fail *open* (return `true`) when a baseline isn't available yet, so a
// missing baseline never causes a skipped count — it only ever adds safety.

function descendedTogether(
  f: PoseFeatures,
  ctx: SignalContext,
  minMeanDrop: number,
): boolean {
  if (
    ctx.baselineShoulderY === null ||
    ctx.baselineHipY === null ||
    f.shoulderMid === null ||
    f.hipMid === null ||
    f.bodyScale === null ||
    f.bodyScale === 0
  ) {
    return true;
  }
  const shoulderDrop = (f.shoulderMid.y - ctx.baselineShoulderY) / f.bodyScale;
  const hipDrop = (f.hipMid.y - ctx.baselineHipY) / f.bodyScale;
  return shoulderDrop > 0 && hipDrop > 0 && (shoulderDrop + hipDrop) / 2 >= minMeanDrop;
}

function hipDescended(f: PoseFeatures, ctx: SignalContext, minDrop: number): boolean {
  if (ctx.baselineHipY === null || f.hipMid === null || f.bodyScale === null || f.bodyScale === 0) {
    return true;
  }
  return (f.hipMid.y - ctx.baselineHipY) / f.bodyScale >= minDrop;
}

function shouldersRose(f: PoseFeatures, ctx: SignalContext, minRise: number): boolean {
  if (
    ctx.baselineShoulderY === null ||
    f.shoulderMid === null ||
    f.bodyScale === null ||
    f.bodyScale === 0
  ) {
    return true;
  }
  return (ctx.baselineShoulderY - f.shoulderMid.y) / f.bodyScale >= minRise;
}

/** Phase labels shared by the "down then up" exercises. */
const DOWN_UP_LABELS = {
  READY: 'Up',
  DESCENDING: 'Down',
  BOTTOM: 'Bottom',
  ASCENDING: 'Up',
  LOCKOUT: 'Up',
} as const;

export const EXERCISE_DEFINITIONS: Record<ExerciseId, ExerciseDefinition> = {
  pushup: {
    id: 'pushup',
    relevantKeypoints: UPPER_BODY,
    fsm: PUSHUP_FSM,
    phaseLabels: DOWN_UP_LABELS,
    computeSignals: pushupSignals,
  },
  squat: {
    id: 'squat',
    relevantKeypoints: LOWER_BODY,
    fsm: SQUAT_FSM,
    phaseLabels: DOWN_UP_LABELS,
    computeSignals: squatSignals,
  },
  pullup: {
    id: 'pullup',
    relevantKeypoints: UPPER_BODY,
    fsm: PULLUP_FSM,
    phaseLabels: {
      READY: 'Hang',
      DESCENDING: 'Pull',
      BOTTOM: 'Top',
      ASCENDING: 'Lower',
      LOCKOUT: 'Hang',
    },
    computeSignals: pullupSignals,
  },
  lunge: {
    id: 'lunge',
    relevantKeypoints: LOWER_BODY,
    fsm: LUNGE_FSM,
    phaseLabels: DOWN_UP_LABELS,
    computeSignals: lungeSignals,
  },
  jumping_jack: {
    id: 'jumping_jack',
    relevantKeypoints: [
      'left_shoulder',
      'right_shoulder',
      'left_hip',
      'right_hip',
      'left_wrist',
      'right_wrist',
    ],
    fsm: JACK_FSM,
    phaseLabels: {
      READY: 'Closed',
      DESCENDING: 'Open',
      BOTTOM: 'Open',
      ASCENDING: 'Close',
      LOCKOUT: 'Closed',
    },
    computeSignals: jackSignals,
  },
};
