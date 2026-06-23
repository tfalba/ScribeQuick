/**
 * fhir.tsx — displays the simulated FHIR export for a note.
 *
 * Receives the serialized bundle via route params (built on the results screen).
 * SIMULATION ONLY — the bundle is shown for copy/inspection and is never sent to
 * a real EHR. Offers a "Copy FHIR JSON" action.
 */

import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

export default function FhirScreen() {
  const params = useLocalSearchParams<{ bundle?: string; patientLabel?: string }>();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bundle = typeof params.bundle === 'string' ? params.bundle : '';

  async function handleCopy() {
    if (!bundle) return;
    try {
      await Clipboard.setStringAsync(bundle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  if (!bundle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Nothing to export</Text>
        <Text style={styles.errorText}>The FHIR bundle could not be built.</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
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
    >
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Simulated FHIR R4 export</Text>
        <Text style={styles.bannerText}>
          Mock bundle for demonstration only — it is not transmitted to any EHR.
          Contains a Composition (LOINC-coded SOAP sections) and one Condition per
          ICD-10 code.
        </Text>
      </View>

      {error && <Text style={styles.inlineError}>{error}</Text>}

      <View style={styles.codeBox}>
        <Text style={styles.codeText} selectable>
          {bundle}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleCopy}
        accessibilityRole="button"
        accessibilityLabel="Copy FHIR JSON to clipboard"
      >
        <Text style={styles.primaryButtonText}>
          {copied ? 'Copied!' : 'Copy FHIR JSON'}
        </Text>
      </Pressable>
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
  banner: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bannerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  bannerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  codeText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
