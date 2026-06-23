/**
 * results.tsx — displays a generated (or previously saved) SOAP note.
 *
 * Two modes, driven by route params:
 *  - "new":   soap JSON is passed in from the new-note screen; shows a Save button.
 *  - "saved": an `id` is passed in; the note is loaded from storage (already saved).
 *
 * Always offers "Copy Full Note" (formatted plain text to clipboard).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SoapSection from '../components/SoapSection';
import type { SoapNote } from '../services/openai';
import { getNoteById, saveNote } from '../services/storage';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

/** Format a SOAP note as readable plain text for the clipboard. */
function formatNoteForClipboard(
  patientLabel: string,
  soap: SoapNote
): string {
  const codes =
    soap.icd10_codes.length > 0
      ? soap.icd10_codes.map((c) => `  ${c.code} — ${c.description}`).join('\n')
      : '  None suggested';

  return [
    `Patient: ${patientLabel}`,
    '',
    'SUBJECTIVE',
    soap.subjective,
    '',
    'OBJECTIVE',
    soap.objective,
    '',
    'ASSESSMENT',
    soap.assessment,
    '',
    'PLAN',
    soap.plan,
    '',
    'ICD-10 CODES',
    codes,
    '',
    'AI-suggested codes — verify against current ICD-10-CM before billing.',
  ].join('\n');
}

export default function ResultsScreen() {
  const params = useLocalSearchParams<{
    soap?: string;
    rawNotes?: string;
    patientLabel?: string;
    id?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [soap, setSoap] = useState<SoapNote | null>(null);
  const [rawNotes, setRawNotes] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load the note from params (new) or from storage (saved).
  useEffect(() => {
    let active = true;

    async function load() {
      if (params.id) {
        const found = await getNoteById(params.id);
        if (!active) return;
        if (found) {
          setSoap(found.soap);
          setRawNotes(found.rawNotes);
          setPatientLabel(found.patientLabel);
          setIsSaved(true);
        } else {
          setLoadError('This note could not be found.');
        }
        setLoading(false);
        return;
      }

      if (params.soap) {
        try {
          const parsed = JSON.parse(params.soap) as SoapNote;
          if (!active) return;
          setSoap(parsed);
          setRawNotes(params.rawNotes ?? '');
          setPatientLabel(params.patientLabel?.trim() || 'Unlabeled patient');
        } catch {
          if (active) setLoadError('Could not read the generated note.');
        }
        setLoading(false);
        return;
      }

      setLoadError('Nothing to display.');
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [params.id, params.soap, params.rawNotes, params.patientLabel]);

  const plainText = useMemo(
    () => (soap ? formatNoteForClipboard(patientLabel, soap) : ''),
    [soap, patientLabel]
  );

  async function handleCopy() {
    if (!soap) return;
    try {
      await Clipboard.setStringAsync(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setSaveError('Could not copy to clipboard.');
    }
  }

  async function handleSave() {
    if (!soap || isSaved) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveNote({ patientLabel, rawNotes, soap });
      setIsSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save the note.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError || !soap) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Unable to show note</Text>
        <Text style={styles.errorText}>{loadError ?? 'Unknown error.'}</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.patient}>{patientLabel}</Text>
      {isSaved && <Text style={styles.savedBadge}>Saved to this device</Text>}

      <SoapSection label="Subjective" content={soap.subjective} />
      <SoapSection label="Objective" content={soap.objective} />
      <SoapSection label="Assessment" content={soap.assessment} />
      <SoapSection label="Plan" content={soap.plan} />

      <View style={styles.icdBlock}>
        <Text style={styles.icdHeading}>ICD-10 Codes</Text>
        <Text style={styles.icdDisclaimer}>
          AI-suggested codes — verify against current ICD-10-CM before billing.
        </Text>
        {soap.icd10_codes.length === 0 ? (
          <Text style={styles.icdEmpty}>No codes suggested.</Text>
        ) : (
          soap.icd10_codes.map((c, i) => (
            <View key={`${c.code}-${i}`} style={styles.icdRow}>
              <Text style={styles.icdCode}>{c.code}</Text>
              <Text style={styles.icdDescription}>{c.description}</Text>
            </View>
          ))
        )}
      </View>

      {soap.coding_rationale?.trim() ? (
        <View style={styles.rationaleBlock}>
          <Text style={styles.rationaleHeading}>Coding Rationale</Text>
          <Text style={styles.rationaleText}>{soap.coding_rationale.trim()}</Text>
        </View>
      ) : null}

      {saveError && <Text style={styles.inlineError}>{saveError}</Text>}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleCopy}
        accessibilityRole="button"
        accessibilityLabel="Copy full note to clipboard"
      >
        <Text style={styles.primaryButtonText}>
          {copied ? 'Copied!' : 'Copy Full Note'}
        </Text>
      </Pressable>

      {!isSaved && (
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            saving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save note to this device"
        >
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Save Note</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  patient: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  savedBadge: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.lg,
  },
  icdBlock: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  icdHeading: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  icdDisclaimer: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  icdRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  icdCode: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    width: 84,
  },
  icdDescription: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  icdEmpty: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  rationaleBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  rationaleHeading: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  rationaleText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.text,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inlineError: {
    color: colors.error,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
