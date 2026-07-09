/**
 * Integration tests for the redesigned rep-counting pipeline.
 *
 * Run with: `npx tsx src/ai/__tests__/PosePipeline.test.ts`
 *
 * No test framework required — assertions throw and a summary is printed — so
 * this exercises the exact TypeScript the app ships without pulling in any
 * React Native / native dependencies. Poses are synthesised to be geometrically
 * realistic (a horizontal plank for push-ups, an upright stance for squats) so
 * the multi-signal gates are genuinely exercised, not bypassed.
 */
import { KEYPOINT_NAMES } from '../keypoints';
import { PosePipeline } from '../PosePipeline';
import type { Keypoint, KeypointName, Pose, Point } from '../types';

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

const DT = 80; // ms per frame ≈ 12.5 FPS, the app's low-FPS target.

/** Build a full 17-keypoint pose; unspecified joints sit at centre. */
function makePose(
  overrides: Partial<Record<KeypointName, Point>>,
  score: number,
  timestamp: number,
): Pose {
  const keypoints: Keypoint[] = KEYPOINT_NAMES.map((name) => {
    const o = overrides[name];
    return { name, x: o?.x ?? 0.5, y: o?.y ?? 0.5, score };
  });
  return { keypoints, score, timestamp };
}

/** Mirror a single value onto both left/right members of a joint pair. */
function pair(base: KeypointName, alt: KeypointName, p: Point): Partial<Record<KeypointName, Point>> {
  return { [base]: p, [alt]: p } as Partial<Record<KeypointName, Point>>;
}

// --- Push-up: a horizontal plank whose upper body descends with `p` ---------
//
// p = 0 is the top (arms extended), p = 1 the bottom (elbows ~85°). Shoulders,
// hips, knees stay colinear and horizontal (straight plank); wrists are planted
// on the ground; the whole upper body lowers as p grows.
function pushupPose(p: number, ts: number, score = 0.9): Pose {
  const bodyY = 0.45 + 0.18 * p; // upper body descends
  const groundY = 0.85;
  const sx = 0.4;
  const shoulder: Point = { x: sx, y: bodyY };
  const hip: Point = { x: 0.68, y: bodyY };
  const knee: Point = { x: 0.82, y: bodyY };
  const ankle: Point = { x: 0.95, y: bodyY };
  const wrist: Point = { x: sx, y: groundY };

  // Place the elbow so the shoulder–elbow–wrist angle sweeps 170° → 85°.
  const theta = (170 - 85 * p) * (Math.PI / 180);
  const half = (groundY - bodyY) / 2;
  const d = half / Math.tan(theta / 2); // half·cot(θ/2)
  const elbow: Point = { x: sx + d, y: (bodyY + groundY) / 2 };

  return makePose(
    {
      ...pair('left_shoulder', 'right_shoulder', shoulder),
      ...pair('left_elbow', 'right_elbow', elbow),
      ...pair('left_wrist', 'right_wrist', wrist),
      ...pair('left_hip', 'right_hip', hip),
      ...pair('left_knee', 'right_knee', knee),
      ...pair('left_ankle', 'right_ankle', ankle),
    },
    score,
    ts,
  );
}

// --- Squat: an upright stance whose hips descend with `p` --------------------
function squatPose(p: number, ts: number, score = 0.9): Pose {
  const hipY = 0.4 + 0.22 * p;
  const shoulderY = hipY - 0.2; // fixed torso length → vertical torso
  const groundY = 0.85;
  const cx = 0.5;
  const hip: Point = { x: cx, y: hipY };
  const shoulder: Point = { x: cx, y: shoulderY };
  const ankle: Point = { x: cx, y: groundY };

  const theta = (170 - 85 * p) * (Math.PI / 180); // knee angle 170° → 85°
  const half = (groundY - hipY) / 2;
  const d = half / Math.tan(theta / 2);
  const knee: Point = { x: cx + d, y: (hipY + groundY) / 2 };

  return makePose(
    {
      ...pair('left_shoulder', 'right_shoulder', shoulder),
      ...pair('left_hip', 'right_hip', hip),
      ...pair('left_knee', 'right_knee', knee),
      ...pair('left_ankle', 'right_ankle', ankle),
    },
    score,
    ts,
  );
}

/** Feed an explicit progress trajectory; return final reps + completion count. */
function feed(
  pipeline: PosePipeline,
  poseFor: (p: number, ts: number, score?: number) => Pose,
  progress: number[],
  opts: { startTs?: number; score?: number } = {},
): { reps: number; completions: number; lastTs: number } {
  let ts = opts.startTs ?? 0;
  let reps = 0;
  let completions = 0;
  for (const p of progress) {
    ts += DT;
    const r = pipeline.push(poseFor(p, ts, opts.score ?? 0.9));
    reps = r.reps;
    if (r.repCompleted) completions += 1;
  }
  return { reps, completions, lastTs: ts };
}

/** Ramp helper: inclusive linear samples from `a` to `b` over `n` frames. */
function ramp(a: number, b: number, n: number): number[] {
  if (n <= 1) return [b];
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

/** Build a trajectory of `count` reps at a given tempo, resting at the top. */
function reps(
  count: number,
  { down, up, topDwell, bottomDwell }: { down: number; up: number; topDwell: number; bottomDwell: number },
): number[] {
  const seq: number[] = new Array(topDwell).fill(0);
  for (let i = 0; i < count; i += 1) {
    seq.push(...ramp(0, 1, down));
    seq.push(...new Array(bottomDwell).fill(1));
    seq.push(...ramp(1, 0, up));
    seq.push(...new Array(topDwell).fill(0));
  }
  return seq;
}

console.log('Push-up — clean full reps');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  const { reps: n, completions } = feed(p, pushupPose, reps(3, { down: 4, up: 4, topDwell: 4, bottomDwell: 1 }));
  check('counts exactly 3 reps', n === 3, `(got ${n})`);
  check('emits repCompleted 3 times', completions === 3, `(got ${completions})`);
}

console.log('Push-up — fast reps at low FPS (~2 reps/sec: 3 frames down / 3 up)');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  const { reps: n } = feed(p, pushupPose, reps(4, { down: 3, up: 3, topDwell: 2, bottomDwell: 0 }));
  check('counts all 4 fast reps', n === 4, `(got ${n})`);
}

console.log('Push-up — slow reps (8 frames down / 8 up)');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  const { reps: n } = feed(p, pushupPose, reps(2, { down: 8, up: 8, topDwell: 4, bottomDwell: 1 }));
  check('counts both slow reps', n === 2, `(got ${n})`);
}

console.log('Push-up — long pauses at top and bottom');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  const { reps: n } = feed(p, pushupPose, reps(2, { down: 4, up: 4, topDwell: 8, bottomDwell: 10 }));
  check('pauses do not add or drop reps', n === 2, `(got ${n})`);
}

console.log('Push-up — partial reps are ignored');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  // Never past p ≈ 0.45 (depth < bottomEnter): down to 0.4 and back, ×4.
  const seq = [0, 0, 0, 0];
  for (let i = 0; i < 4; i += 1) seq.push(...ramp(0, 0.4, 4), ...ramp(0.4, 0, 4), 0, 0);
  const { reps: n } = feed(p, pushupPose, seq);
  check('counts 0 partial reps', n === 0, `(got ${n})`);
}

console.log('Push-up — jitter around the bottom does not double count');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  const seq = [0, 0, 0, 0, ...ramp(0, 1, 4), 0.95, 1, 0.9, 1, 0.95, ...ramp(1, 0, 4), 0, 0];
  const { reps: n } = feed(p, pushupPose, seq);
  check('counts exactly 1 rep despite bottom jitter', n === 1, `(got ${n})`);
}

console.log('Push-up — aborted rep recovers, next rep counts');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  const seq = [
    0, 0, 0, 0,
    ...ramp(0, 0.45, 4), ...ramp(0.45, 0, 4), 0, 0, // abort (never reached bottom)
    ...ramp(0, 1, 4), ...ramp(1, 0, 4), 0, 0, // full rep
  ];
  const { reps: n } = feed(p, pushupPose, seq);
  check('counts exactly 1 rep (abort not counted)', n === 1, `(got ${n})`);
}

console.log('Push-up — waving arms while SITTING is rejected');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  // Vertical torso (sitting); elbows flap up and down; hands near the shoulders.
  function sittingWave(elbowP: number, ts: number): Pose {
    const shoulder: Point = { x: 0.5, y: 0.3 };
    const hip: Point = { x: 0.5, y: 0.6 };
    const knee: Point = { x: 0.72, y: 0.62 };
    const wrist: Point = { x: 0.5, y: 0.32 };
    const theta = (170 - 90 * elbowP) * (Math.PI / 180);
    const elbow: Point = { x: 0.5 + 0.12 * Math.sin(theta / 2), y: 0.45 };
    return makePose(
      {
        ...pair('left_shoulder', 'right_shoulder', shoulder),
        ...pair('left_elbow', 'right_elbow', elbow),
        ...pair('left_wrist', 'right_wrist', wrist),
        ...pair('left_hip', 'right_hip', hip),
        ...pair('left_knee', 'right_knee', knee),
      },
      0.9,
      ts,
    );
  }
  let ts = 0;
  let n = 0;
  for (let i = 0; i < 40; i += 1) {
    ts += DT;
    n = p.push(sittingWave(i % 2 === 0 ? 1 : 0, ts)).reps;
  }
  check('counts 0 reps while sitting and waving', n === 0, `(got ${n})`);
}

console.log('Push-up — standing still never increments');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  function standing(ts: number): Pose {
    return makePose(
      {
        ...pair('left_shoulder', 'right_shoulder', { x: 0.5, y: 0.3 }),
        ...pair('left_elbow', 'right_elbow', { x: 0.5, y: 0.45 }),
        ...pair('left_wrist', 'right_wrist', { x: 0.5, y: 0.6 }),
        ...pair('left_hip', 'right_hip', { x: 0.5, y: 0.6 }),
        ...pair('left_knee', 'right_knee', { x: 0.5, y: 0.75 }),
      },
      0.9,
      ts,
    );
  }
  let ts = 0;
  let n = 0;
  for (let i = 0; i < 30; i += 1) {
    ts += DT;
    n = p.push(standing(ts)).reps;
  }
  check('counts 0 reps standing still', n === 0, `(got ${n})`);
}

console.log('Push-up — low confidence freezes the counter');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.5 });
  const { reps: n } = feed(p, pushupPose, reps(3, { down: 4, up: 4, topDwell: 4, bottomDwell: 1 }), {
    score: 0.15,
  });
  check('counts 0 reps when unconfident', n === 0, `(got ${n})`);
}

console.log('Push-up — phase labels + depth reporting');
{
  const p = new PosePipeline('pushup', { minConfidence: 0.3 });
  let last = p.push(pushupPose(0, DT));
  for (let i = 2; i <= 5; i += 1) last = p.push(pushupPose(0, i * DT));
  check('reports "Up" at the top', last.phaseLabel === 'Up', `(got ${last.phaseLabel})`);
  check('depth near 0 at the top', last.depth !== null && last.depth < 0.15, `(got ${last.depth})`);
}

console.log('Squat — clean full reps');
{
  const p = new PosePipeline('squat', { minConfidence: 0.3 });
  const { reps: n, completions } = feed(p, squatPose, reps(3, { down: 4, up: 4, topDwell: 4, bottomDwell: 1 }));
  check('counts exactly 3 reps', n === 3, `(got ${n})`);
  check('emits repCompleted 3 times', completions === 3, `(got ${completions})`);
}

console.log('Squat — partial reps are ignored');
{
  const p = new PosePipeline('squat', { minConfidence: 0.3 });
  const seq: number[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i += 1) seq.push(...ramp(0, 0.4, 4), ...ramp(0.4, 0, 4), 0, 0);
  const { reps: n } = feed(p, squatPose, seq);
  check('counts 0 partial squats', n === 0, `(got ${n})`);
}

console.log('Squat — no double count near the bottom turnaround');
{
  const p = new PosePipeline('squat', { minConfidence: 0.3 });
  const seq = [0, 0, 0, 0, ...ramp(0, 1, 4), 0.95, 1, 0.9, 1, ...ramp(1, 0, 4), 0, 0];
  const { reps: n } = feed(p, squatPose, seq);
  check('counts exactly 1 squat', n === 1, `(got ${n})`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} assertion(s) failed`);
