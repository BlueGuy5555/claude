import type { ExerciseId, Pose } from '@/types';

/**
 * The single contract every pose source implements. Keeping inference behind
 * this interface is what lets the rest of the app — rep counting, the HUD,
 * statistics — stay completely agnostic about *how* poses are produced.
 *
 * The render loop pulls the most recent pose each frame via
 * {@link getLatestPose}; a real detector runs its model on a background frame
 * processor and simply hands back whatever it last computed, while the bundled
 * {@link SimulatedPoseDetector} synthesizes motion. Either way the consumer code
 * is identical.
 */
export interface PoseDetector {
  /** Stable identifier, e.g. `'simulated'` or `'movenet-lightning'`. */
  readonly id: string;
  /** Human-readable label for debug overlays. */
  readonly label: string;
  /** Whether this detector performs real on-device inference. */
  readonly isReal: boolean;

  /** Load model weights / warm up. Safe to call once before use. */
  load(): Promise<void>;

  /**
   * Return the latest pose known at `nowMs` (a monotonic clock in ms), or
   * `null` if no person is currently tracked / the detector isn't ready.
   */
  getLatestPose(nowMs: number): Pose | null;

  /** Optional hint about the exercise being performed (used by the simulator). */
  setExercise?(exerciseId: ExerciseId): void;

  /** Release every native resource. Must be idempotent. */
  dispose(): void;
}
