/**
 * SoapSection — renders one labeled section of a SOAP note (e.g. "Subjective").
 * Small and single-purpose; reused for all four sections on the results screen.
 */

import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

interface SoapSectionProps {
  label: string;
  content: string;
}

export default function SoapSection({ label, content }: SoapSectionProps) {
  return (
    <View style={styles.container} accessible accessibilityLabel={`${label} section`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.content}>{content?.trim() ? content : '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  content: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.text,
  },
});
