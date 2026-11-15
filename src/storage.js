import { DEFAULT_STYLE, FONTS, INKS, PAPER_COLORS, PAPER_TYPES, PENS } from './constants';

export const NOTES_KEY = 'paperleaf.notes.v1';
const PREFS_KEY = 'paperleaf.prefs.v1';

const has = (list, id) => list.some((item) => item.id === id);

/** Coerce anything read from storage into a valid style object. */
export function normalizeStyle(style = {}) {
  return {
    paper: has(PAPER_TYPES, style.paper) ? style.paper : DEFAULT_STYLE.paper,
    paperColor: has(PAPER_COLORS, style.paperColor) ? style.paperColor : DEFAULT_STYLE.paperColor,
    pen: has(PENS, style.pen) ? style.pen : DEFAULT_STYLE.pen,
    ink: has(INKS, style.ink) ? style.ink : DEFAULT_STYLE.ink,
    font: has(FONTS, style.font) ? style.font : DEFAULT_STYLE.font,
  };
}

function normalizeNote(note) {
  if (!note || typeof note !== 'object' || typeof note.id !== 'string') return null;
  const now = Date.now();
  return {
    id: note.id,
    title: typeof note.title === 'string' ? note.title : '',
    content: typeof note.content === 'string' ? note.content : '',
    createdAt: Number(note.createdAt) || now,
    updatedAt: Number(note.updatedAt) || Number(note.createdAt) || now,
    style: normalizeStyle(note.style),
  };
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNote(style) {
  const now = Date.now();
  return { id: newId(), title: '', content: '', createdAt: now, updatedAt: now, style: normalizeStyle(style) };
}

function welcomeNote() {
  return {
    ...createNote(DEFAULT_STYLE),
    title: 'Welcome to Paperleaf',
    content: [
      'This is your notebook. Everything you write is saved on this device — no account, no cloud.',
      '',
      'Open the tools at the bottom of the page to switch between plain and ruled paper, pick a paper colour, and choose a pen, ink and handwriting style.',
      '',
      'Each note remembers its own look. Press Back when you are done — your note is saved automatically.',
    ].join('\n'),
  };
}

export function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw === null) {
      // First visit: seed a welcome note and persist it so its id is stable.
      const seeded = [welcomeNote()];
      saveNotes(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeNote).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Returns false when the write failed (storage full or blocked). */
export function saveNotes(notes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

export function loadPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {};
    return {
      lastStyle: normalizeStyle(parsed.lastStyle),
      // On phones the tools start tucked away so the page gets the screen.
      toolbarCollapsed:
        typeof parsed.toolbarCollapsed === 'boolean'
          ? parsed.toolbarCollapsed
          : Boolean(globalThis.matchMedia?.('(max-width: 640px)').matches),
    };
  } catch {
    return { lastStyle: { ...DEFAULT_STYLE }, toolbarCollapsed: false };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* preferences are a convenience; ignore write failures */
  }
}
