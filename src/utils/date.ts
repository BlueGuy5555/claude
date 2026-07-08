const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight (local time) of the given date, as a new Date. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole-day difference between two dates (a - b), ignoring the time of day. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

/** True when `iso` falls within the last 7 days (including today). */
export function isWithinLastWeek(iso: string, now: Date = new Date()): boolean {
  const diff = daysBetween(now, new Date(iso));
  return diff >= 0 && diff < 7;
}

/**
 * Human-friendly relative label for a timestamp, e.g. "Today", "Yesterday",
 * "3 days ago", or a locale date for anything older than a week.
 */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const diff = daysBetween(now, new Date(iso));
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
