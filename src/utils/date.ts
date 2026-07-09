const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight (local time) of the given date, as a new Date. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return a new Date `n` days after `date` (n may be negative). */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** True when two dates fall on the same calendar day (local time). */
export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Whole-day difference between two dates (a - b), ignoring the time of day. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

/**
 * Midnight of the Monday that begins the ISO week containing `date`.
 * (Monday-based weeks match how most fitness apps present "this week".)
 */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  // getDay(): 0 = Sun … 6 = Sat. Shift so Monday is the first day.
  const offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
}

/** Midnight of the first day of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole-week difference between the weeks containing a and b (a - b). */
export function weeksBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfWeek(a).getTime() - startOfWeek(b).getTime()) / (7 * MS_PER_DAY),
  );
}

/** Whole-month difference between a and b (a - b), by calendar month. */
export function monthsBetween(a: Date, b: Date): number {
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

/** True when `iso` falls within the last 7 days (including today). */
export function isWithinLastWeek(iso: string, now: Date = new Date()): boolean {
  const diff = daysBetween(now, new Date(iso));
  return diff >= 0 && diff < 7;
}

/**
 * ISO-8601 week number (1–53). Used for weekly chart labels ("W23"). Based on
 * the Thursday of the current week, per the ISO standard.
 */
export function isoWeekNumber(date: Date): number {
  const d = startOfDay(date);
  // Thursday in current week decides the year.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  firstThursday.setDate(
    firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7),
  );
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
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

/** Weekday + day + month, e.g. "Mon, 6 Jul". */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Full date, e.g. "Monday, 6 July 2026". */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Month + year, e.g. "July 2026". */
export function formatMonthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/** Time of day, e.g. "4:05 PM". */
export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Single-letter/short weekday for compact axes, e.g. "Mon". */
export function formatWeekday(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

/** Short month for compact axes, e.g. "Jul". */
export function formatMonthShort(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short' });
}
