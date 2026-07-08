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

/** Kilojoules per kilocalorie. */
const KJ_PER_KCAL = 4.184;

/**
 * Format an energy value (given in kilocalories) for display. Metric users see
 * kilojoules — the unit used on nutrition labels across much of the world —
 * while imperial users see kilocalories ("Cal").
 */
export function formatEnergy(kcal: number, units: 'metric' | 'imperial'): string {
  if (units === 'metric') return `${formatNumber(kcal * KJ_PER_KCAL)} kJ`;
  return `${formatNumber(kcal)} kcal`;
}

/** The short energy unit label for the given measurement system. */
export function energyUnitLabel(units: 'metric' | 'imperial'): string {
  return units === 'metric' ? 'kJ' : 'kcal';
}
