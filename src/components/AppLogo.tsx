import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { useTheme } from '@/theme';

interface AppLogoProps {
  size?: number;
}

/**
 * The RepCount mark: a rounded gradient disc with a stylised "rep pulse" line,
 * evoking both fitness reps and signal detection. Drawn with react-native-svg
 * so it stays crisp at any size and adapts to the active theme colors.
 */
export function AppLogo({ size = 96 }: AppLogoProps) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="repcount-grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={theme.colors.primary} />
          <Stop offset="1" stopColor={theme.colors.accent} />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="46" fill="url(#repcount-grad)" />
      <Path
        d="M20 52 H36 L43 34 L54 66 L61 48 H80"
        fill="none"
        stroke={theme.colors.onPrimary}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
