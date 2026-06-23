/**
 * theme.ts — single source of truth for colors, spacing, and font sizes.
 *
 * Colors are theme-aware: `useThemeColors()` returns the light or dark palette
 * based on the OS appearance. Components build their StyleSheet from the returned
 * palette (see the `makeStyles(colors)` pattern used across the screens) so they
 * re-render and restyle automatically when the system theme changes.
 *
 * Spacing / fontSize / radius / fontWeight are theme-independent constants.
 */

import { useColorScheme } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

const lightColors = {
  primary: '#1B6CA8', // professional medical blue (fills, borders, header)
  primaryDark: '#155A8A', // text on light-blue tints (e.g. ICD container)
  primaryLight: '#E8F1F8', // light-blue tinted container surface
  primaryText: '#1B6CA8', // primary-colored TEXT/ICONS on a plain surface
  onPrimaryMuted: '#E8F1F8', // muted text on the solid primary surface
  onAccent: '#06231F', // text on the teal accent fill
  onError: '#FFFFFF', // text on a solid error fill (e.g. delete button)

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FA',

  border: '#D9E0E7',
  borderStrong: '#B7C2CD',

  text: '#1A2733',
  textSecondary: '#5A6B7B',
  textMuted: '#677480',
  textInverse: '#FFFFFF',

  accent: '#28A99E', // teal pulse accent used in the logo
  accentLight: '#E4F4F2',

  error: '#C0392B',
  errorBackground: '#FBEAE8',
  success: '#1E7E5A',

  disabled: '#A9BBCB',
};

const darkColors: typeof lightColors = {
  primary: '#1B6CA8', // same brand blue: white text on fills passes in both modes
  primaryDark: '#9CC6EE', // light blue: text on the deep-blue tinted container
  primaryLight: '#16324C', // deep-blue tinted container surface
  primaryText: '#8FBEE8', // primary-colored TEXT/ICONS readable on dark surfaces
  onPrimaryMuted: '#E8F1F8', // muted light text on the solid primary surface
  onAccent: '#06231F', // dark text on the teal accent fill
  onError: '#3A0B08', // dark text on the (lighter) error fill

  background: '#0F1720',
  surface: '#18212B',
  surfaceAlt: '#1E2832',

  border: '#2C3845',
  borderStrong: '#3C4A58',

  text: '#EEF3F7',
  textSecondary: '#AAB7C3',
  textMuted: '#76828F',
  textInverse: '#FFFFFF',

  accent: '#33B5A9',
  accentLight: '#10302D',

  error: '#E06A5E',
  errorBackground: '#3A201D',
  success: '#4FC79A',

  disabled: '#3A4654',
};

export type ThemeColors = typeof lightColors;

/** Active color palette for the current OS appearance. Re-renders on change. */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
