/**
 * theme.ts — single source of truth for colors, spacing, and font sizes.
 * Every screen and component pulls from here so the app stays visually consistent.
 */

export const colors = {
  primary: '#1B6CA8', // professional medical blue
  primaryDark: '#155A8A',
  primaryLight: '#E8F1F8',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FA',

  border: '#D9E0E7',
  borderStrong: '#B7C2CD',

  text: '#1A2733',
  textSecondary: '#5A6B7B',
  textMuted: '#8A98A6',
  textInverse: '#FFFFFF',

  accent: '#28A99E', // teal pulse accent used in the logo
  accentLight: '#E4F4F2',

  error: '#C0392B',
  errorBackground: '#FBEAE8',
  success: '#1E7E5A',

  disabled: '#A9BBCB',
} as const;

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
