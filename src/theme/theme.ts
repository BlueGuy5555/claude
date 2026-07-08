import { darkColors, lightColors, type ColorScheme } from './colors';
import { radius, spacing, type Radius, type Spacing } from './spacing';
import { fontSize, fontWeight, textVariants } from './typography';

/** The complete theme object handed to every component through context. */
export interface Theme {
  /** `true` when the dark palette is active. */
  isDark: boolean;
  colors: ColorScheme;
  spacing: Spacing;
  radius: Radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  textVariants: typeof textVariants;
}

const base = { spacing, radius, fontSize, fontWeight, textVariants } as const;

export const lightTheme: Theme = { isDark: false, colors: lightColors, ...base };
export const darkTheme: Theme = { isDark: true, colors: darkColors, ...base };

export const getTheme = (isDark: boolean): Theme => (isDark ? darkTheme : lightTheme);
