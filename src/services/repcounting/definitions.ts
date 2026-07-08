import {
  getKeypoint,
  isVisible,
  jointAngle,
  midpoint,
  normalizeProgress,
  segmentAngle,
} from '@/services/pose';
import type {
  ExerciseId,
  ExerciseKind,
  Handedness,
  KeypointName,
  Pose,
} from '@/types';

export interface MeasureOptions {
  confidenceThreshold: number;
  handedness: Handedness;
}

/** One frame's read of the movement, produced by an exercise definition. */
export interface RepMeasurement {
  /**
   * Movement progress in `[0, 1]`: 0 at the top/rest of the rep, 1 at the
   * bottom / peak effort. `null` means the required joints weren't confidently
   * visible this frame, so the state machine should hold its current phase.
   */
  progress: number | null;
  /** Confidence of this measurement in `[0, 1]`. */
  confidence: number;
}

export interface ExerciseDefinition {
  id: ExerciseId;
  kind: ExerciseKind;
  measure: (pose: Pose, options: MeasureOptions) => RepMeasurement;
  /** Rep exercises: progress at/above which we're at the bottom of the rep. */
  bottomEnter: number;
  /** Rep exercises: progress at/below which we're back at the top. */
  topEnter: number;
  /** Timed exercises: progress (posture quality) required to keep the clock running. */
  holdThreshold: number;
  /** Minimum ms between counted reps — rejects jitter, allows fast cadence. */
  minRepIntervalMs: number;
}

const NOT_MEASURABLE: RepMeasurement = { progress: null, confidence: 0 };

type Triple = readonly [KeypointName, KeypointName, KeypointName];

/** Interior angle + confidence for a joint triple, or null if not all visible. */
function tripleAngle(
  pose: Pose,
  [a, b, c]: Triple,
  threshold: number,
): { angle: number; confidence: number } | null {
  const ka = getKeypoint(pose, a);
  const kb = getKeypoint(pose, b);
  const kc = getKeypoint(pose, c);
  if (!isVisible(ka, threshold) || !isVisible(kb, threshold) || !isVisible(kc, threshold)) {
    return null;
  }
  const angle = jointAngle(ka, kb, kc);
  if (angle === null) return null;
  return { angle, confidence: Math.min(ka.score, kb.score, kc.score) };
}

/** Pick the better-tracked side, biasing to `handedness` on a near-tie. */
function bestSide(
  pose: Pose,
  left: Triple,
  right: Triple,
  threshold: number,
  handedness: Handedness,
): { angle: number; confidence: number } | null {
  const l = tripleAngle(pose, left, threshold);
  const r = tripleAngle(pose, right, threshold);
  if (l && r) {
    if (Math.abs(l.confidence - r.confidence) <= 0.15) return handedness === 'left' ? l : r;
    return l.confidence > r.confidence ? l : r;
  }
  return l ?? r;
}

const LEFT_ELBOW: Triple = ['left_shoulder', 'left_elbow', 'left_wrist'];
const RIGHT_ELBOW: Triple = ['right_shoulder', 'right_elbow', 'right_wrist'];
const LEFT_KNEE: Triple = ['left_hip', 'left_knee', 'left_ankle'];
const RIGHT_KNEE: Triple = ['right_hip', 'right_knee', 'right_ankle'];

/** Angle-driven rep measurement shared by push-up/squat/pull-up. */
function angleMeasure(
  pose: Pose,
  options: MeasureOptions,
  left: Triple,
  right: Triple,
  topAngle: number,
  bottomAngle: number,
): RepMeasurement {
  const side = bestSide(pose, left, right, options.confidenceThreshold, options.handedness);
  if (!side) return NOT_MEASURABLE;
  return {
    progress: normalizeProgress(side.angle, topAngle, bottomAngle),
    confidence: side.confidence,
  };
}

export const EXERCISE_DEFINITIONS: Readonly<Record<ExerciseId, ExerciseDefinition>> = {
  pushup: {
    id: 'pushup',
    kind: 'reps',
    bottomEnter: 0.6,
    topEnter: 0.35,
    holdThreshold: 0,
    minRepIntervalMs: 350,
    measure: (pose, options) =>
      angleMeasure(pose, options, LEFT_ELBOW, RIGHT_ELBOW, 165, 80),
  },

  squat: {
    id: 'squat',
    kind: 'reps',
    bottomEnter: 0.6,
    topEnter: 0.35,
    holdThreshold: 0,
    minRepIntervalMs: 350,
    measure: (pose, options) =>
      angleMeasure(pose, options, LEFT_KNEE, RIGHT_KNEE, 170, 90),
  },

  pullup: {
    id: 'pullup',
    kind: 'reps',
    bottomEnter: 0.55,
    topEnter: 0.3,
    holdThreshold: 0,
    minRepIntervalMs: 450,
    // Peak effort (chin over bar) is a *flexed* elbow, so a small angle maps to
    // progress 1 — the "bottom" of the state machine is the top of the pull.
    measure: (pose, options) =>
      angleMeasure(pose, options, LEFT_ELBOW, RIGHT_ELBOW, 165, 60),
  },

  lunge: {
    id: 'lunge',
    kind: 'reps',
    bottomEnter: 0.55,
    topEnter: 0.3,
    holdThreshold: 0,
    minRepIntervalMs: 400,
    measure: (pose, options) => {
      // Use whichever knee is more bent — that's the working front leg.
      const l = tripleAngle(pose, LEFT_KNEE, options.confidenceThreshold);
      const r = tripleAngle(pose, RIGHT_KNEE, options.confidenceThreshold);
      const working = l && r ? (l.angle < r.angle ? l : r) : (l ?? r);
      if (!working) return NOT_MEASURABLE;
      return {
        progress: normalizeProgress(working.angle, 170, 95),
        confidence: working.confidence,
      };
    },
  },

  jumping_jack: {
    id: 'jumping_jack',
    kind: 'reps',
    bottomEnter: 0.6,
    topEnter: 0.35,
    holdThreshold: 0,
    minRepIntervalMs: 250,
    measure: (pose, options) => measureJumpingJack(pose, options.confidenceThreshold),
  },

  plank: {
    id: 'plank',
    kind: 'timed',
    bottomEnter: 1,
    topEnter: 0,
    holdThreshold: 0.55,
    minRepIntervalMs: 0,
    measure: (pose, options) => measurePlank(pose, options.confidenceThreshold),
  },
};

/**
 * Jumping jacks combine two signals — arms rising overhead and feet spreading
 * apart. We average whichever are measurable so the count still works if, say,
 * the ankles briefly drop out but the wrists are clearly overhead.
 */
function measureJumpingJack(pose: Pose, threshold: number): RepMeasurement {
  const ls = getKeypoint(pose, 'left_shoulder');
  const rs = getKeypoint(pose, 'right_shoulder');
  const lh = getKeypoint(pose, 'left_hip');
  const rh = getKeypoint(pose, 'right_hip');
  const lw = getKeypoint(pose, 'left_wrist');
  const rw = getKeypoint(pose, 'right_wrist');
  const la = getKeypoint(pose, 'left_ankle');
  const ra = getKeypoint(pose, 'right_ankle');

  const shouldersVisible = isVisible(ls, threshold) && isVisible(rs, threshold);
  const hipsVisible = isVisible(lh, threshold) && isVisible(rh, threshold);
  if (!shouldersVisible || !hipsVisible) return NOT_MEASURABLE;

  const shoulderMid = midpoint(ls, rs);
  const hipMid = midpoint(lh, rh);
  const torsoLen = Math.max(1e-3, Math.abs(hipMid.y - shoulderMid.y));
  const shoulderWidth = Math.max(1e-3, Math.abs(ls.x - rs.x));

  const signals: number[] = [];
  const confidences: number[] = [];

  // Arms: how far the wrists are above the shoulders, in torso lengths.
  const wristsVisible = isVisible(lw, threshold) && isVisible(rw, threshold);
  if (wristsVisible) {
    const wristMidY = (lw.y + rw.y) / 2;
    const raise = (shoulderMid.y - wristMidY) / torsoLen;
    signals.push(normalizeProgress(raise, -0.2, 1));
    confidences.push(Math.min(lw.score, rw.score));
  }

  // Legs: ankle separation relative to shoulder width.
  const anklesVisible = isVisible(la, threshold) && isVisible(ra, threshold);
  if (anklesVisible) {
    const spread = Math.abs(la.x - ra.x) / shoulderWidth;
    signals.push(normalizeProgress(spread, 0.9, 2.1));
    confidences.push(Math.min(la.score, ra.score));
  }

  if (signals.length === 0) return NOT_MEASURABLE;
  const progress = signals.reduce((a, b) => a + b, 0) / signals.length;
  const confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  return { progress, confidence };
}

/**
 * Plank "progress" is really posture quality: the body should be near-horizontal
 * (torso not vertical) and straight (shoulder→hip→knee close to a line). The
 * timer runs while this stays above `holdThreshold`.
 */
function measurePlank(pose: Pose, threshold: number): RepMeasurement {
  const ls = getKeypoint(pose, 'left_shoulder');
  const rs = getKeypoint(pose, 'right_shoulder');
  const lh = getKeypoint(pose, 'left_hip');
  const rh = getKeypoint(pose, 'right_hip');
  const lk = getKeypoint(pose, 'left_knee');
  const rk = getKeypoint(pose, 'right_knee');
  if (
    !isVisible(ls, threshold) ||
    !isVisible(rs, threshold) ||
    !isVisible(lh, threshold) ||
    !isVisible(rh, threshold)
  ) {
    return NOT_MEASURABLE;
  }

  const shoulderMid = midpoint(ls, rs);
  const hipMid = midpoint(lh, rh);

  // Horizontalness: torso segment angle near 0/180° scores 1, vertical scores 0.
  const torsoDeg = segmentAngle(shoulderMid, hipMid);
  const horizontal = 1 - Math.abs(Math.sin((torsoDeg * Math.PI) / 180));

  // Straightness: shoulder→hip→knee close to a straight line scores 1.
  let straight = horizontal;
  const knee = isVisible(lk, threshold) ? lk : isVisible(rk, threshold) ? rk : undefined;
  if (knee) {
    const bodyAngle = jointAngle(shoulderMid, hipMid, knee);
    if (bodyAngle !== null) straight = normalizeProgress(bodyAngle, 120, 180);
  }

  return {
    progress: (horizontal + straight) / 2,
    confidence: Math.min(ls.score, rs.score, lh.score, rh.score),
  };
}

export function getDefinition(id: ExerciseId): ExerciseDefinition {
  return EXERCISE_DEFINITIONS[id];
}
