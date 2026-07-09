import type { RepState, StateMachineConfig } from './types';

/** One observation handed to the machine after temporal filtering. */
export interface RepFrame {
  /** Smoothed progression, `0` (top) … `1` (bottom); `null` if unmeasurable. */
  depth: number | null;
  /** Smoothed depth velocity, units per second (`+` down, `−` up). */
  velocity: number;
  /** Per-frame form gate (orientation / straightness / anchoring / confidence). */
  formValid: boolean;
  /** Whether a bottom reading is corroborated by whole-body descent. */
  bottomCorroborated: boolean;
  /** Frame timestamp, ms. */
  timestamp: number;
}

export interface StepResult {
  state: RepState;
  repCompleted: boolean;
}

/**
 * The generic repetition finite state machine.
 *
 * ```
 *              depth↑ past descendEnter (moving down)
 *      READY ─────────────────────────────────▶ DESCENDING
 *        ▲                                            │
 *        │ back to top (LOCKOUT settles)              │ depth↑ past bottomEnter
 *        │                                            │ AND whole-body descent
 *   LOCKOUT ◀── reached top ── ASCENDING ◀───── BOTTOM
 *        ▲       (count rep!)      ▲   │            │
 *        └─────────────────────────┘   └── re-dip ─┘ depth↓ past bottomExit
 *                                          (no count)   (moving up)
 *
 *   DESCENDING ── returns to top without a valid bottom ──▶ READY   (abort, no count)
 *   any state  ── form/confidence lost for lostResetMs   ──▶ READY   (abort, no count)
 * ```
 *
 * ### Why it is robust
 *
 * - **Full round trip required.** A rep is counted only when the signal goes
 *   `top → bottom (≥ bottomEnter, corroborated) → top (≤ topEnter)`. A partial
 *   rep never reaches `bottomEnter`, so it can never be counted.
 * - **Hysteresis.** `descendEnter`/`topEnter` and `bottomEnter`/`bottomExit`
 *   are separated by dead bands, so jitter hovering around one threshold cannot
 *   toggle the state.
 * - **Direction gating.** Arming requires downward velocity and starting the
 *   ascent requires upward velocity, so noise that merely wobbles in place
 *   never advances the machine.
 * - **Cascading transitions.** One `update` applies as many transitions as the
 *   signal warrants. At 10–15 FPS a fast rep can jump `top → bottom` (or
 *   `bottom → top → count`) inside a single frame gap; cascading means we never
 *   get "stuck" waiting for an intermediate frame that the camera never
 *   delivered. This is the key to counting fast reps at a low frame rate.
 * - **Abort recovery.** Coming back up without reaching the bottom, or losing
 *   the athlete for too long, quietly resets to READY with no phantom count.
 */
export class ExerciseStateMachine {
  private stateValue: RepState = 'READY';
  private reps = 0;
  // -Infinity so the very first rep is never blocked by the interval gate,
  // regardless of the absolute timestamp the frames happen to start at.
  private lastRepAt = -Infinity;
  private reachedBottom = false;
  private lostSince: number | null = null;

  constructor(private readonly config: StateMachineConfig) {}

  get state(): RepState {
    return this.stateValue;
  }

  get count(): number {
    return this.reps;
  }

  reset(): void {
    this.stateValue = 'READY';
    this.reps = 0;
    this.lastRepAt = -Infinity;
    this.reachedBottom = false;
    this.lostSince = null;
  }

  update(frame: RepFrame): StepResult {
    // Unmeasurable pose or bad form: freeze, and abort a stalled rep if the
    // dropout outlasts `lostResetMs`.
    if (frame.depth === null || !frame.formValid) {
      if (this.stateValue !== 'READY') {
        if (this.lostSince === null) {
          this.lostSince = frame.timestamp;
        } else if (frame.timestamp - this.lostSince >= this.config.lostResetMs) {
          this.abort();
        }
      }
      return { state: this.stateValue, repCompleted: false };
    }
    this.lostSince = null;

    // Apply transitions until the machine settles (bounded against loops).
    // Cascading lets one frame advance several phases — the key to counting
    // fast reps at a low frame rate. We stop as soon as a rep completes so the
    // transient LOCKOUT phase remains observable for one frame before it
    // settles back to READY on the next update.
    let repCompleted = false;
    for (let i = 0; i < 8; i += 1) {
      const step = this.step(frame.depth, frame.velocity, frame.bottomCorroborated, frame.timestamp);
      if (step.completed) {
        repCompleted = true;
        break;
      }
      if (!step.changed) break;
    }

    return { state: this.stateValue, repCompleted };
  }

  private abort(): void {
    this.stateValue = 'READY';
    this.reachedBottom = false;
    this.lostSince = null;
  }

  /** Apply at most one transition; report whether it changed / completed a rep. */
  private step(
    depth: number,
    velocity: number,
    bottomCorroborated: boolean,
    timestamp: number,
  ): { changed: boolean; completed: boolean } {
    const c = this.config;

    switch (this.stateValue) {
      case 'READY':
        if (depth >= c.descendEnter && velocity > c.minVelocity) {
          this.stateValue = 'DESCENDING';
          return { changed: true, completed: false };
        }
        return { changed: false, completed: false };

      case 'DESCENDING':
        if (depth >= c.bottomEnter && bottomCorroborated) {
          this.stateValue = 'BOTTOM';
          this.reachedBottom = true;
          return { changed: true, completed: false };
        }
        if (depth <= c.topEnter) {
          // Came back up without a valid bottom — an aborted / partial rep.
          this.abort();
          return { changed: true, completed: false };
        }
        return { changed: false, completed: false };

      case 'BOTTOM':
        if (depth <= c.bottomExit && velocity < -c.minVelocity) {
          this.stateValue = 'ASCENDING';
          return { changed: true, completed: false };
        }
        return { changed: false, completed: false };

      case 'ASCENDING':
        if (depth >= c.bottomEnter) {
          // Dipped back down before locking out — stay honest, don't count.
          this.stateValue = 'BOTTOM';
          return { changed: true, completed: false };
        }
        if (depth <= c.topEnter) {
          const completed =
            this.reachedBottom && timestamp - this.lastRepAt >= c.minRepIntervalMs;
          if (completed) {
            this.reps += 1;
            this.lastRepAt = timestamp;
          }
          this.stateValue = 'LOCKOUT';
          this.reachedBottom = false;
          return { changed: true, completed };
        }
        return { changed: false, completed: false };

      case 'LOCKOUT':
        if (depth >= c.descendEnter && velocity > c.minVelocity) {
          // Straight into the next rep (fast cadence) without settling.
          this.stateValue = 'DESCENDING';
          return { changed: true, completed: false };
        }
        if (depth <= c.topEnter) {
          this.stateValue = 'READY';
          return { changed: true, completed: false };
        }
        return { changed: false, completed: false };

      default:
        return { changed: false, completed: false };
    }
  }
}
