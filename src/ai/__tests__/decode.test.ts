/** Run with: `npx tsx src/ai/__tests__/decode.test.ts` */
import { readKeypoints, toPose } from '../movenet/decode';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`  ${ok ? '✓' : '✗'} ${name} ${ok ? '' : detail}`);
  if (!ok) failed += 1;
}

console.log('MoveNet output decoding');
{
  // 17 keypoints × (y, x, score). Give keypoint 0 a distinctive value.
  const raw = new Float32Array(17 * 3);
  raw[0] = 0.25; // y
  raw[1] = 0.75; // x
  raw[2] = 0.9; // score

  const kps = readKeypoints(raw);
  check('reads 17 keypoints', kps.length === 17);
  check('reads (y, x, score) layout', kps[0]!.x === 0.75 && kps[0]!.y === 0.25);
  check('passes score through', Math.abs(kps[0]!.score - 0.9) < 1e-6);

  const pose = toPose(kps, 1234);
  check('maps names in COCO order', pose.keypoints[0]!.name === 'nose');
  check('names the last keypoint', pose.keypoints[16]!.name === 'right_ankle');
  check('preserves timestamp', pose.timestamp === 1234);
}

console.log(`\n${failed === 0 ? 'decode OK' : `${failed} failed`}`);
if (failed > 0) throw new Error(`${failed} assertion(s) failed`);
