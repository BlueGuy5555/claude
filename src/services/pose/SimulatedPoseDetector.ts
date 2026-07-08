import { KEYPOINT_NAMES, type ExerciseId, type Keypoint, type KeypointName, type Pose } from '@/types';

import type { PoseDetector } from './PoseDetector';

/**
 * A dependency-free pose source that synthesizes a person performing the
 * selected exercise.
 *
 * Why it exists: real on-device inference needs native modules and a physical
 * device (see the README "Real pose detection" section). The simulated detector
 * lets the entire app — rep counting, the HUD, persistence, statistics — run,
 * be demoed, and be unit-tested completely offline with no camera. It emits the
 * exact same {@link Pose} shape a real detector would, so swapping in MoveNet is
 * a one-line change in `createPoseDetector`.
 *
 * Poses are generated with a tiny forward-kinematics model: each limb's joint
 * angle is driven directly, so the elbow/knee angles the rep counters read
 * sweep between realistic top/bottom values as the motion parameter `s` (0 at
 * the top of a rep, 1 at the bottom) oscillates.
 */

interface XY {
  x: number;
  y: number;
}

const DEG = Math.PI / 180;

/** Non-moving reference joints (head, shoulders, hips) in normalized space. */
const BASE: Record<KeypointName, XY> = {
  nose: { x: 0.5, y: 0.12 },
  left_eye: { x: 0.475, y: 0.105 },
  right_eye: { x: 0.525, y: 0.105 },
  left_ear: { x: 0.45, y: 0.12 },
  right_ear: { x: 0.55, y: 0.12 },
  left_shoulder: { x: 0.42, y: 0.25 },
  right_shoulder: { x: 0.58, y: 0.25 },
  left_elbow: { x: 0.4, y: 0.38 },
  right_elbow: { x: 0.6, y: 0.38 },
  left_wrist: { x: 0.4, y: 0.5 },
  right_wrist: { x: 0.6, y: 0.5 },
  left_hip: { x: 0.455, y: 0.56 },
  right_hip: { x: 0.545, y: 0.56 },
  left_knee: { x: 0.455, y: 0.72 },
  right_knee: { x: 0.545, y: 0.72 },
  left_ankle: { x: 0.44, y: 0.89 },
  right_ankle: { x: 0.56, y: 0.89 },
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Place a two-bone limb so the interior angle at the middle joint is exactly
 * `interiorDeg`. `upperDirDeg` is the direction of the first bone (0 = +x /
 * right, 90 = down); `bend` selects which way the joint folds.
 */
function fkLimb(
  anchor: XY,
  upperDirDeg: number,
  upperLen: number,
  interiorDeg: number,
  lowerLen: number,
  bend: 1 | -1,
): { mid: XY; end: XY } {
  const uRad = upperDirDeg * DEG;
  const mid: XY = {
    x: anchor.x + upperLen * Math.cos(uRad),
    y: anchor.y + upperLen * Math.sin(uRad),
  };
  const lowerDeg = upperDirDeg + 180 - bend * interiorDeg;
  const lRad = lowerDeg * DEG;
  const end: XY = {
    x: mid.x + lowerLen * Math.cos(lRad),
    y: mid.y + lowerLen * Math.sin(lRad),
  };
  return { mid, end };
}

type PoseMap = Record<KeypointName, XY>;

function clone(base: Record<KeypointName, XY>): PoseMap {
  const out = {} as PoseMap;
  for (const name of KEYPOINT_NAMES) out[name] = { ...base[name] };
  return out;
}

/** Build the raw (noise-free) joint layout for an exercise at motion phase `s`. */
function buildPose(exercise: ExerciseId, s: number): PoseMap {
  const p = clone(BASE);

  switch (exercise) {
    case 'pushup': {
      // A push-up is performed with a horizontal body, so lay the skeleton on
      // its front (head left, feet right) and flex the elbows with `s`. The
      // elbow angle still sweeps ~165° (top) → ~80° (bottom).
      const body: Record<KeypointName, XY> = {
        nose: { x: 0.18, y: 0.42 },
        left_eye: { x: 0.19, y: 0.41 },
        right_eye: { x: 0.19, y: 0.43 },
        left_ear: { x: 0.22, y: 0.41 },
        right_ear: { x: 0.22, y: 0.43 },
        left_shoulder: { x: 0.3, y: 0.44 },
        right_shoulder: { x: 0.3, y: 0.48 },
        left_elbow: { x: 0.3, y: 0.54 },
        right_elbow: { x: 0.3, y: 0.58 },
        left_wrist: { x: 0.28, y: 0.64 },
        right_wrist: { x: 0.28, y: 0.68 },
        left_hip: { x: 0.58, y: 0.46 },
        right_hip: { x: 0.58, y: 0.5 },
        left_knee: { x: 0.72, y: 0.47 },
        right_knee: { x: 0.72, y: 0.51 },
        left_ankle: { x: 0.85, y: 0.48 },
        right_ankle: { x: 0.85, y: 0.52 },
      };
      const map = clone(body);
      const interior = lerp(165, 80, s);
      const l = fkLimb(map.left_shoulder, 90, 0.1, interior, 0.11, 1);
      const r = fkLimb(map.right_shoulder, 90, 0.1, interior, 0.11, -1);
      map.left_elbow = l.mid;
      map.left_wrist = l.end;
      map.right_elbow = r.mid;
      map.right_wrist = r.end;
      return map;
    }
    case 'pullup': {
      // Whole body rises; elbow angle ~170° (hang) → ~55° (chin over bar).
      const rise = lerp(0, -0.12, s);
      for (const name of KEYPOINT_NAMES) p[name].y += rise;
      const interior = lerp(170, 55, s);
      const l = fkLimb(p.left_shoulder, 270, 0.12, interior, 0.12, -1);
      const r = fkLimb(p.right_shoulder, 270, 0.12, interior, 0.12, 1);
      p.left_elbow = l.mid;
      p.left_wrist = l.end;
      p.right_elbow = r.mid;
      p.right_wrist = r.end;
      break;
    }
    case 'squat': {
      // Hips drop; knee angle ~172° (stand) → ~80° (bottom). Thighs tilt fwd.
      const drop = lerp(0, 0.1, s);
      p.left_hip.y += drop;
      p.right_hip.y += drop;
      const thighDir = lerp(90, 65, s);
      const interior = lerp(172, 80, s);
      const l = fkLimb(p.left_hip, thighDir, 0.16, interior, 0.17, 1);
      const r = fkLimb(p.right_hip, thighDir, 0.16, interior, 0.17, 1);
      p.left_knee = l.mid;
      p.left_ankle = l.end;
      p.right_knee = r.mid;
      p.right_ankle = r.end;
      break;
    }
    case 'lunge': {
      // Front (left) knee bends ~170° → ~85°; rear leg stays extended.
      const frontInterior = lerp(170, 85, s);
      const l = fkLimb(p.left_hip, 78, 0.16, frontInterior, 0.17, 1);
      p.left_knee = l.mid;
      p.left_ankle = l.end;
      const r = fkLimb(p.right_hip, 105, 0.16, lerp(168, 150, s), 0.17, 1);
      p.right_knee = r.mid;
      p.right_ankle = r.end;
      break;
    }
    case 'jumping_jack': {
      // Arms rise overhead and feet spread apart together.
      p.left_elbow = { x: lerp(0.4, 0.34, s), y: lerp(0.38, 0.16, s) };
      p.left_wrist = { x: lerp(0.4, 0.32, s), y: lerp(0.5, 0.04, s) };
      p.right_elbow = { x: lerp(0.6, 0.66, s), y: lerp(0.38, 0.16, s) };
      p.right_wrist = { x: lerp(0.6, 0.68, s), y: lerp(0.5, 0.04, s) };
      p.left_knee = { x: lerp(0.455, 0.4, s), y: 0.72 };
      p.left_ankle = { x: lerp(0.44, 0.33, s), y: 0.89 };
      p.right_knee = { x: lerp(0.545, 0.6, s), y: 0.72 };
      p.right_ankle = { x: lerp(0.56, 0.67, s), y: 0.89 };
      break;
    }
    case 'plank': {
      // A near-horizontal hold: rotate the standing skeleton onto its front.
      const horizontal: Record<KeypointName, XY> = {
        nose: { x: 0.2, y: 0.5 },
        left_eye: { x: 0.21, y: 0.49 },
        right_eye: { x: 0.21, y: 0.51 },
        left_ear: { x: 0.24, y: 0.49 },
        right_ear: { x: 0.24, y: 0.51 },
        left_shoulder: { x: 0.3, y: 0.52 },
        right_shoulder: { x: 0.3, y: 0.56 },
        left_elbow: { x: 0.31, y: 0.66 },
        right_elbow: { x: 0.31, y: 0.7 },
        left_wrist: { x: 0.32, y: 0.78 },
        right_wrist: { x: 0.32, y: 0.82 },
        left_hip: { x: 0.58, y: 0.55 },
        right_hip: { x: 0.58, y: 0.59 },
        left_knee: { x: 0.74, y: 0.58 },
        right_knee: { x: 0.74, y: 0.62 },
        left_ankle: { x: 0.86, y: 0.6 },
        right_ankle: { x: 0.86, y: 0.64 },
      };
      return clone(horizontal);
    }
  }

  return p;
}

export interface SimulatedPoseDetectorOptions {
  exercise?: ExerciseId;
  /** Repetitions per second for rep-based exercises. */
  repsPerSecond?: number;
  /** Std-dev of positional noise added to each joint (normalized units). */
  noise?: number;
  /** Per-frame probability that a given joint briefly drops out. */
  dropoutProbability?: number;
  /** Injectable RNG for deterministic tests. Defaults to `Math.random`. */
  random?: () => number;
  /** Injectable base clock (ms). Defaults to `Date.now`. */
  now?: () => number;
}

export class SimulatedPoseDetector implements PoseDetector {
  readonly id = 'simulated';
  readonly label = 'Simulated (offline demo)';
  readonly isReal = false;

  private exercise: ExerciseId;
  private readonly repsPerSecond: number;
  private readonly noise: number;
  private readonly dropoutProbability: number;
  private readonly random: () => number;
  private readonly now: () => number;
  private startMs = 0;
  private loaded = false;

  constructor(options: SimulatedPoseDetectorOptions = {}) {
    this.exercise = options.exercise ?? 'squat';
    this.repsPerSecond = options.repsPerSecond ?? 0.5;
    this.noise = options.noise ?? 0.004;
    this.dropoutProbability = options.dropoutProbability ?? 0.01;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
  }

  async load(): Promise<void> {
    this.startMs = this.now();
    this.loaded = true;
  }

  setExercise(exerciseId: ExerciseId): void {
    this.exercise = exerciseId;
  }

  getLatestPose(nowMs: number): Pose | null {
    if (!this.loaded) return null;

    const elapsedSec = Math.max(0, (nowMs - this.startMs) / 1000);
    // Smooth 0→1→0 oscillation (cosine easing) at the configured tempo. Plank
    // barely moves so the posture is held steady.
    const phase = elapsedSec * this.repsPerSecond * 2 * Math.PI;
    const s = this.exercise === 'plank' ? 0 : (1 - Math.cos(phase)) / 2;

    const layout = buildPose(this.exercise, s);
    const keypoints: Keypoint[] = new Array(KEYPOINT_NAMES.length);
    let scoreSum = 0;
    let visible = 0;

    for (let i = 0; i < KEYPOINT_NAMES.length; i += 1) {
      const name = KEYPOINT_NAMES[i]!;
      const point = layout[name];
      const dropped = this.random() < this.dropoutProbability;
      const score = dropped ? 0.05 : 0.82 + this.random() * 0.15;
      keypoints[i] = {
        x: point.x + this.gaussian() * this.noise,
        y: point.y + this.gaussian() * this.noise,
        score,
      };
      if (!dropped) {
        scoreSum += score;
        visible += 1;
      }
    }

    return {
      keypoints,
      score: visible === 0 ? 0 : scoreSum / visible,
      timestamp: nowMs,
    };
  }

  dispose(): void {
    this.loaded = false;
  }

  /** Approximate a standard normal from the injected uniform RNG. */
  private gaussian(): number {
    return (this.random() + this.random() + this.random() - 1.5) / 1.5;
  }
}
