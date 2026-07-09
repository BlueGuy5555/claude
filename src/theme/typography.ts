import type { TextStyle } from 'react-native';

/** Named font sizes. */
export const fontSize = {
  caption: 12,
  footnote: 13,
  body: 15,
  callout: 16,
  subtitle: 18,
  title: 22,
  headline: 28,
  hero: 34,
} as const;

/**
 * Font weights typed as React Native `TextStyle['fontWeight']` so they can be
 * spread directly into styles without casting.
 */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} satisfies Record<string, TextStyle['fontWeight']>;

/**
 * Ready-made text variants. Colors are applied by components (they depend on
 * the active theme), so variants only describe size / weight / spacing.
 */
export const textVariants = {
  hero: { fontSize: fontSize.hero, fontWeight: fontWeight.bold, letterSpacing: 0.2 },
  headline: { fontSize: fontSize.headline, fontWeight: fontWeight.bold },
  title: { fontSize: fontSize.title, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.body, fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  caption: { fontSize: fontSize.caption, fontWeight: fontWeight.medium },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;
