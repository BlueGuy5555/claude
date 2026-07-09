/**
 * Unit tests for the temporal-filtering primitives.
 *
 * Run with: `npx tsx src/ai/__tests__/temporalFilter.test.ts`
 */
import {
  Confirmation,
  Ema,
  MovingAverage,
  TemporalFilter,
  VelocityEstimator,
} from '../repcounting/TemporalFilter';

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

console.log('Ema');
{
  const e = new Ema(0.5);
  check('first sample passes through', e.update(10) === 10);
  check('blends toward new samples', e.update(0) === 5, `(got ${e.value})`);
  e.reset();
  check('reset clears state', e.value === null);
}

console.log('MovingAverage');
{
  const a = new MovingAverage(3);
  a.update(3);
  a.update(6);
  check('mean over partial window', a.value === 4.5, `(got ${a.value})`);
  a.update(9);
  a.update(9); // evicts the 3
  check('window slides, evicting oldest', a.value === 8, `(got ${a.value})`);
}

console.log('VelocityEstimator');
{
  const v = new VelocityEstimator(1); // no extra smoothing
  check('first sample has zero velocity', v.update(0, 0) === 0);
  // +0.5 over 100 ms → 5 units/sec.
  check('measures a rising signal', Math.abs(v.update(0.5, 100) - 5) < 1e-9, `(got ${v.value})`);
  // −0.5 over 100 ms → −5 units/sec.
  check('measures a falling signal', Math.abs(v.update(0.0, 200) + 5) < 1e-9, `(got ${v.value})`);
  check('sign flips with direction', v.value < 0);
}

console.log('VelocityEstimator — irregular frame spacing');
{
  const v = new VelocityEstimator(1);
  v.update(0, 0);
  const a = v.update(1, 500); // 1 unit over 500 ms → 2/sec
  check('normalises by actual dt', Math.abs(a - 2) < 1e-9, `(got ${a})`);
}

console.log('Confirmation');
{
  const c = new Confirmation(3);
  check('not confirmed after 1', c.update(true) === false);
  check('not confirmed after 2', c.update(true) === false);
  check('confirmed after 3', c.update(true) === true);
  check('a single false resets the streak', c.update(false) === false && c.confirmed === false);
}

console.log('TemporalFilter — bundles value + velocity + average');
{
  const f = new TemporalFilter({ emaAlpha: 1, windowSize: 4, velocitySmoothing: 1 });
  f.update(0, 0);
  const r = f.update(1, 100); // α=1 → value tracks input exactly
  check('value follows input at α=1', r.value === 1, `(got ${r.value})`);
  check('velocity is positive while rising', r.velocity > 0, `(got ${r.velocity})`);
  check('average is the windowed mean', r.average === 0.5, `(got ${r.average})`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} assertion(s) failed`);
