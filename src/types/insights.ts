/**
 * Lightweight, rule-based insights. No AI, no network — each insight is a small
 * pure function over recent history (see `insightsService`).
 */
import type { IconName } from './icon';

/** Emotional colour of an insight, used to tint its icon. */
export type InsightTone = 'positive' | 'neutral' | 'negative';

export type InsightId =
  | 'weekly_reps_trend'
  | 'new_record'
  | 'inactivity'
  | 'favourite_exercise'
  | 'duration_trend'
  | 'streak'
  | 'first_workout';

export interface Insight {
  id: InsightId;
  /** The sentence shown to the user. */
  text: string;
  icon: IconName;
  tone: InsightTone;
}
