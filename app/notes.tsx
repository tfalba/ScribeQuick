/**
 * notes.tsx — "Recent Notes" history screen.
 *
 * Lists saved SOAP notes (most recent first), reloading on focus so newly saved
 * notes appear after returning from the results screen. Searchable by patient
 * label or assessment. Tapping a card opens it read-only on the results screen.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NoteCard from '../components/NoteCard';
import { deleteNote, getNotes, type SavedNote } from '../services/storage';
import {
  fontSize,
  fontWeight,
  radius,
  spacing,
  useThemeColors,
  type ThemeColors,
} from '../constants/theme';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const haystack = `${n.patientLabel} ${n.soap.assessment}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, query]);

  const loadNotes = useCallback(async () => {
    const stored = await getNotes();
    setNotes(stored);
    setLoading(false);
  }, []);

  // Refresh whenever the screen comes back into focus.
  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  async function handleDelete(id: string) {
    // Optimistic removal; reload from storage if it fails.
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNote(id);
    } catch {
      loadNotes();
    }
  }

  function renderEmpty() {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (query.trim()) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptyText}>
            No notes match “{query.trim()}”. Try a different patient label or
            keyword.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No notes yet</Text>
        <Text style={styles.emptyText}>
          Tap “New Visit Note” to turn rough visit observations into a structured
          SOAP note.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {!loading && notes.length > 0 && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by patient or assessment"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search saved notes"
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listEmpty,
        ]}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() =>
              router.push({ pathname: '/results', params: { id: item.id } })
            }
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={renderEmpty}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={({ pressed }) => [
            styles.newButton,
            pressed && styles.newButtonPressed,
          ]}
          onPress={() => router.push('/new-note')}
          accessibilityRole="button"
          accessibilityLabel="Create a new visit note"
        >
          <Text style={styles.newButtonText}>+ New Visit Note</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
    },
    searchInput: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
    },
    listContent: {
      padding: spacing.lg,
      flexGrow: 1,
    },
    listEmpty: {
      justifyContent: 'center',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    newButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    newButtonPressed: {
      opacity: 0.85,
    },
    newButtonText: {
      color: colors.textInverse,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
  });
