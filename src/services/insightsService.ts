/**
 * Lightweight, rule-based insights — deliberately no AI, no network.
 *
 * Each rule is a small pure function over recent history; a rule either returns
 * an {@link Insight} or `null` when it has nothing to say. `generateInsights`
 * runs them in priority order and returns the top few, so the UI shows the most
 * relevant nudges without becoming noisy.
 */
import type { Insight, WorkoutSession } from '@/types';
import { addDays, daysBetween, startOfWeek } from '@/utils';

import { mostTrainedExercise, summarize } from './analyticsService';
import { computeStreaks } from './streakService';

/** Reps within `[from, to)`. */
function repsBetween(sessions: WorkoutSession[], from: Date, to: Date): number {
  const a = from.getTime();
  const b = to.getTime();
  return sessions.reduce((sum, s) => {
    const t = new Date(s.startedAt).getTime();
    return t >= a && t < b ? sum + s.totalReps : sum;
  }, 0);
}

/** Compare this week's reps to last week's. */
function weeklyTrend(sessions: WorkoutSession[], now: Date): Insight | null {
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const thisWeek = repsBetween(sessions, thisWeekStart, addDays(thisWeekStart, 7));
  const lastWeek = repsBetween(sessions, lastWeekStart, thisWeekStart);
  if (lastWeek === 0 || thisWeek === 0) return null;
  const change = (thisWeek - lastWeek) / lastWeek;
  if (Math.abs(change) < 0.1) return null; // ignore noise below 10%
  const pct = Math.round(Math.abs(change) * 100);
  return change > 0
    ? {
        id: 'weekly_reps_trend',
        text: `You trained ${pct}% more this week than last week.`,
        icon: 'trending-up-outline',
        tone: 'positive',
      }
    : {
        id: 'weekly_reps_trend',
        text: `You trained ${pct}% less this week than last week.`,
        icon: 'trending-down-outline',
        tone: 'negative',
      };
}

/** Warn when the last workout was several days ago. */
function inactivity(sessions: WorkoutSession[], now: Date): Insight | null {
  if (sessions.length === 0) return null;
  const latest = sessions.reduce((max, s) => {
    const t = new Date(s.startedAt).getTime();
    return t > max ? t : max;
  }, 0);
  const days = daysBetween(now, new Date(latest));
  if (days < 2) return null;
  return {
    id: 'inactivity',
    text: `You haven't worked out for ${days} days. Time for a quick session?`,
    icon: 'alarm-outline',
    tone: 'negative',
  };
}

/** Celebrate an active streak of 3+ days. */
function streak(sessions: WorkoutSession[], now: Date): Insight | null {
  const { currentStreakDays } = computeStreaks(sessions, now);
  if (currentStreakDays < 3) return null;
  return {
    id: 'streak',
    text: `You're on a ${currentStreakDays}-day streak. Keep it going!`,
    icon: 'flame-outline',
    tone: 'positive',
  };
}

/** Name the most-trained exercise once there's enough history. */
function favouriteExercise(sessions: WorkoutSession[]): Insight | null {
  if (sessions.length < 3) return null;
  const id = mostTrainedExercise(sessions);
  if (!id) return null;
  const dist = summarize(sessions);
  if (dist.reps === 0) return null;
  const name =
    { pushup: 'Push-ups', squat: 'Squats', pullup: 'Pull-ups', lunge: 'Lunges', jumping_jack: 'Jumping jacks' }[id] ??
    id;
  return {
    id: 'favourite_exercise',
    text: `${name} are your most trained exercise.`,
    icon: 'star-outline',
    tone: 'neutral',
  };
}

/** Compare this week's average workout duration to last week's. */
function durationTrend(sessions: WorkoutSession[], now: Date): Insight | null {
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const inWindow = (from: Date, to: Date) =>
    sessions.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= from.getTime() && t < to.getTime();
    });
  const thisWeek = inWindow(thisWeekStart, addDays(thisWeekStart, 7));
  const lastWeek = inWindow(lastWeekStart, thisWeekStart);
  if (thisWeek.length === 0 || lastWeek.length === 0) return null;
  const avg = (arr: WorkoutSession[]) =>
    arr.reduce((sum, s) => sum + s.durationSec, 0) / arr.length;
  const a = avg(thisWeek);
  const b = avg(lastWeek);
  if (b === 0) return null;
  const change = (a - b) / b;
  if (change < 0.15) return null; // only surface a clear increase
  return {
    id: 'duration_trend',
    text: 'Your average workout duration increased this week.',
    icon: 'hourglass-outline',
    tone: 'positive',
  };
}

/**
 * Celebrate when the *most recent* session is an all-time best for single-
 * session reps — a cheap proxy for "you set a new personal record".
 */
function newRecord(sessions: WorkoutSession[], now: Date): Insight | null {
  if (sessions.length < 2) return null;
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  const latest = sorted[0]!;
  if (latest.totalReps === 0) return null;
  if (daysBetween(now, new Date(latest.startedAt)) > 1) return null;
  const priorBest = Math.max(...sorted.slice(1).map((s) => s.totalReps));
  if (latest.totalReps <= priorBest) return null;
  return {
    id: 'new_record',
    text: `New personal record — ${latest.totalReps} reps in a single workout!`,
    icon: 'ribbon-outline',
    tone: 'positive',
  };
}

/** Encourage a brand-new user. */
function firstWorkout(sessions: WorkoutSession[], now: Date): Insight | null {
  if (sessions.length !== 1) return null;
  const only = sessions[0]!;
  if (daysBetween(now, new Date(only.startedAt)) > 1) return null;
  return {
    id: 'first_workout',
    text: 'Great start — your first workout is logged! Consistency is next.',
    icon: 'sparkles-outline',
    tone: 'positive',
  };
}

/**
 * Run every rule and return up to `limit` insights, ordered by priority
 * (streak and records first, gentle nudges last).
 */
export function generateInsights(
  sessions: WorkoutSession[],
  now: Date = new Date(),
  limit = 4,
): Insight[] {
  if (sessions.length === 0) return [];
  const candidates = [
    firstWorkout(sessions, now),
    newRecord(sessions, now),
    streak(sessions, now),
    weeklyTrend(sessions, now),
    inactivity(sessions, now),
    durationTrend(sessions, now),
    favouriteExercise(sessions),
  ];
  return candidates.filter((c): c is Insight => c !== null).slice(0, limit);
}
