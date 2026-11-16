import { DEFAULT_STYLE, FONTS, INKS, PAPER_COLORS, PAPER_TYPES, PENS, POSTIT_COLORS } from './constants';

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

/** Post-its stuck on a note's page. x is a fraction of the page width, y is px from the top. */
function normalizePostits(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p && typeof p.id === 'string')
    .map((p) => ({
      id: p.id,
      text: typeof p.text === 'string' ? p.text : '',
      color: has(POSTIT_COLORS, p.color) ? p.color : POSTIT_COLORS[0].id,
      x: Math.min(1, Math.max(0, Number(p.x) || 0)),
      y: Math.max(0, Number(p.y) || 0),
      rot: Math.min(6, Math.max(-6, Number(p.rot) || 0)),
    }));
}

/** Freehand strokes: flat [x, y, x, y…] lists in units of the page width. */
function normalizeStrokes(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => s && Array.isArray(s.pts) && s.pts.length >= 2 && s.pts.every(Number.isFinite))
    .map((s) => ({
      pen: has(PENS, s.pen) ? s.pen : DEFAULT_STYLE.pen,
      ink: has(INKS, s.ink) ? s.ink : DEFAULT_STYLE.ink,
      pts: s.pts,
    }));
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
    postits: normalizePostits(note.postits),
    strokes: normalizeStrokes(note.strokes),
  };
}

/** Validate a list of notes from outside the app (a file or a backup). */
export function normalizeNotes(list) {
  return Array.isArray(list) ? list.map(normalizeNote).filter(Boolean) : [];
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNote(style) {
  const now = Date.now();
  return { id: newId(), title: '', content: '', createdAt: now, updatedAt: now, style: normalizeStyle(style), postits: [], strokes: [] };
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

// Ids of notes deleted on this device. When the notes file is read back in,
// these stay deleted even if the file still lists them (for example a note
// deleted while the browser wasn't allowed to write to the file).
const DELETED_KEY = 'paperleaf.deleted.v1';
const DELETED_LIMIT = 500;

export function loadDeletedIds() {
  try {
    const list = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function rememberDeleted(id) {
  try {
    const ids = [...loadDeletedIds(), id].slice(-DELETED_LIMIT);
    localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
  } catch {
    /* worst case a deleted note comes back from the file */
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
