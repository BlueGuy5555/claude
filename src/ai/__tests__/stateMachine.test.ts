/**
 * Unit tests for the generic {@link ExerciseStateMachine}.
 *
 * Run with: `npx tsx src/ai/__tests__/stateMachine.test.ts`
 *
 * These drive the machine directly with hand-built depth/velocity frames so the
 * transition logic is tested in isolation from pose geometry and smoothing.
 */
import { ExerciseStateMachine, type RepFrame } from '../repcounting/ExerciseStateMachine';
import type { StateMachineConfig } from '../repcounting/types';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

const CONFIG: StateMachineConfig = {
  topEnter: 0.2,
  descendEnter: 0.35,
  bottomEnter: 0.65,
  bottomExit: 0.55,
  minVelocity: 0.12,
  minRepIntervalMs: 300,
  lostResetMs: 900,
};

function frame(depth: number | null, velocity: number, timestamp: number, over: Partial<RepFrame> = {}): RepFrame {
  return { depth, velocity, formValid: true, bottomCorroborated: true, timestamp, ...over };
}

/** Drive the machine through one full round trip and return completions. */
function fullRep(m: ExerciseStateMachine, t0: number): number {
  let completed = 0;
  const steps: [number, number][] = [
    [0.05, 0], // at top
    [0.5, 4], // descending
    [0.9, 4], // bottom
    [0.9, 0], // hold bottom
    [0.5, -4], // ascending
    [0.05, -4], // back to top → count
    [0.05, 0], // settle
  ];
  let t = t0;
  for (const [d, v] of steps) {
    t += 80;
    if (m.update(frame(d, v, t)).repCompleted) completed += 1;
  }
  return completed;
}

console.log('State machine — a clean round trip counts one rep');
{
  const m = new ExerciseStateMachine(CONFIG);
  const c = fullRep(m, 0);
  check('one completion', c === 1, `(got ${c})`);
  check('count is 1', m.count === 1, `(got ${m.count})`);
  check('returns to READY', m.state === 'READY', `(got ${m.state})`);
}

console.log('State machine — visits every phase in order');
{
  const m = new ExerciseStateMachine(CONFIG);
  const seen: string[] = [];
  const record = (f: RepFrame) => {
    m.update(f);
    if (seen[seen.length - 1] !== m.state) seen.push(m.state);
  };
  let t = 0;
  record(frame(0.05, 0, (t += 80)));
  record(frame(0.5, 4, (t += 80)));
  record(frame(0.9, 4, (t += 80)));
  record(frame(0.5, -4, (t += 80)));
  record(frame(0.05, -4, (t += 80)));
  record(frame(0.05, 0, (t += 80)));
  check(
    'READY→DESCENDING→BOTTOM→ASCENDING→LOCKOUT→READY',
    seen.join(',') === 'READY,DESCENDING,BOTTOM,ASCENDING,LOCKOUT,READY',
    `(got ${seen.join(',')})`,
  );
}

console.log('State machine — cascades through phases in a single low-FPS frame');
{
  const m = new ExerciseStateMachine(CONFIG);
  let t = 0;
  m.update(frame(0.05, 0, (t += 80))); // top
  // One frame jumps straight to the bottom (a fast rep between two frames).
  const a = m.update(frame(0.95, 8, (t += 80)));
  check('reaches BOTTOM in one frame', m.state === 'BOTTOM' && !a.repCompleted, `(got ${m.state})`);
  // Next frame jumps straight back to the top → the rep completes.
  const b = m.update(frame(0.05, -8, (t += 80)));
  check('completes on the return frame', b.repCompleted && m.count === 1, `(got ${m.count})`);
}

console.log('State machine — a partial rep (no valid bottom) is not counted');
{
  const m = new ExerciseStateMachine(CONFIG);
  let t = 0;
  m.update(frame(0.05, 0, (t += 80)));
  m.update(frame(0.45, 4, (t += 80))); // descends but not past bottomEnter
  m.update(frame(0.5, 2, (t += 80)));
  m.update(frame(0.05, -4, (t += 80))); // back to top
  check('count stays 0', m.count === 0, `(got ${m.count})`);
  check('recovered to READY', m.state === 'READY', `(got ${m.state})`);
}

console.log('State machine — uncorroborated bottom is refused');
{
  const m = new ExerciseStateMachine(CONFIG);
  let t = 0;
  m.update(frame(0.05, 0, (t += 80)));
  // Deep enough, but the whole-body descent check says no (arms only).
  m.update(frame(0.9, 4, (t += 80), { bottomCorroborated: false }));
  check('does not enter BOTTOM', m.state === 'DESCENDING', `(got ${m.state})`);
  m.update(frame(0.05, -4, (t += 80)));
  check('no rep counted', m.count === 0, `(got ${m.count})`);
}

console.log('State machine — lost tracking mid-rep aborts without counting');
{
  const m = new ExerciseStateMachine(CONFIG);
  let t = 0;
  m.update(frame(0.05, 0, (t += 80)));
  m.update(frame(0.9, 4, (t += 80))); // at bottom
  check('at BOTTOM', m.state === 'BOTTOM');
  // Form lost for longer than lostResetMs.
  m.update(frame(null, 0, (t += 80), { formValid: false }));
  m.update(frame(null, 0, (t += 1000), { formValid: false }));
  check('aborts to READY', m.state === 'READY', `(got ${m.state})`);
  check('no rep counted', m.count === 0, `(got ${m.count})`);
}

console.log('State machine — brief dropout is forgiven');
{
  const m = new ExerciseStateMachine(CONFIG);
  let t = 0;
  m.update(frame(0.05, 0, (t += 80)));
  m.update(frame(0.9, 4, (t += 80)));
  m.update(frame(null, 0, (t += 80), { formValid: false })); // short blip
  check('stays at BOTTOM through a short blip', m.state === 'BOTTOM', `(got ${m.state})`);
  m.update(frame(0.5, -4, (t += 80)));
  m.update(frame(0.05, -4, (t += 80)));
  check('rep still completes', m.count === 1, `(got ${m.count})`);
}

console.log('State machine — minRepInterval blocks an impossibly fast double');
{
  const m = new ExerciseStateMachine(CONFIG);
  fullRep(m, 0); // one rep around t≈80..560
  // Immediately slam another round trip within 300 ms of the first count.
  let t = 600;
  m.update(frame(0.9, 8, (t += 20)));
  m.update(frame(0.05, -8, (t += 20)));
  check('second sub-interval rep is dropped', m.count === 1, `(got ${m.count})`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} assertion(s) failed`);
