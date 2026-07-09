/**
 * Format a duration given in seconds as a compact human string.
 * Examples: 45 -> "45s", 90 -> "1m 30s", 3661 -> "1h 1m".
 */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

/** Format a duration as mm:ss, e.g. 90 -> "01:30". Used for live timers. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(minutes)}:${pad(secs)}`;
}

/** Insert thousands separators, e.g. 1234 -> "1,234". */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** Round to at most one decimal and append " kcal", e.g. 42.4 -> "42 kcal". */
export function formatCalories(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} kcal`;
}

/**
 * Format a pace expressed in seconds-per-rep. Values below 60s read as e.g.
 * "2.4s/rep"; larger paces fall back to mm:ss. `null` renders as an em dash.
 */
export function formatPace(secondsPerRep: number | null): string {
  if (secondsPerRep == null || !Number.isFinite(secondsPerRep)) return '—';
  if (secondsPerRep < 60) {
    const rounded = Math.round(secondsPerRep * 10) / 10;
    return `${rounded}s/rep`;
  }
  return `${formatClock(secondsPerRep)}/rep`;
}

/** Compact whole-minute label, e.g. 5400s -> "90 min". */
export function formatMinutes(totalSeconds: number): string {
  return `${Math.round(totalSeconds / 60)} min`;
}

/** Format a `[0, 1]` fraction as a whole-number percentage, e.g. "72%". */
export function formatPercent(fraction: number): string {
  return `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
}

/** Signed percentage for trends, e.g. 0.28 -> "+28%", -0.1 -> "-10%". */
export function formatSignedPercent(fraction: number): string {
  const pct = Math.round(fraction * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}
