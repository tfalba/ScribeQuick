/**
 * SoapSection — renders one labeled section of a SOAP note (e.g. "Subjective").
 * Read-only by default; pass `editable` + `onChangeText` to turn the content into
 * a multiline text field for edit-before-save. Reused for all four sections.
 */

import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

interface SoapSectionProps {
  label: string;
  content: string;
  editable?: boolean;
  onChangeText?: (text: string) => void;
}

export default function SoapSection({
  label,
  content,
  editable = false,
  onChangeText,
}: SoapSectionProps) {
  return (
    <View
      style={[styles.container, editable && styles.containerEditing]}
      accessible={!editable}
      accessibilityLabel={`${label} section`}
    >
      <Text style={styles.label}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={onChangeText}
          multiline
          textAlignVertical="top"
          accessibilityLabel={`Edit ${label}`}
        />
      ) : (
        <Text style={styles.content}>{content?.trim() ? content : '—'}</Text>
      )}
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
  containerEditing: {
    borderColor: colors.primary,
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
  input: {
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.text,
    minHeight: 72,
    padding: 0,
  },
});
