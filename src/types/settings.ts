/** How the app decides between the light and dark palettes. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Measurement system used when presenting figures such as energy. */
export type Units = 'metric' | 'imperial';

/** User-facing preferences surfaced on the Settings screen. */
export interface Settings {
  /** Light, dark, or follow the device appearance. */
  themeMode: ThemeMode;
  /** Haptic feedback on interactions. */
  vibration: boolean;
  /** Sound effects during workouts. */
  sound: boolean;
  /** Measurement system for displayed figures. */
  units: Units;
}

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  vibration: true,
  sound: true,
  units: 'metric',
};
