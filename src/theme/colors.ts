/**
 * Semantic color palettes for the light and dark themes.
 *
 * Screens and components should never hard-code hex values; instead they read
 * colors from the active theme via the `useTheme` hook. This keeps dark mode a
 * single source of truth and makes future re-theming trivial.
 */

export interface ColorScheme {
  /** App background behind all content. */
  background: string;
  /** Slightly raised background used for grouped areas. */
  backgroundElevated: string;
  /** Card / surface background. */
  surface: string;
  /** Secondary surface (e.g. inputs, pressed states). */
  surfaceAlt: string;
  /** Hairline borders and dividers. */
  border: string;

  /** Primary text. */
  text: string;
  /** Secondary / supporting text. */
  textSecondary: string;
  /** Muted text (hints, captions). */
  textMuted: string;

  /** Brand primary. */
  primary: string;
  /** Text/icon color that sits on top of `primary`. */
  onPrimary: string;
  /** Subtle tinted background derived from the primary color. */
  primarySoft: string;

  /** Secondary accent. */
  accent: string;

  /** Status colors. */
  success: string;
  warning: string;
  danger: string;

  /** Full-screen scrims (e.g. over the camera preview). */
  overlay: string;
  /** Color used on top of the camera / dark overlays. */
  onOverlay: string;

  /** Icon default color. */
  icon: string;
}

export const lightColors: ColorScheme = {
  background: '#F5F6FB',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F7',
  border: '#E3E6F0',

  text: '#111322',
  textSecondary: '#565B72',
  textMuted: '#8B90A6',

  primary: '#6C5CE7',
  onPrimary: '#FFFFFF',
  primarySoft: '#ECE9FD',

  accent: '#00B8A9',

  success: '#22A06B',
  warning: '#E08600',
  danger: '#E5484D',

  overlay: 'rgba(9, 10, 20, 0.55)',
  onOverlay: '#FFFFFF',

  icon: '#565B72',
};

export const darkColors: ColorScheme = {
  background: '#0E0F16',
  backgroundElevated: '#15161F',
  surface: '#191B26',
  surfaceAlt: '#22242F',
  border: '#2A2D3B',

  text: '#F3F4FA',
  textSecondary: '#AEB2C6',
  textMuted: '#71768C',

  primary: '#8A7BFF',
  onPrimary: '#12101F',
  primarySoft: '#241F3D',

  accent: '#2DD4C0',

  success: '#3FCF8E',
  warning: '#F5B23D',
  danger: '#FF6369',

  overlay: 'rgba(0, 0, 0, 0.6)',
  onOverlay: '#FFFFFF',

  icon: '#AEB2C6',
};
