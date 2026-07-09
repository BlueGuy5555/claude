/**
 * Unit tests for the Session Detail view-model builder.
 *
 * Run with: `npx tsx src/services/__tests__/sessionService.test.ts`
 */
import { buildSessionDetail, estimateEffort } from '@/services';

import { makeCheck, session, summary, type Counters } from './helpers';

const counters: Counters = { passed: 0, failed: 0 };
const check = makeCheck(counters);

console.log('estimateEffort');
{
  // ~6+ kcal/min -> Intense. 30 reps over 60s at 0.32 kcal/rep = 9.6 kcal in 1 min.
  const intense = session({ date: '2026-07-09', reps: 30, durationSec: 60 });
  check('high kcal/min reads as Intense', estimateEffort(intense) === 'Intense', estimateEffort(intense));

  // Light: few reps over a long time.
  const light = session({ date: '2026-07-09', reps: 5, durationSec: 600, calories: 1.6 });
  check('low kcal/min reads as Light', estimateEffort(light) === 'Light', estimateEffort(light));

  // Zero duration is safely Light.
  const zero = session({ date: '2026-07-09', reps: 0, durationSec: 0, calories: 0 });
  check('zero-duration session is Light', estimateEffort(zero) === 'Light');
}

console.log('buildSessionDetail');
{
  const s = session({
    date: '2026-07-09',
    exercise: 'squat',
    reps: 20,
    durationSec: 120,
    hour: 9,
    repOffsetsMs: [0, 3000, 7000, 10000],
    avgConfidence: 0.82,
  });
  const vm = buildSessionDetail(s);
  check('title reflects the single exercise', vm.title === 'Squat');
  check('exposes a start label', vm.startLabel.length > 0);
  check('exposes a finish label', vm.finishLabel.length > 0 && vm.finishLabel !== '—');
  check('includes a total-reps metric', vm.metrics.some((m) => m.label === 'Total reps'));
  check('includes an average-pace metric', vm.metrics.some((m) => m.label === 'Average pace'));
  check('surfaces avg confidence when present', vm.metrics.some((m) => m.label === 'Avg confidence'));
  check(
    'rep-pace series has (reps-1) intervals',
    vm.repPaceSec.length === 3,
    `got ${vm.repPaceSec.length}`,
  );
  check('first interval is 3s', vm.repPaceSec[0] === 3, `got ${vm.repPaceSec[0]}`);
  check('provides form-analysis placeholders', vm.formPlaceholders.length > 0);
}

console.log('buildSessionDetail — minimal session');
{
  const s = session({ date: '2026-07-09', reps: 8, durationSec: 40 });
  const vm = buildSessionDetail(s);
  check('handles a session with no rep offsets', vm.repPaceSec.length === 0);
  check('still builds core metrics', vm.metrics.length >= 2);
}

summary('sessionService', counters);
