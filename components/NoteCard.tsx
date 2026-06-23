/**
 * NoteCard — a tappable card summarizing a saved note in the history list.
 * Shows the patient label, formatted date, and a preview of the Assessment.
 * Deleting requires an inline two-step confirmation (no alert dialogs).
 */

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SavedNote } from '../services/storage';
import {
  fontSize,
  fontWeight,
  radius,
  spacing,
  useThemeColors,
  type ThemeColors,
} from '../constants/theme';

interface NoteCardProps {
  note: SavedNote;
  onPress: () => void;
  onDelete: () => void;
}

function formatDate(epochMs: number): string {
  try {
    return new Date(epochMs).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function NoteCard({ note, onPress, onDelete }: NoteCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const preview = note.soap.assessment?.trim() || 'No assessment recorded.';
  const [confirming, setConfirming] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open note for ${note.patientLabel}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.header}>
        <Text style={styles.patient} numberOfLines={1}>
          {note.patientLabel}
        </Text>
        {confirming ? (
          <View style={styles.confirmRow}>
            <Pressable
              onPress={() => setConfirming(false)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Cancel delete"
            >
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Confirm delete note for ${note.patientLabel}`}
            >
              <Text style={styles.confirmDelete}>Delete</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Delete note for ${note.patientLabel}`}
          >
            <Text style={styles.delete}>Delete</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.date}>{formatDate(note.createdAt)}</Text>
      <Text style={styles.previewLabel}>Assessment</Text>
      <Text style={styles.preview} numberOfLines={2}>
        {preview}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    cardPressed: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.borderStrong,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    patient: {
      flex: 1,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.text,
    },
    delete: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.error,
      marginLeft: spacing.md,
    },
    confirmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.md,
    },
    cancel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
      paddingHorizontal: spacing.sm,
    },
    confirmDelete: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.onError,
      backgroundColor: colors.error,
      overflow: 'hidden',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    date: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    previewLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.primaryText,
      marginBottom: spacing.xs,
    },
    preview: {
      fontSize: fontSize.md,
      lineHeight: 22,
      color: colors.textSecondary,
    },
  });
