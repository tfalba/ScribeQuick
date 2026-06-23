/**
 * results.tsx — displays a generated (or previously saved) SOAP note.
 *
 * Two modes, driven by route params:
 *  - "new":   soap JSON is passed in from the new-note screen; shows a Save button.
 *  - "saved": an `id` is passed in; the note is loaded from storage (already saved).
 *
 * Supports edit-before-save: the patient label, the four SOAP sections, and the
 * ICD-10 codes can all be edited. Editing a saved note updates it in place.
 * Always offers "Copy Full Note" (formatted plain text to clipboard).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SoapSection from '../components/SoapSection';
import type { SoapNote } from '../services/openai';
import { getNoteById, saveNote, updateNote } from '../services/storage';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

type EditableField = 'subjective' | 'objective' | 'assessment' | 'plan';

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    soap: SoapNote;
    patientLabel: string;
  } | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);

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

  function setField(field: EditableField, value: string) {
    setSoap((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function updateCode(index: number, key: 'code' | 'description', value: string) {
    setSoap((prev) => {
      if (!prev) return prev;
      const codes = prev.icd10_codes.slice();
      codes[index] = { ...codes[index], [key]: value };
      return { ...prev, icd10_codes: codes };
    });
  }

  function removeCode(index: number) {
    setSoap((prev) =>
      prev
        ? { ...prev, icd10_codes: prev.icd10_codes.filter((_, i) => i !== index) }
        : prev
    );
  }

  function addCode() {
    setSoap((prev) =>
      prev
        ? { ...prev, icd10_codes: [...prev.icd10_codes, { code: '', description: '' }] }
        : prev
    );
  }

  function startEdit() {
    if (!soap) return;
    setSnapshot({ soap, patientLabel });
    setActionError(null);
    setJustUpdated(false);
    setEditing(true);
  }

  function cancelEdit() {
    if (snapshot) {
      setSoap(snapshot.soap);
      setPatientLabel(snapshot.patientLabel);
    }
    setActionError(null);
    setEditing(false);
  }

  async function doneEdit() {
    if (!soap) return;
    // Drop fully-empty code rows and trim the rest.
    const cleanedCodes = soap.icd10_codes
      .map((c) => ({ code: c.code.trim(), description: c.description.trim() }))
      .filter((c) => c.code || c.description);
    const cleaned: SoapNote = { ...soap, icd10_codes: cleanedCodes };
    const label = patientLabel.trim() || 'Unlabeled patient';

    // For an already-saved note, persist the edits in place.
    if (isSaved && params.id) {
      setSaving(true);
      setActionError(null);
      try {
        await updateNote(params.id, {
          soap: cleaned,
          patientLabel: label,
          rawNotes,
        });
        setSoap(cleaned);
        setPatientLabel(label);
        setEditing(false);
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2500);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : 'Could not save your changes.'
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    // For a not-yet-saved note, just apply the edits locally.
    setSoap(cleaned);
    setPatientLabel(label);
    setEditing(false);
  }

  async function handleCopy() {
    if (!soap) return;
    try {
      await Clipboard.setStringAsync(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('Could not copy to clipboard.');
    }
  }

  async function handleSave() {
    if (!soap || isSaved) return;
    setSaving(true);
    setActionError(null);
    try {
      await saveNote({ patientLabel, rawNotes, soap });
      setIsSaved(true);
    } catch (err) {
      setActionError(
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          {editing ? (
            <TextInput
              style={styles.patientInput}
              value={patientLabel}
              onChangeText={setPatientLabel}
              placeholder="Patient label"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Edit patient label"
            />
          ) : (
            <>
              <Text style={styles.patient}>{patientLabel}</Text>
              <Pressable
                onPress={startEdit}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edit note"
              >
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </>
          )}
        </View>

        {!editing && isSaved && !justUpdated && (
          <Text style={styles.savedBadge}>Saved to this device</Text>
        )}
        {!editing && justUpdated && (
          <Text style={styles.savedBadge}>Changes saved</Text>
        )}

        <SoapSection
          label="Subjective"
          content={soap.subjective}
          editable={editing}
          onChangeText={(t) => setField('subjective', t)}
        />
        <SoapSection
          label="Objective"
          content={soap.objective}
          editable={editing}
          onChangeText={(t) => setField('objective', t)}
        />
        <SoapSection
          label="Assessment"
          content={soap.assessment}
          editable={editing}
          onChangeText={(t) => setField('assessment', t)}
        />
        <SoapSection
          label="Plan"
          content={soap.plan}
          editable={editing}
          onChangeText={(t) => setField('plan', t)}
        />

        <View style={styles.icdBlock}>
          <Text style={styles.icdHeading}>ICD-10 Codes</Text>
          <Text style={styles.icdDisclaimer}>
            AI-suggested codes — verify against current ICD-10-CM before billing.
          </Text>

          {editing ? (
            <>
              {soap.icd10_codes.map((c, i) => (
                <View key={i} style={styles.icdEditRow}>
                  <TextInput
                    style={styles.codeInput}
                    value={c.code}
                    onChangeText={(t) => updateCode(i, 'code', t)}
                    placeholder="Code"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    accessibilityLabel={`Edit code ${i + 1}`}
                  />
                  <TextInput
                    style={styles.descInput}
                    value={c.description}
                    onChangeText={(t) => updateCode(i, 'description', t)}
                    placeholder="Description"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel={`Edit description ${i + 1}`}
                  />
                  <Pressable
                    onPress={() => removeCode(i)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove code ${i + 1}`}
                  >
                    <Text style={styles.removeCode}>×</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={addCode}
                style={({ pressed }) => [
                  styles.addCodeBtn,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add an ICD-10 code"
              >
                <Text style={styles.addCodeText}>+ Add code</Text>
              </Pressable>
            </>
          ) : soap.icd10_codes.length === 0 ? (
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

        {!editing && soap.coding_rationale?.trim() ? (
          <View style={styles.rationaleBlock}>
            <Text style={styles.rationaleHeading}>Coding Rationale</Text>
            <Text style={styles.rationaleText}>
              {soap.coding_rationale.trim()}
            </Text>
          </View>
        ) : null}

        {actionError && <Text style={styles.inlineError}>{actionError}</Text>}

        {editing ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                saving && styles.buttonDisabled,
              ]}
              onPress={doneEdit}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Finish editing"
            >
              {saving ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSaved ? 'Save Changes' : 'Done'}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
                saving && styles.buttonDisabled,
              ]}
              onPress={cancelEdit}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
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
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  patient: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  patientInput: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editLink: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
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
  icdEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  codeInput: {
    width: 96,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    marginRight: spacing.sm,
  },
  descInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  removeCode: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.error,
    paddingHorizontal: spacing.sm,
  },
  addCodeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  addCodeText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
