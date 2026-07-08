/** User-facing toggles surfaced on the Settings screen. */
export interface Settings {
  /** Haptic feedback on interactions. */
  vibration: boolean;
  /** Sound effects (wired up in a later milestone). */
  sound: boolean;
  /** Force the dark palette regardless of the system appearance. */
  darkMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  vibration: true,
  sound: true,
  darkMode: false,
};
