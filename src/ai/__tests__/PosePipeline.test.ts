/**
 * Standalone unit tests for the pure rep-counting pipeline.
 *
 * Run with: `npx tsx src/ai/__tests__/PosePipeline.test.ts`
 *
 * No test framework is required — assertions throw and a summary is printed —
 * so this exercises the exact TypeScript the app ships without pulling in any
 * React Native / native dependencies.
 */
import { KEYPOINT_NAMES } from '../keypoints';
import { PosePipeline } from '../PosePipeline';
import type { Keypoint, KeypointName, Pose } from '../types';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

const DEG = Math.PI / 180;

/** Build a full 17-keypoint pose, defaulting every joint to centre + score. */
function makePose(
  overrides: Partial<Record<KeypointName, { x: number; y: number }>>,
  score: number,
  timestamp: number,
): Pose {
  const keypoints: Keypoint[] = KEYPOINT_NAMES.map((name) => {
    const o = overrides[name];
    return { name, x: o?.x ?? 0.5, y: o?.y ?? 0.5, score };
  });
  return { keypoints, score, timestamp };
}

/** Place a joint so the angle at `vertex` equals `angleDeg`, arm pointing down. */
function armAt(vertex: { x: number; y: number }, angleDeg: number, len = 0.2) {
  const a = angleDeg * DEG;
  return { x: vertex.x + len * -Math.sin(a), y: vertex.y + len * Math.cos(a) };
}

const KNEE = { x: 0.5, y: 0.5 };
const ANKLE = { x: 0.5, y: 0.7 };
function squatPose(kneeAngle: number, ts: number, score = 0.9): Pose {
  const hip = armAt(KNEE, kneeAngle);
  return makePose(
    {
      left_hip: hip,
      right_hip: hip,
      left_knee: KNEE,
      right_knee: KNEE,
      left_ankle: ANKLE,
      right_ankle: ANKLE,
    },
    score,
    ts,
  );
}

const SHOULDER = { x: 0.5, y: 0.5 };
const HIP_DOWN = { x: 0.5, y: 0.7 };
function jackPose(shoulderAngle: number, ts: number, score = 0.9): Pose {
  const wrist = armAt(SHOULDER, shoulderAngle);
  return makePose(
    {
      left_shoulder: SHOULDER,
      right_shoulder: SHOULDER,
      left_hip: HIP_DOWN,
      right_hip: HIP_DOWN,
      left_wrist: wrist,
      right_wrist: wrist,
    },
    score,
    ts,
  );
}

/** Feed a sequence of signal values, dwelling several frames at each. */
function feed(
  pipeline: PosePipeline,
  poseFor: (angle: number, ts: number) => Pose,
  angles: number[],
  startTs = 0,
): { reps: number; completions: number } {
  let ts = startTs;
  let completions = 0;
  let reps = 0;
  for (const angle of angles) {
    // Dwell 4 frames at each target so the smoother settles past the threshold.
    for (let i = 0; i < 4; i += 1) {
      ts += 40; // ~25 fps
      const r = pipeline.push(poseFor(angle, ts));
      reps = r.reps;
      if (r.repCompleted) completions += 1;
    }
  }
  return { reps, completions };
}

console.log('Squat rep counting');
{
  const p = new PosePipeline('squat', { minConfidence: 0.3 });
  // 3 full reps: stand → deep squat → stand.
  const seq = [175, 70, 175, 70, 175, 70, 175];
  const { reps, completions } = feed(p, squatPose, seq);
  check('counts 3 full reps', reps === 3, `(got ${reps})`);
  check('emits repCompleted 3 times', completions === 3, `(got ${completions})`);
}

console.log('Squat ignores partial reps');
{
  const p = new PosePipeline('squat', { minConfidence: 0.3 });
  // Never bends below the active threshold (110°): 175 → 130 → 175 …
  const seq = [175, 130, 175, 130, 175];
  const { reps } = feed(p, squatPose, seq);
  check('counts 0 partial reps', reps === 0, `(got ${reps})`);
}

console.log('Squat does not double-count near the turnaround');
{
  const p = new PosePipeline('squat', { minConfidence: 0.3 });
  // Jitter around the bottom then come back up = still one rep.
  const seq = [175, 70, 85, 70, 85, 175];
  const { reps } = feed(p, squatPose, seq);
  check('counts exactly 1 rep', reps === 1, `(got ${reps})`);
}

console.log('Jumping jack rep counting (inverted rest zone)');
{
  const p = new PosePipeline('jumping_jack', { minConfidence: 0.3 });
  // Arms down (20°) → up (165°) → down, repeated.
  const seq = [20, 165, 20, 165, 20];
  const { reps, completions } = feed(p, jackPose, seq);
  check('counts 2 full reps', reps === 2, `(got ${reps})`);
  check('emits repCompleted 2 times', completions === 2, `(got ${completions})`);
}

console.log('Low confidence freezes the counter');
{
  const p = new PosePipeline('squat', { minConfidence: 0.5 });
  // Correct motion but every joint below the confidence floor.
  const seq = [175, 70, 175, 70, 175];
  let ts = 0;
  let reps = 0;
  for (const angle of seq) {
    for (let i = 0; i < 4; i += 1) {
      ts += 40;
      reps = p.push(squatPose(angle, ts, 0.1)).reps;
    }
  }
  check('counts 0 reps when unconfident', reps === 0, `(got ${reps})`);
}

console.log('Phase + confidence reporting');
{
  const p = new PosePipeline('squat', { minConfidence: 0.3 });
  let ts = 0;
  for (let i = 0; i < 5; i += 1) {
    ts += 40;
    p.push(squatPose(175, ts));
  }
  const rest = p.push(squatPose(175, (ts += 40)));
  check('reports rest phase label "Up"', rest.phaseLabel === 'Up', `(got ${rest.phaseLabel})`);
  check('reports confidence ~0.9', Math.abs(rest.confidence - 0.9) < 1e-6, `(got ${rest.confidence})`);
  for (let i = 0; i < 4; i += 1) p.push(squatPose(70, (ts += 40)));
  const active = p.push(squatPose(70, (ts += 40)));
  check('reports active phase label "Down"', active.phaseLabel === 'Down', `(got ${active.phaseLabel})`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} assertion(s) failed`);
