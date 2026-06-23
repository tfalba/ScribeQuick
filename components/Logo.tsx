/**
 * Logo — the ScribeQuick brand mark, rendered entirely from React Native views
 * so it scales cleanly and stays theme-aware (no image asset or SVG dependency).
 *
 * The mark is a rounded blue "note" tile holding an "S" monogram with a small
 * teal pulse line — a nod to clinical vitals. Pass `showWordmark` to render the
 * "ScribeQuick" wordmark and an optional tagline beneath it.
 */

import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

interface LogoProps {
  /** Pixel size of the square mark. */
  size?: number;
  /** Render the "ScribeQuick" wordmark below the mark. */
  showWordmark?: boolean;
  /** Optional tagline shown under the wordmark. */
  tagline?: string;
}

export default function Logo({
  size = 72,
  showWordmark = false,
  tagline,
}: LogoProps) {
  const markRadius = size * 0.26;
  const letterSize = size * 0.5;
  const pulseWidth = size * 0.46;

  return (
    <View style={styles.container} accessibilityRole="image" accessibilityLabel="ScribeQuick logo">
      <View
        style={[
          styles.mark,
          { width: size, height: size, borderRadius: markRadius },
        ]}
      >
        <Text style={[styles.letter, { fontSize: letterSize }]}>S</Text>
        <View style={[styles.pulse, { width: pulseWidth }]}>
          <View style={styles.pulseBase} />
          <View style={styles.pulseSpike} />
          <View style={styles.pulseBase} />
        </View>
      </View>

      {showWordmark && (
        <>
          <Text style={styles.wordmark}>
            Scribe<Text style={styles.wordmarkAccent}>Quick</Text>
          </Text>
          {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  mark: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // subtle depth
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  letter: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
    lineHeight: undefined,
  },
  pulse: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 2,
  },
  pulseBase: {
    flex: 1,
    height: 2,
    backgroundColor: colors.accent,
    marginBottom: 3,
    borderRadius: 1,
  },
  pulseSpike: {
    width: 10,
    height: 9,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.accent,
    marginHorizontal: 1,
  },
  wordmark: {
    marginTop: spacing.lg,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  wordmarkAccent: {
    color: colors.primary,
  },
  tagline: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
