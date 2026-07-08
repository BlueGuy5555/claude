/** Static, build-time app metadata. */
export const APP = {
  name: 'RepCount',
  tagline: 'Offline AI rep counter',
  version: '1.0.0',
  /** Everything runs on-device; this flag documents that intent in code. */
  offlineOnly: true,
} as const;

/**
 * Body weight (kg) assumed by the offline calorie estimate when no explicit
 * weight is available. MET-based estimates scale linearly with body mass, so
 * this is the single knob that trades accuracy for zero required user input.
 */
export const DEFAULT_BODY_WEIGHT_KG = 70;
