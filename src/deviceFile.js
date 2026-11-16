// Saving notes to a real file on the device.
//
// A web page can't write to the disk on its own. With the File System Access
// API (Chrome, Edge and other Chromium browsers) the user picks a file once
// and the page may then keep writing to it. Where that API is missing
// (Firefox, Safari, most phones) the app falls back to export / import.

import { normalizeNotes } from './storage';

export const FILE_NAME = 'paperleaf-notes.json';
const FILE_TYPES = [{ description: 'Paperleaf notes', accept: { 'application/json': ['.json'] } }];

export const canUseDeviceFile = () =>
  typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;

// ---- Remembering the chosen file between visits (IndexedDB can hold a file handle) ----
const DB_NAME = 'paperleaf';
const STORE = 'kv';
const HANDLE_KEY = 'notes-file';

function withStore(mode, run) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => {
        db.close();
        resolve(request?.result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}

export const rememberHandle = (handle) => withStore('readwrite', (store) => store.put(handle, HANDLE_KEY));
export const forgetHandle = () => withStore('readwrite', (store) => store.delete(HANDLE_KEY));
export const recallHandle = () => withStore('readonly', (store) => store.get(HANDLE_KEY)).catch(() => null);

// ---- Permission ----
// The browser forgets write permission when the tab closes; asking again
// needs a click from the user.
export async function hasPermission(handle) {
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
}

export async function askPermission(handle) {
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
}

// ---- Picking a file ----
/** Returns null if the user closes the picker without choosing. */
async function pick(open) {
  try {
    return await open();
  } catch (error) {
    if (error?.name === 'AbortError') return null;
    throw error;
  }
}

export const pickNewFile = () =>
  pick(() => window.showSaveFilePicker({ suggestedName: FILE_NAME, types: FILE_TYPES }));

export const pickExistingFile = () =>
  pick(async () => (await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false }))[0]);

// ---- File contents ----
export function serializeNotes(notes) {
  return JSON.stringify({ app: 'paperleaf', version: 1, savedAt: Date.now(), notes }, null, 2);
}

/** Accepts a Paperleaf file (or a bare list of notes). Throws if it is neither. */
export function parseNotesFile(text) {
  if (!text.trim()) return [];
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data?.notes;
  if (!Array.isArray(list)) throw new Error('This is not a Paperleaf notes file.');
  return normalizeNotes(list);
}

export async function readNotesFile(handle) {
  const file = await handle.getFile();
  return parseNotesFile(await file.text());
}

export async function writeNotesFile(handle, notes) {
  const writable = await handle.createWritable();
  await writable.write(serializeNotes(notes));
  await writable.close();
}

/**
 * Combine two sets of notes without losing any: every note from either side
 * is kept, and where both have the same note the more recently edited wins.
 */
export function mergeNotes(mine, theirs) {
  const byId = new Map(mine.map((note) => [note.id, note]));
  for (const note of theirs) {
    const existing = byId.get(note.id);
    if (!existing || note.updatedAt > existing.updatedAt) byId.set(note.id, note);
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Works in every browser: hand the notes to the user as a download. */
export function downloadNotes(notes) {
  const url = URL.createObjectURL(new Blob([serializeNotes(notes)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
