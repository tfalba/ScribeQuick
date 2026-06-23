/**
 * index.tsx — welcome / landing screen.
 *
 * Branded hero (logo + tagline) over two entry points: start a New Visit Note,
 * or jump to Recent Notes. The Recent Notes card shows a live saved-note count,
 * refreshed whenever this screen regains focus.
 */

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../components/Logo';
import { getNotes } from '../services/storage';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

const TAGLINE = 'Rough notes in. Structured SOAP out.';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [noteCount, setNoteCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getNotes().then((notes) => {
        if (active) setNoteCount(notes.length);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const recentSubtitle =
    noteCount === null
      ? 'Browse your saved SOAP notes'
      : noteCount === 0
        ? 'No saved notes yet'
        : `${noteCount} saved note${noteCount === 1 ? '' : 's'}`;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={styles.hero}>
        <Logo size={84} showWordmark tagline={TAGLINE} />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            styles.cardPrimary,
            pressed && styles.cardPressed,
          ]}
          onPress={() => router.push('/new-note')}
          accessibilityRole="button"
          accessibilityLabel="Start a new visit note"
        >
          <View style={[styles.iconBadge, styles.iconBadgePrimary]}>
            <Text style={styles.iconBadgeText}>+</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, styles.cardTitleOnPrimary]}>
                New Visit Note
              </Text>
              <View style={styles.voiceBadge}>
                <Text style={styles.voiceBadgeText}>VOICE</Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, styles.cardSubtitleOnPrimary]}>
              Type or dictate observations into a SOAP note
            </Text>
          </View>
          <Text style={[styles.chevron, styles.chevronOnPrimary]}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.card,
            styles.cardSecondary,
            pressed && styles.cardPressed,
          ]}
          onPress={() => router.push('/notes')}
          accessibilityRole="button"
          accessibilityLabel="View recent notes"
        >
          <View style={[styles.iconBadge, styles.iconBadgeSecondary]}>
            <View style={styles.listGlyphLine} />
            <View style={styles.listGlyphLine} />
            <View style={[styles.listGlyphLine, styles.listGlyphLineShort]} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Recent Notes</Text>
            <Text style={styles.cardSubtitle}>{recentSubtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.footerNote}>
        Voice dictation · AI SOAP & ICD-10 · Saved on this device
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  actions: {
    gap: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardPrimary: {
    backgroundColor: colors.primary,
  },
  cardSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardBody: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  voiceBadgeText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cardTitleOnPrimary: {
    color: colors.textInverse,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  cardSubtitleOnPrimary: {
    color: colors.primaryLight,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgePrimary: {
    backgroundColor: colors.primaryDark,
  },
  iconBadgeText: {
    color: colors.textInverse,
    fontSize: 30,
    fontWeight: fontWeight.bold,
    lineHeight: 34,
  },
  iconBadgeSecondary: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
  },
  listGlyphLine: {
    height: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginVertical: 2,
  },
  listGlyphLineShort: {
    width: '60%',
    alignSelf: 'flex-start',
  },
  chevron: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  chevronOnPrimary: {
    color: colors.primaryLight,
  },
  footerNote: {
    marginTop: 'auto',
    paddingTop: spacing.xxl,
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
