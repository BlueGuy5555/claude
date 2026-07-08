/** How the app chooses its color palette. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** Which hand/side the user favours — biases side-selection for pose analysis. */
export type Handedness = 'right' | 'left';

/** User-facing settings surfaced on the Settings screen and persisted locally. */
export interface Settings {
  /** Haptic feedback on interactions and rep milestones. */
  vibration: boolean;
  /** Sound cues on reps and phase changes. */
  sound: boolean;
  /** Color theme preference. */
  theme: ThemePreference;
  /** Mirror the camera preview horizontally (natural for a front camera). */
  cameraMirror: boolean;
  /** Preferred body side; used to disambiguate when both sides are visible. */
  handedness: Handedness;
  /** Draw the detected skeleton over the camera feed. */
  showSkeleton: boolean;
  /**
   * Minimum keypoint confidence, in `[0, 1]`, below which a joint is treated as
   * missing. Higher = stricter (fewer false detections, more dropouts).
   */
  confidenceThreshold: number;
  /** Show the debug overlay (FPS + live confidence) during a workout. */
  showFps: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  vibration: true,
  sound: true,
  theme: 'system',
  cameraMirror: true,
  handedness: 'right',
  showSkeleton: true,
  confidenceThreshold: 0.3,
  showFps: false,
};
