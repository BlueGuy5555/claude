/**
 * Data export & future-sync scaffolding.
 *
 * Cloud sync is *not* implemented in this milestone, but the data layer is
 * shaped so it can be. This module provides:
 *   - `toJSON` / `toCSV`: deterministic serializers for the current history.
 *   - `SYNC_TARGETS`: a declarative catalogue of destinations (CSV, JSON,
 *     Cloud, Google Fit, Apple Health) the app is designed to grow into.
 *
 * The serializers are pure string builders — no filesystem, no sharing sheet —
 * so they are unit-testable and can be wired to `expo-file-system` /
 * `expo-sharing` later without changing this code.
 */
import type { ExerciseId, WorkoutSession } from '@/types';
import { EXERCISES } from '@/constants';

/** A destination the exported data model is designed to support. */
export interface SyncTarget {
  id: 'csv' | 'json' | 'cloud' | 'google_fit' | 'apple_health';
  label: string;
  /** `ready` = implementable from today's model; `planned` = future work. */
  status: 'ready' | 'planned';
  description: string;
}

export const SYNC_TARGETS: readonly SyncTarget[] = [
  { id: 'csv', label: 'CSV', status: 'ready', description: 'Spreadsheet-friendly export.' },
  { id: 'json', label: 'JSON', status: 'ready', description: 'Full-fidelity backup.' },
  { id: 'cloud', label: 'Cloud Sync', status: 'planned', description: 'Back up across devices.' },
  { id: 'google_fit', label: 'Google Fit', status: 'planned', description: 'Share workouts with Google Fit.' },
  { id: 'apple_health', label: 'Apple Health', status: 'planned', description: 'Share workouts with Apple Health.' },
];

function exerciseName(id: ExerciseId): string {
  return EXERCISES.find((e) => e.id === id)?.name ?? id;
}

/** The current model version embedded in JSON exports (matches the DB schema). */
export const EXPORT_VERSION = 2;

/** Serialize history to a stable, versioned JSON string. */
export function toJSON(
  sessions: WorkoutSession[],
  exportedAt: Date = new Date(),
): string {
  return JSON.stringify(
    {
      app: 'RepCount',
      version: EXPORT_VERSION,
      exportedAt: exportedAt.toISOString(),
      workouts: sessions,
    },
    null,
    2,
  );
}

/** Columns emitted by the CSV export, in order. */
const CSV_COLUMNS = [
  'id',
  'date',
  'startTime',
  'endTime',
  'durationSec',
  'exercises',
  'reps',
  'calories',
  'avgRepSpeedSec',
  'avgConfidence',
  'notes',
] as const;

/** Escape a value for CSV (quote if it contains a comma, quote or newline). */
function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialize history to a CSV string (one row per session). */
export function toCSV(sessions: WorkoutSession[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = sessions.map((s) => {
    const started = new Date(s.startedAt);
    const exercises = s.sets.map((set) => exerciseName(set.exerciseId)).join(' + ');
    return [
      csvCell(s.id),
      csvCell(started.toISOString().slice(0, 10)),
      csvCell(s.startedAt),
      csvCell(s.endedAt),
      csvCell(s.durationSec),
      csvCell(exercises),
      csvCell(s.totalReps),
      csvCell(s.calories ?? ''),
      csvCell(s.avgRepSpeedSec ?? ''),
      csvCell(s.avgConfidence ?? ''),
      csvCell(s.notes ?? ''),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}
