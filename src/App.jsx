import { useCallback, useEffect, useRef, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import Editor from './components/Editor.jsx';
import Splash from './components/Splash.jsx';
import { NOTES_KEY, createNote, loadNotes, loadPrefs, saveNotes, savePrefs } from './storage';

const SAVE_DELAY_MS = 400;

// The open note lives in the URL hash (#/n/<id>) so a refresh reopens it
// and the browser's own back button returns to the dashboard.
function noteIdFromHash() {
  const match = window.location.hash.match(/^#\/n\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function App() {
  const [notes, setNotes] = useState(loadNotes);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [openId, setOpenId] = useState(noteIdFromHash);
  const [saveState, setSaveState] = useState('saved'); // 'saved' | 'saving' | 'error'

  // Opening animation: only when landing on the dashboard, and never for
  // people who have asked their system to reduce motion.
  const [showSplash, setShowSplash] = useState(
    () => !noteIdFromHash() && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const hideSplash = useCallback(() => setShowSplash(false), []);

  const notesRef = useRef(notes);
  const openIdRef = useRef(openId);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);

  /** Write pending changes to localStorage right now. */
  const flush = useCallback(() => {
    clearTimeout(timerRef.current);
    if (!dirtyRef.current) return;
    const ok = saveNotes(notesRef.current);
    dirtyRef.current = !ok;
    setSaveState(ok ? 'saved' : 'error');
  }, []);

  /** Apply a change to the notes list and schedule a silent save. */
  const commit = useCallback(
    (updater, { immediate = false } = {}) => {
      const next = updater(notesRef.current);
      if (next === notesRef.current) return;
      notesRef.current = next;
      dirtyRef.current = true;
      setNotes(next);
      if (immediate) {
        flush();
      } else {
        setSaveState('saving');
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, SAVE_DELAY_MS);
      }
    },
    [flush]
  );

  // Never lose the last few keystrokes: save when the tab is hidden or closed.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush]);

  // Pick up changes made in another tab.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== NOTES_KEY || dirtyRef.current) return;
      const fresh = loadNotes();
      notesRef.current = fresh;
      setNotes(fresh);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Leaving a note (Back button, browser back, edited URL) saves it and
  // throws away notes that were never written in.
  useEffect(() => {
    const onHashChange = () => {
      const nextId = noteIdFromHash();
      const prevId = openIdRef.current;
      if (prevId && prevId !== nextId) {
        commit(
          (list) => {
            const leaving = list.find((n) => n.id === prevId);
            const isBlank = leaving && !leaving.title.trim() && !leaving.content.trim();
            return isBlank ? list.filter((n) => n.id !== prevId) : list;
          },
          { immediate: true }
        );
        flush();
      }
      openIdRef.current = nextId;
      setOpenId(nextId);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [commit, flush]);

  const updatePrefs = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const openNote = (id) => {
    window.location.hash = `#/n/${encodeURIComponent(id)}`;
  };

  const goBack = () => {
    flush();
    window.location.hash = '#/';
  };

  const handleNew = () => {
    const note = createNote(prefs.lastStyle);
    commit((list) => [note, ...list], { immediate: true });
    openNote(note.id);
  };

  const handleChange = (id, patch) => {
    commit((list) =>
      list.map((n) =>
        n.id === id
          ? { ...n, ...patch, style: { ...n.style, ...(patch.style || {}) }, updatedAt: Date.now() }
          : n
      )
    );
    // New notes start with whatever look was used most recently.
    if (patch.style) updatePrefs({ lastStyle: { ...prefs.lastStyle, ...patch.style } });
  };

  const handleRename = (id, title) => {
    commit((list) => list.map((n) => (n.id === id ? { ...n, title, updatedAt: Date.now() } : n)), {
      immediate: true,
    });
  };

  const handleDelete = (id) => {
    commit((list) => list.filter((n) => n.id !== id), { immediate: true });
  };

  const openNoteData = openId ? notes.find((n) => n.id === openId) : null;

  // A link to a note that no longer exists falls back to the dashboard.
  useEffect(() => {
    if (openId && !openNoteData) window.location.hash = '#/';
  }, [openId, openNoteData]);

  if (showSplash) {
    // The dashboard sits underneath so the splash can zoom straight into it.
    return (
      <>
        <Dashboard notes={notes} onNew={handleNew} onOpen={openNote} onRename={handleRename} onDelete={handleDelete} />
        <Splash onDone={hideSplash} />
      </>
    );
  }

  if (openNoteData) {
    return (
      <Editor
        key={openNoteData.id}
        note={openNoteData}
        saveState={saveState}
        toolbarCollapsed={prefs.toolbarCollapsed}
        onToggleToolbar={() => updatePrefs({ toolbarCollapsed: !prefs.toolbarCollapsed })}
        onChange={(patch) => handleChange(openNoteData.id, patch)}
        onBack={goBack}
      />
    );
  }

  return (
    <Dashboard
      notes={notes}
      onNew={handleNew}
      onOpen={openNote}
      onRename={handleRename}
      onDelete={handleDelete}
    />
  );
}
