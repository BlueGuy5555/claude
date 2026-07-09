/**
 * Personal records ("PRs"), automatically detected from workout history.
 *
 * Records are always derived, never stored: recomputing them from history is
 * cheap and guarantees they can never disagree with the sessions behind them.
 */
import type { IconName } from './icon';

/** Stable identifiers for each tracked record. */
export type PersonalRecordId =
  | 'most_pushups_session'
  | 'most_squats_session'
  | 'longest_workout'
  | 'fastest_workout'
  | 'highest_avg_pace'
  | 'most_reps_day'
  | 'most_workouts_week'
  | 'most_workouts_month';

export interface PersonalRecord {
  id: PersonalRecordId;
  /** Short human title, e.g. "Most push-ups". */
  label: string;
  /** Pre-formatted value string, e.g. "42 reps" or "12m 30s". */
  display: string;
  /** Raw numeric value (for comparisons / sorting). */
  value: number;
  icon: IconName;
  /** ISO timestamp the record was set, when attributable to a moment. */
  achievedAt: string | null;
  /** Originating session, when the record maps to a single workout. */
  sessionId?: string;
}
