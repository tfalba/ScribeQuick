/**
 * storage.ts — ALL AsyncStorage logic lives here, nowhere else.
 *
 * Persists generated SOAP notes locally so they survive app restarts and show
 * up on the history home screen (most recent first). Every call is wrapped in
 * try/catch and surfaces a clear error rather than throwing raw storage errors.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SoapNote } from './openai';

const NOTES_KEY = '@scribequick:notes';

export interface SavedNote {
  id: string;
  /** Patient label/initials the nurse entered. */
  patientLabel: string;
  /** Epoch milliseconds the note was saved. */
  createdAt: number;
  /** The original rough notes that were entered. */
  rawNotes: string;
  /** The generated, structured SOAP note. */
  soap: SoapNote;
}

/** Build a reasonably unique id without pulling in a uuid dependency. */
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Read every saved note, sorted most-recent-first. Returns [] on any failure. */
export async function getNotes(): Promise<SavedNote[]> {
  try {
    const json = await AsyncStorage.getItem(NOTES_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return (parsed as SavedNote[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.warn('Failed to read saved notes:', err);
    return [];
  }
}

/**
 * Save a new note. Returns the created SavedNote so the caller can navigate or
 * update local state without re-reading storage.
 * @throws Error if persistence fails so the UI can show an inline message.
 */
export async function saveNote(
  input: Omit<SavedNote, 'id' | 'createdAt'>
): Promise<SavedNote> {
  try {
    const existing = await getNotes();
    const note: SavedNote = {
      ...input,
      id: makeId(),
      createdAt: Date.now(),
    };
    const next = [note, ...existing];
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
    return note;
  } catch (err) {
    console.warn('Failed to save note:', err);
    throw new Error('Could not save the note to this device. Please try again.');
  }
}

/** Delete a single note by id. @throws Error on failure. */
export async function deleteNote(id: string): Promise<void> {
  try {
    const existing = await getNotes();
    const next = existing.filter((n) => n.id !== id);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('Failed to delete note:', err);
    throw new Error('Could not delete the note. Please try again.');
  }
}

/** Fetch a single note by id, or null if not found / on error. */
export async function getNoteById(id: string): Promise<SavedNote | null> {
  try {
    const notes = await getNotes();
    return notes.find((n) => n.id === id) ?? null;
  } catch (err) {
    console.warn('Failed to read note:', err);
    return null;
  }
}
