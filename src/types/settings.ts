/** Discrete confidence presets, surfaced as a segmented control in Settings. */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** Minimum per-keypoint score each preset maps to, `[0, 1]`. */
export const CONFIDENCE_THRESHOLDS: Record<ConfidenceLevel, number> = {
  low: 0.2,
  medium: 0.3,
  high: 0.4,
};

/** User-facing toggles surfaced on the Settings screen. */
export interface Settings {
  /** Haptic feedback on interactions and on each counted rep. */
  vibration: boolean;
  /** Sound effects (wired up in a later milestone). */
  sound: boolean;
  /** Force the dark palette regardless of the system appearance. */
  darkMode: boolean;

  // --- AI / pose detection ---
  /** Draw the live skeleton over the camera preview. */
  showSkeleton: boolean;
  /** Mirror the front camera preview + overlay (selfie-style). */
  mirrorFrontCamera: boolean;
  /** Show the processing FPS overlay (debug). */
  debugFps: boolean;
  /** How confident the model must be in a joint before it's trusted. */
  confidence: ConfidenceLevel;
}

export const DEFAULT_SETTINGS: Settings = {
  vibration: true,
  sound: true,
  darkMode: false,
  showSkeleton: true,
  mirrorFrontCamera: true,
  debugFps: false,
  confidence: 'medium',
};
