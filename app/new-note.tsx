/**
 * new-note.tsx — capture rough visit observations and generate a SOAP note.
 *
 * Collects an optional patient label and the free-text notes, calls the OpenAI
 * service, and on success forwards the structured note to the results screen.
 * Shows a loading state during the call and an inline error with retry on
 * failure (network/API or unparseable JSON, with the raw response on parse fail).
 */

import { useState } from 'react';
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
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  generateSoapNote,
  SoapParseError,
  transcribeAudio,
} from '../services/openai';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

/** Format milliseconds as m:ss for the recording timer. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function NewNoteScreen() {
  const insets = useSafeAreaInsets();
  const [patientLabel, setPatientLabel] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const isRecording = recorderState.isRecording;
  const busy = loading || transcribing;
  const canGenerate = rawNotes.trim().length > 0 && !busy && !isRecording;

  async function startRecording() {
    setVoiceError(null);
    setError(null);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setVoiceError(
          'Microphone access is needed to dictate notes. Enable it for ScribeQuick in Settings.'
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setVoiceError('Could not start recording. Please try again.');
    }
  }

  async function stopAndTranscribe() {
    try {
      await recorder.stop();
    } catch {
      setVoiceError('Could not stop the recording. Please try again.');
      return;
    }
    const uri = recorder.uri;
    if (!uri) {
      setVoiceError('No audio was captured. Please try again.');
      return;
    }
    setTranscribing(true);
    setVoiceError(null);
    try {
      const text = await transcribeAudio(uri);
      if (text) {
        // Append to whatever is already in the field.
        setRawNotes((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      } else {
        setVoiceError('No speech was detected. Try recording again.');
      }
    } catch (err) {
      setVoiceError(
        err instanceof Error ? err.message : 'Transcription failed. Please try again.'
      );
    } finally {
      setTranscribing(false);
    }
  }

  function handleMicPress() {
    if (isRecording) {
      stopAndTranscribe();
    } else {
      startRecording();
    }
  }

  async function handleGenerate() {
    if (!rawNotes.trim()) {
      setError('Please enter some visit notes first.');
      return;
    }
    setLoading(true);
    setError(null);
    setRawResponse(null);

    try {
      const soap = await generateSoapNote(rawNotes.trim());
      router.push({
        pathname: '/results',
        params: {
          soap: JSON.stringify(soap),
          rawNotes: rawNotes.trim(),
          patientLabel: patientLabel.trim(),
        },
      });
    } catch (err) {
      if (err instanceof SoapParseError) {
        setError(
          'The AI response was not in the expected format. You can retry, or review the raw response below.'
        );
        setRawResponse(err.raw || '(empty response)');
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.label}>Patient label</Text>
        <TextInput
          style={styles.input}
          value={patientLabel}
          onChangeText={setPatientLabel}
          placeholder="e.g. J.D. — Rm 4 (optional)"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          accessibilityLabel="Patient label"
        />

        <View style={styles.notesHeader}>
          <Text style={styles.notesLabel}>Visit notes</Text>
          <Pressable
            onPress={handleMicPress}
            disabled={busy}
            style={({ pressed }) => [
              styles.micButton,
              isRecording && styles.micButtonRecording,
              pressed && styles.buttonPressed,
              busy && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isRecording
                ? 'Stop recording and transcribe'
                : 'Dictate notes with your voice'
            }
          >
            {transcribing ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.micButtonText}>Transcribing…</Text>
              </>
            ) : isRecording ? (
              <>
                <View style={styles.recDot} />
                <Text style={[styles.micButtonText, styles.micButtonTextRecording]}>
                  Stop · {formatDuration(recorderState.durationMillis)}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.micGlyph} />
                <Text style={styles.micButtonText}>Dictate</Text>
              </>
            )}
          </Pressable>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={rawNotes}
          onChangeText={setRawNotes}
          placeholder="Type rough observations — or tap Dictate to speak them. Vitals, what the patient reported, what you observed, and the plan…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          editable={!busy}
          accessibilityLabel="Visit notes"
        />

        {voiceError && <Text style={styles.voiceError}>{voiceError}</Text>}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {rawResponse && (
              <ScrollView style={styles.rawBox} nestedScrollEnabled>
                <Text style={styles.rawText}>{rawResponse}</Text>
              </ScrollView>
            )}
            <Pressable
              style={styles.retryButton}
              onPress={handleGenerate}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Retry generating the note"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.generateButton,
            pressed && styles.buttonPressed,
            !canGenerate && styles.buttonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!canGenerate}
          accessibilityRole="button"
          accessibilityLabel="Generate SOAP note"
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.textInverse} />
              <Text style={styles.loadingText}>Generating SOAP note…</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>Generate Note</Text>
          )}
        </Pressable>
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  micButtonRecording: {
    borderColor: colors.error,
    backgroundColor: colors.errorBackground,
  },
  micButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  micButtonTextRecording: {
    color: colors.error,
  },
  micGlyph: {
    width: 8,
    height: 13,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  voiceError: {
    color: colors.error,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 200,
    lineHeight: 22,
  },
  errorBox: {
    backgroundColor: colors.errorBackground,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  rawBox: {
    maxHeight: 160,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  rawText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  generateButtonText: {
    color: colors.textInverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textInverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.md,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
});
