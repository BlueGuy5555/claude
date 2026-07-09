import { KEYPOINT_NAMES } from '../keypoints';
import type { Keypoint, Pose } from '../types';

/** A joint straight out of the model: normalized coords, no name yet. */
export interface RawKeypoint {
  x: number;
  y: number;
  score: number;
}

/**
 * Read MoveNet's raw output tensor into plain `{x, y, score}` triples.
 *
 * MoveNet SinglePose emits a `[1, 1, 17, 3]` float tensor, flattened to 51
 * numbers laid out as `(y, x, score)` per keypoint, normalized to `[0, 1]`
 * relative to the (square) input the model saw.
 *
 * Marked as a worklet so it can run inside the VisionCamera frame processor.
 * It deliberately captures no module-level values (the keypoint count is a
 * literal) so it serializes cleanly onto the worklet runtime; names are
 * attached later, on the JS thread, by {@link toPose}.
 */
export function readKeypoints(output: ArrayLike<number>): RawKeypoint[] {
  'worklet';
  const result: RawKeypoint[] = [];
  for (let i = 0; i < 17; i += 1) {
    result.push({
      y: output[i * 3] ?? 0,
      x: output[i * 3 + 1] ?? 0,
      score: output[i * 3 + 2] ?? 0,
    });
  }
  return result;
}

/** Attach COCO keypoint names and aggregate score (runs on the JS thread). */
export function toPose(raw: readonly RawKeypoint[], timestamp: number): Pose {
  const keypoints: Keypoint[] = raw.map((kp, i) => ({
    name: KEYPOINT_NAMES[i]!,
    x: kp.x,
    y: kp.y,
    score: kp.score,
  }));

  let scoreSum = 0;
  for (const kp of keypoints) scoreSum += kp.score;

  return {
    keypoints,
    score: keypoints.length === 0 ? 0 : scoreSum / keypoints.length,
    timestamp,
  };
}
