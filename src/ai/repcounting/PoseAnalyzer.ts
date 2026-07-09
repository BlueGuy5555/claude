import { getPoint } from '../keypoints';
import type { Keypoint, KeypointName, Point } from '../types';

import { AngleCalculator } from './AngleCalculator';
import type { PoseFeatures } from './types';

/** Mean of the numbers that are actually present; `null` if none are. */
function meanOf(values: readonly (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((s, v) => s + v, 0) / present.length;
}

/** Midpoint of two points when both exist, else whichever exists, else null. */
function bilateralMid(a: Point | null, b: Point | null): Point | null {
  if (a && b) return AngleCalculator.midpoint(a, b);
  return a ?? b ?? null;
}

/**
 * Turns a raw pose into a {@link PoseFeatures} bundle: joint angles, body-part
 * midpoints, torso inclination and a body-scale reference.
 *
 * The analyzer is deliberately *exercise-agnostic*. It computes everything an
 * exercise might care about and leaves the interpretation ("is this deep
 * enough?", "is the body horizontal?") to the per-exercise definitions. It is
 * also stateless: give it a confidence floor and it will read only the joints
 * the model is sure about, returning `null` for anything it can't measure.
 *
 * Every angle uses whichever of the left/right sides are visible and averages
 * them, so a partially occluded athlete (a common side-on push-up view where
 * one arm hides the other) is still measured from the visible limb.
 */
export class PoseAnalyzer {
  constructor(private readonly minScore: number) {}

  analyze(keypoints: readonly Keypoint[]): PoseFeatures {
    const p = (name: KeypointName) => getPoint(keypoints, name, this.minScore);

    const lShoulder = p('left_shoulder');
    const rShoulder = p('right_shoulder');
    const lElbow = p('left_elbow');
    const rElbow = p('right_elbow');
    const lWrist = p('left_wrist');
    const rWrist = p('right_wrist');
    const lHip = p('left_hip');
    const rHip = p('right_hip');
    const lKnee = p('left_knee');
    const rKnee = p('right_knee');
    const lAnkle = p('left_ankle');
    const rAnkle = p('right_ankle');

    const shoulderMid = bilateralMid(lShoulder, rShoulder);
    const hipMid = bilateralMid(lHip, rHip);
    const wristMid = bilateralMid(lWrist, rWrist);
    const ankleMid = bilateralMid(lAnkle, rAnkle);

    const elbowAngle = meanOf([
      lShoulder && lElbow && lWrist ? AngleCalculator.angle(lShoulder, lElbow, lWrist) : null,
      rShoulder && rElbow && rWrist ? AngleCalculator.angle(rShoulder, rElbow, rWrist) : null,
    ]);

    const shoulderAngle = meanOf([
      lElbow && lShoulder && lHip ? AngleCalculator.angle(lElbow, lShoulder, lHip) : null,
      rElbow && rShoulder && rHip ? AngleCalculator.angle(rElbow, rShoulder, rHip) : null,
    ]);

    const kneeAngle = meanOf([
      lHip && lKnee && lAnkle ? AngleCalculator.angle(lHip, lKnee, lAnkle) : null,
      rHip && rKnee && rAnkle ? AngleCalculator.angle(rHip, rKnee, rAnkle) : null,
    ]);

    const hipAngle = meanOf([
      lShoulder && lHip && lKnee ? AngleCalculator.angle(lShoulder, lHip, lKnee) : null,
      rShoulder && rHip && rKnee ? AngleCalculator.angle(rShoulder, rHip, rKnee) : null,
    ]);

    const torsoInclination =
      shoulderMid && hipMid
        ? AngleCalculator.inclinationFromHorizontal(shoulderMid, hipMid)
        : null;

    const bodyScale =
      shoulderMid && hipMid ? AngleCalculator.distance(shoulderMid, hipMid) : null;

    return {
      elbowAngle,
      shoulderAngle,
      kneeAngle,
      hipAngle,
      shoulderMid,
      hipMid,
      wristMid,
      ankleMid,
      nose: p('nose'),
      torsoInclination,
      bodyScale,
    };
  }
}
