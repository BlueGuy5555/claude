import {
  getKeypoint,
  isVisible,
  jointAngle,
  midpoint,
  normalizeProgress,
  segmentAngle,
} from '@/services/pose';
import type { ExerciseId, KeypointName, Pose } from '@/types';

/**
 * Per-frame features distilled from a pose. Storing these small numeric records
 * (rather than whole poses) keeps the rolling window allocation-light.
 */
interface Frame {
  measurable: boolean;
  horizontal: number; // 1 = torso horizontal (plank/push-up), 0 = vertical
  elbow: number; // flexion progress 0..1
  knee: number; // flexion progress 0..1
  kneeAsym: number; // |left-right| knee flexion difference 0..1
  wristAboveHead: number; // 1 if wrists above the nose
  armRaise: number; // 0..1
  legSpread: number; // 0..1
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

function angleOf(
  pose: Pose,
  [a, b, c]: readonly [KeypointName, KeypointName, KeypointName],
  threshold: number,
): number | null {
  const ka = getKeypoint(pose, a);
  const kb = getKeypoint(pose, b);
  const kc = getKeypoint(pose, c);
  if (!isVisible(ka, threshold) || !isVisible(kb, threshold) || !isVisible(kc, threshold)) {
    return null;
  }
  return jointAngle(ka, kb, kc);
}

function extractFrame(pose: Pose, threshold: number): Frame {
  const empty: Frame = {
    measurable: false,
    horizontal: 0,
    elbow: 0,
    knee: 0,
    kneeAsym: 0,
    wristAboveHead: 0,
    armRaise: 0,
    legSpread: 0,
  };

  const ls = getKeypoint(pose, 'left_shoulder');
  const rs = getKeypoint(pose, 'right_shoulder');
  const lh = getKeypoint(pose, 'left_hip');
  const rh = getKeypoint(pose, 'right_hip');
  if (
    !isVisible(ls, threshold) ||
    !isVisible(rs, threshold) ||
    !isVisible(lh, threshold) ||
    !isVisible(rh, threshold)
  ) {
    return empty;
  }

  const shoulderMid = midpoint(ls, rs);
  const hipMid = midpoint(lh, rh);
  const torsoDeg = segmentAngle(shoulderMid, hipMid);
  const horizontal = 1 - Math.abs(Math.sin((torsoDeg * Math.PI) / 180));
  const torsoLen = Math.max(1e-3, Math.abs(hipMid.y - shoulderMid.y));
  const shoulderWidth = Math.max(1e-3, Math.abs(ls.x - rs.x));

  const leftElbow = angleOf(pose, ['left_shoulder', 'left_elbow', 'left_wrist'], threshold);
  const rightElbow = angleOf(pose, ['right_shoulder', 'right_elbow', 'right_wrist'], threshold);
  const elbowAngle = pickDefined(leftElbow, rightElbow);
  const elbow = elbowAngle === null ? 0 : normalizeProgress(elbowAngle, 165, 60);

  const leftKnee = angleOf(pose, ['left_hip', 'left_knee', 'left_ankle'], threshold);
  const rightKnee = angleOf(pose, ['right_hip', 'right_knee', 'right_ankle'], threshold);
  const kneeAngle = pickMin(leftKnee, rightKnee);
  const knee = kneeAngle === null ? 0 : normalizeProgress(kneeAngle, 170, 90);
  const kneeAsym =
    leftKnee !== null && rightKnee !== null
      ? clamp01(Math.abs(leftKnee - rightKnee) / 80)
      : 0;

  const lw = getKeypoint(pose, 'left_wrist');
  const rw = getKeypoint(pose, 'right_wrist');
  const nose = getKeypoint(pose, 'nose');
  let wristAboveHead = 0;
  let armRaise = 0;
  if (isVisible(lw, threshold) && isVisible(rw, threshold)) {
    const wristMidY = (lw.y + rw.y) / 2;
    if (isVisible(nose, threshold) && wristMidY < nose.y) wristAboveHead = 1;
    armRaise = clamp01(normalizeProgress((shoulderMid.y - wristMidY) / torsoLen, -0.2, 1));
  }

  const la = getKeypoint(pose, 'left_ankle');
  const ra = getKeypoint(pose, 'right_ankle');
  let legSpread = 0;
  if (isVisible(la, threshold) && isVisible(ra, threshold)) {
    legSpread = clamp01(normalizeProgress(Math.abs(la.x - ra.x) / shoulderWidth, 0.9, 2.1));
  }

  return {
    measurable: true,
    horizontal: clamp01(horizontal),
    elbow,
    knee,
    kneeAsym,
    wristAboveHead,
    armRaise,
    legSpread,
  };
}

function pickDefined(a: number | null, b: number | null): number | null {
  if (a !== null && b !== null) return (a + b) / 2;
  return a ?? b;
}

function pickMin(a: number | null, b: number | null): number | null {
  if (a !== null && b !== null) return Math.min(a, b);
  return a ?? b;
}

/**
 * Classifies which supported exercise is being performed from a rolling window
 * of recent frames. Returns `null` until there is enough confident, decisive
 * evidence — a manual selection should override this entirely.
 */
export class ExerciseDetector {
  private readonly frames: Frame[] = [];
  private readonly windowSize: number;

  constructor(windowSize = 48) {
    this.windowSize = windowSize;
  }

  push(pose: Pose, confidenceThreshold: number): void {
    this.frames.push(extractFrame(pose, confidenceThreshold));
    if (this.frames.length > this.windowSize) this.frames.shift();
  }

  reset(): void {
    this.frames.length = 0;
  }

  /** Best-guess exercise, or `null` if the window is too sparse/ambiguous. */
  getDetected(): ExerciseId | null {
    const measurable = this.frames.filter((f) => f.measurable);
    const coverage = this.frames.length === 0 ? 0 : measurable.length / this.frames.length;
    if (measurable.length < Math.min(12, this.windowSize) || coverage < 0.5) return null;

    const horizMean = mean(measurable.map((f) => f.horizontal));
    const vertical = 1 - horizMean;
    const elbowRange = range(measurable.map((f) => f.elbow));
    const kneeRange = range(measurable.map((f) => f.knee));
    const armRange = range(measurable.map((f) => f.armRaise));
    const spreadRange = range(measurable.map((f) => f.legSpread));
    const kneeAsymMean = mean(measurable.map((f) => f.kneeAsym));
    const wristAboveFrac = mean(measurable.map((f) => f.wristAboveHead));
    const motion = Math.max(elbowRange, kneeRange, spreadRange, armRange);

    const scores: Record<ExerciseId, number> = {
      plank: horizMean * clamp01(1 - motion * 2),
      pushup: horizMean * clamp01(elbowRange * 2.2),
      pullup: vertical * wristAboveFrac * clamp01(elbowRange * 2.2),
      squat: vertical * clamp01(kneeRange * 2.2) * clamp01(1 - kneeAsymMean * 2.5),
      lunge: vertical * clamp01(kneeRange * 2.2) * clamp01(kneeAsymMean * 3),
      // A jumping jack's signature is the legs spreading apart; the arm swing
      // reinforces it but the leg motion is what separates it from arm-only
      // vertical movements like a pull-up.
      jumping_jack: vertical * clamp01(spreadRange * 2.5) * clamp01(0.4 + armRange),
    };

    let best: ExerciseId | null = null;
    let bestScore = 0;
    let runnerUp = 0;
    for (const id of Object.keys(scores) as ExerciseId[]) {
      const score = scores[id];
      if (score > bestScore) {
        runnerUp = bestScore;
        bestScore = score;
        best = id;
      } else if (score > runnerUp) {
        runnerUp = score;
      }
    }

    // Require a decent, decisive winner to avoid flip-flopping.
    if (bestScore < 0.25 || bestScore - runnerUp < 0.08) return null;
    return best;
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function range(values: number[]): number {
  if (values.length === 0) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}
