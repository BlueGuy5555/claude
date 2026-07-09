/**
 * Generate a reasonably unique id without pulling in a uuid dependency.
 * Combines a timestamp with random entropy; collision risk is negligible for
 * on-device workout records.
 */
export function createId(prefix = 'id'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${rand}`;
}
