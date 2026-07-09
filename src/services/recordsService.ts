/**
 * Automatic personal-record detection.
 *
 * Records are derived from history every time — recomputing is cheap and means
 * a PR can never fall out of sync with the workouts that produced it. Each
 * detector reduces the session list to a single best value; detectors that find
 * nothing (e.g. no push-ups logged yet) are omitted from the result.
 */
import type {
  ExerciseId,
  PersonalRecord,
  PersonalRecordId,
  WorkoutSession,
} from '@/types';
import {
  formatDuration,
  formatPace,
  formatShortDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/utils';

/** Reps of one exercise within a session (0 if absent). */
function repsOf(session: WorkoutSession, exerciseId: ExerciseId): number {
  return session.sets
    .filter((s) => s.exerciseId === exerciseId)
    .reduce((sum, s) => sum + s.reps, 0);
}

/** Session that maximizes a numeric selector; ties broken by earliest date. */
function bestSession(
  sessions: WorkoutSession[],
  value: (s: WorkoutSession) => number,
): { session: WorkoutSession; value: number } | null {
  let best: { session: WorkoutSession; value: number } | null = null;
  for (const s of sessions) {
    const v = value(s);
    if (v <= 0) continue;
    if (!best || v > best.value) best = { session: s, value: v };
  }
  return best;
}

/** Peak total over calendar buckets; returns the winning bucket + value. */
function peakBucketValue(
  sessions: WorkoutSession[],
  bucketer: (d: Date) => Date,
  value: (s: WorkoutSession) => number,
): { isoDate: string; value: number } | null {
  const totals = new Map<number, number>();
  for (const s of sessions) {
    const key = bucketer(new Date(s.startedAt)).getTime();
    totals.set(key, (totals.get(key) ?? 0) + value(s));
  }
  let best: { key: number; value: number } | null = null;
  for (const [key, v] of totals) {
    if (v <= 0) continue;
    if (!best || v > best.value) best = { key, value: v };
  }
  return best ? { isoDate: new Date(best.key).toISOString(), value: best.value } : null;
}

export function computePersonalRecords(
  sessions: WorkoutSession[],
): PersonalRecord[] {
  if (sessions.length === 0) return [];
  const records: PersonalRecord[] = [];

  const pushRecord = (
    id: PersonalRecordId,
    label: string,
    display: string,
    value: number,
    icon: PersonalRecord['icon'],
    achievedAt: string | null,
    sessionId?: string,
  ) => {
    records.push({ id, label, display, value, icon, achievedAt, sessionId });
  };

  // Most push-ups in a session.
  const pushups = bestSession(sessions, (s) => repsOf(s, 'pushup'));
  if (pushups) {
    pushRecord(
      'most_pushups_session',
      'Most push-ups',
      `${pushups.value} reps`,
      pushups.value,
      'fitness-outline',
      pushups.session.startedAt,
      pushups.session.id,
    );
  }

  // Most squats in a session.
  const squats = bestSession(sessions, (s) => repsOf(s, 'squat'));
  if (squats) {
    pushRecord(
      'most_squats_session',
      'Most squats',
      `${squats.value} reps`,
      squats.value,
      'body-outline',
      squats.session.startedAt,
      squats.session.id,
    );
  }

  // Longest workout (by duration).
  const longest = bestSession(sessions, (s) => s.durationSec);
  if (longest) {
    pushRecord(
      'longest_workout',
      'Longest workout',
      formatDuration(longest.value),
      longest.value,
      'time-outline',
      longest.session.startedAt,
      longest.session.id,
    );
  }

  // Only "substantial" sessions (≥ 10 reps) are eligible for the pace-based
  // records, so a one-rep warm-up can't trivially win "fastest".
  const paced = sessions.filter((s) => s.totalReps >= 10 && s.durationSec > 0);

  // Fastest workout: the shortest total duration among substantial sessions.
  const fastest = paced.reduce<{ session: WorkoutSession; dur: number } | null>(
    (best, s) => (!best || s.durationSec < best.dur ? { session: s, dur: s.durationSec } : best),
    null,
  );
  if (fastest) {
    pushRecord(
      'fastest_workout',
      'Fastest workout',
      formatDuration(fastest.dur),
      // Lower is better, so store the reciprocal-ish rank isn't meaningful here;
      // keep the raw seconds and let the UI treat "fastest" as its own category.
      fastest.dur,
      'flash-outline',
      fastest.session.startedAt,
      fastest.session.id,
    );
  }

  // Highest average pace: the most reps per minute for a substantial session.
  const paceBest = paced.reduce<{ session: WorkoutSession; pace: number } | null>(
    (best, s) => {
      const pace = s.durationSec / s.totalReps; // seconds per rep — lower is faster
      return !best || pace < best.pace ? { session: s, pace } : best;
    },
    null,
  );
  if (paceBest) {
    pushRecord(
      'highest_avg_pace',
      'Highest pace',
      formatPace(paceBest.pace),
      // Store as reps-per-minute so "higher is better" for sorting.
      Math.round((60 / paceBest.pace) * 10) / 10,
      'speedometer-outline',
      paceBest.session.startedAt,
      paceBest.session.id,
    );
  }

  // Most reps in a single day.
  const repDay = peakBucketValue(sessions, startOfDay, (s) => s.totalReps);
  if (repDay) {
    pushRecord(
      'most_reps_day',
      'Most reps in a day',
      `${repDay.value} reps`,
      repDay.value,
      'flame-outline',
      repDay.isoDate,
    );
  }

  // Most workouts in a week.
  const week = peakBucketValue(sessions, startOfWeek, () => 1);
  if (week && week.value > 1) {
    pushRecord(
      'most_workouts_week',
      'Most workouts / week',
      `${week.value} workouts`,
      week.value,
      'calendar-outline',
      week.isoDate,
    );
  }

  // Most workouts in a month.
  const month = peakBucketValue(sessions, startOfMonth, () => 1);
  if (month && month.value > 1) {
    pushRecord(
      'most_workouts_month',
      'Most workouts / month',
      `${month.value} workouts`,
      month.value,
      'trophy-outline',
      month.isoDate,
    );
  }

  return records;
}

/** Convenience for the "best day" achievement label used elsewhere. */
export function describeAchievement(record: PersonalRecord): string {
  return record.achievedAt
    ? `${record.label} · ${formatShortDate(record.achievedAt)}`
    : record.label;
}
