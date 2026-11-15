import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FONTS, INKS, LINE_HEIGHT, PAPER_COLORS, POSTIT_COLORS, byId, styleVars } from '../constants';
import { continueList, toggleCheckboxAtCaret, toggleList } from '../lists';
import { newId } from '../storage';
import { countWords, formatDate } from '../utils';
import Dialog from './Dialog.jsx';
import DrawLayer from './DrawLayer.jsx';
import { BackIcon } from './Icons.jsx';
import PenGraphic from './Pen.jsx';
import Postit from './Postit.jsx';
import Toolbar from './Toolbar.jsx';

// How far below the text baseline the ruled line sits, in px.
const BASELINE_GAP = 3;
// Length of the paper-unrolling animation for a brand-new note (styles.css).
const UNROLL_MS = 1150;

const measureCtx = document.createElement('canvas').getContext('2d');

/**
 * Every handwriting font places its baseline at a different height inside
 * the line box, so the ruled background is shifted per font to keep the
 * writing resting on the lines. Measured from the real font metrics.
 */
function measureRuleShift(font) {
  measureCtx.font = `${font.size}px ${font.family}`;
  const m = measureCtx.measureText('Hxg');
  const ascent = m.fontBoundingBoxAscent;
  const descent = m.fontBoundingBoxDescent;
  if (!(ascent > 0)) return -4;
  const baseline = (LINE_HEIGHT - (ascent + descent)) / 2 + ascent;
  return Math.round(baseline + BASELINE_GAP - (LINE_HEIGHT - 1));
}

function useRuleShift(font) {
  const [shift, setShift] = useState(() => measureRuleShift(font));
  useEffect(() => {
    let cancelled = false;
    setShift(measureRuleShift(font));
    // Re-measure once the web font has actually loaded.
    document.fonts?.load(`${font.size}px ${font.family}`).then(() => {
      if (!cancelled) setShift(measureRuleShift(font));
    });
    return () => {
      cancelled = true;
    };
  }, [font]);
  return shift;
}

const SAVE_LABEL = { saved: 'Saved', saving: 'Saving…', error: 'Couldn’t save — storage is full' };

export default function Editor({ note, isNew, saveState, toolbarCollapsed, onToggleToolbar, onChange, onBack }) {
  const { style } = note;
  const font = byId(FONTS, style.font);
  const dark = Boolean(byId(PAPER_COLORS, style.paperColor).dark);
  const ruleShift = useRuleShift(font);
  const words = countWords(note.content);
  const postits = note.postits || [];
  const strokes = note.strokes || [];

  const sheetRef = useRef(null);
  const titleRef = useRef(null);
  const textRef = useRef(null);
  const caretMirrorRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [confirming, setConfirming] = useState(null); // { kind: 'postit', id } | { kind: 'drawing' }

  // --- A brand-new note unrolls like a scroll of paper ---
  const [unrolling, setUnrolling] = useState(Boolean(isNew));
  useEffect(() => {
    if (!unrolling) return undefined;
    const timer = setTimeout(() => setUnrolling(false), UNROLL_MS);
    return () => clearTimeout(timer);
  }, [unrolling]);

  // --- Writing pen: on the page from the start, wherever you are writing ---
  const penAnchorRef = useRef(null);
  const penRef = useRef(null);
  const typedRef = useRef(false);
  // A blank note starts at its title; otherwise the pen rests after the text.
  const penTargetRef = useRef(!note.title && !note.content ? 'title' : 'body');
  const [penPos, setPenPos] = useState({ x: 0, y: 0 });

  /** Put the pen tip at the caret of the title or the note body. */
  const placePen = useCallback(
    (target = penTargetRef.current) => {
      penTargetRef.current = target;
      const sheet = sheetRef.current?.getBoundingClientRect();
      if (!sheet) return;

      if (target === 'title') {
        const input = titleRef.current;
        const css = getComputedStyle(input);
        measureCtx.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        const caret = input.selectionStart ?? input.value.length;
        const textWidth = measureCtx.measureText(input.value.slice(0, caret)).width;
        const metrics = measureCtx.measureText('Hg');
        const ascent = metrics.fontBoundingBoxAscent || parseFloat(css.fontSize) * 0.8;
        const descent = metrics.fontBoundingBoxDescent || parseFloat(css.fontSize) * 0.25;
        const box = input.getBoundingClientRect();
        setPenPos({
          x: box.left - sheet.left + Math.min(Math.max(textWidth - input.scrollLeft, 0), box.width),
          y: box.top - sheet.top + (box.height - (ascent + descent)) / 2 + ascent,
        });
        return;
      }

      const textarea = textRef.current;
      const mirror = caretMirrorRef.current;
      // Lay the text before the caret out in a hidden copy of the writing
      // area; a marker at its end tells us where the caret is on the page.
      mirror.textContent = textarea.value.slice(0, textarea.selectionStart);
      const marker = document.createElement('span');
      marker.textContent = String.fromCharCode(0x200b); // zero-width space
      mirror.appendChild(marker);
      const box = mirror.getBoundingClientRect();
      const at = marker.getBoundingClientRect();
      const line = Math.max(0, Math.floor((at.top + at.height / 2 - box.top) / LINE_HEIGHT));
      setPenPos({
        x: at.left - sheet.left,
        y: box.top - sheet.top + line * LINE_HEIGHT + ruleShift + LINE_HEIGHT - 1 - BASELINE_GAP,
      });
    },
    [ruleShift]
  );

  // When the note opens: scroll to the top and rest the caret after the text.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const textarea = textRef.current;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  // Keep the pen in the right place whenever the page layout changes.
  useLayoutEffect(() => {
    let live = true;
    const settle = () => live && placePen();
    settle();
    document.fonts?.ready.then(settle);
    window.addEventListener('resize', settle);
    return () => {
      live = false;
      window.removeEventListener('resize', settle);
    };
  }, [placePen, style.font, style.paper]);

  // A quick scribble for every keystroke.
  useLayoutEffect(() => {
    if (!typedRef.current) return;
    typedRef.current = false;
    placePen();
    penRef.current?.animate(
      [
        { transform: 'rotate(30deg)' },
        { transform: 'translate(1px, -4px) rotate(23deg)' },
        { transform: 'translate(2.5px, -1px) rotate(34deg)' },
        { transform: 'rotate(30deg)' },
      ],
      { duration: 220, easing: 'ease-out' }
    );
  }, [note.content, note.title, placePen]);

  // While drawing, the pen follows the pointer directly (no re-render per
  // move); its final position is stored when the stroke ends.
  const followDrawing = useCallback((x, y, finished) => {
    if (penAnchorRef.current) penAnchorRef.current.style.transform = `translate(${x}px, ${y}px)`;
    if (finished) setPenPos({ x, y });
  }, []);

  // --- Post-its stuck on the page ---
  const addPostit = () => {
    const sheet = sheetRef.current.getBoundingClientRect();
    const n = postits.length;
    // Drop it in the part of the page that is on screen, fanned out a little
    // so several new ones don't land exactly on top of each other.
    const top = window.innerHeight * 0.22 - sheet.top + (n % 4) * 22;
    onChange({
      postits: [
        ...postits,
        {
          id: newId(),
          text: '',
          color: POSTIT_COLORS[n % POSTIT_COLORS.length].id,
          x: 0.52 + (n % 4) * 0.04,
          y: Math.max(12, Math.min(top, sheet.height - 200)),
          rot: [-3, 2, -1.5, 3][n % 4],
        },
      ],
    });
  };

  const updatePostit = (id, patch) =>
    onChange({ postits: postits.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const removePostit = (id) => onChange({ postits: postits.filter((p) => p.id !== id) });

  // An empty post-it goes straight away; one with writing on it asks first.
  const requestRemovePostit = (postit) => {
    if (postit.text.trim()) setConfirming({ kind: 'postit', id: postit.id });
    else removePostit(postit.id);
  };

  return (
    <div
      className={`editor ${dark ? 'is-dark' : ''}`}
      data-pen={style.pen}
      style={{ ...styleVars(style), '--rule-shift': `${ruleShift}px` }}
    >
      <header className="topbar">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          <BackIcon /> Back
        </button>
        <div className="topbar-status" aria-live="polite">
          {drawing && (
            <button className="draw-chip" onClick={() => setDrawing(false)} title="Stop drawing and go back to typing">
              Drawing · Done
            </button>
          )}
          <span className={`save-state is-${saveState}`}>{SAVE_LABEL[saveState]}</span>
          <span className="word-count">
            {words} {words === 1 ? 'word' : 'words'}
          </span>
        </div>
      </header>

      <main className="desk">
        <div className={`sheet-wrap ${unrolling ? 'is-unrolling' : ''}`}>
          <div className={`sheet ${style.paper === 'ruled' ? 'is-ruled' : ''}`} ref={sheetRef}>
            <div className="sheet-head">
              <input
                ref={titleRef}
                className="title-input ink-text"
                value={note.title}
                placeholder="Untitled note"
                aria-label="Note title"
                maxLength={120}
                autoFocus={!note.content && !note.title}
                onChange={(e) => {
                  typedRef.current = true;
                  penTargetRef.current = 'title';
                  onChange({ title: e.target.value });
                }}
                onKeyDown={(e) => {
                  // Enter moves on from the heading to the page.
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    textRef.current.focus();
                  }
                }}
                onFocus={() => placePen('title')}
                onClick={() => placePen('title')}
                onKeyUp={() => placePen('title')}
              />
              <span className="sheet-date">{formatDate(note.createdAt)}</span>
            </div>
            {/* The hidden ::after mirrors the text so the page grows with it. */}
            <div className="sheet-body" data-value={note.content}>
              <textarea
                ref={textRef}
                className="ink-text"
                value={note.content}
                placeholder="Start writing…"
                aria-label="Note content"
                spellCheck="true"
                onChange={(e) => {
                  typedRef.current = true;
                  penTargetRef.current = 'body';
                  onChange({ content: e.target.value });
                }}
                onKeyDown={(e) => {
                  const plainEnter = e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing;
                  if (plainEnter && continueList(e.currentTarget)) e.preventDefault();
                }}
                onFocus={() => placePen('body')}
                onClick={(e) => {
                  toggleCheckboxAtCaret(e.currentTarget);
                  placePen('body');
                }}
                // Arrow keys, Home/End and so on move the caret; the pen follows.
                onKeyUp={() => placePen('body')}
              />
              <div className="caret-mirror" ref={caretMirrorRef} aria-hidden="true" />
            </div>

            <DrawLayer
              strokes={strokes}
              active={drawing}
              pen={style.pen}
              ink={style.ink}
              dark={dark}
              onAddStroke={(stroke) => onChange({ strokes: [...strokes, stroke] })}
              onPenMove={followDrawing}
            />

            <div
              className="writing-pen"
              ref={penAnchorRef}
              style={{
                transform: `translate(${penPos.x}px, ${penPos.y}px)`,
                '--pen-ink': byId(INKS, style.ink).color,
              }}
              aria-hidden="true"
            >
              <div className="writing-pen-tilt" ref={penRef}>
                <PenGraphic type={style.pen} />
              </div>
            </div>

            {postits.map((postit) => (
              <Postit
                key={postit.id}
                postit={postit}
                sheetRef={sheetRef}
                onChange={(patch) => updatePostit(postit.id, patch)}
                onRemove={() => requestRemovePostit(postit)}
              />
            ))}
          </div>
          {unrolling && <div className="sheet-roll" aria-hidden="true" />}
        </div>
      </main>

      <Toolbar
        style={style}
        collapsed={toolbarCollapsed}
        onToggle={onToggleToolbar}
        onStyle={(patch) => onChange({ style: patch })}
        onAddPostit={addPostit}
        onList={(type) => textRef.current && toggleList(textRef.current, type)}
        drawing={drawing}
        hasDrawing={strokes.length > 0}
        onToggleDraw={() => setDrawing((on) => !on)}
        onUndoStroke={() => onChange({ strokes: strokes.slice(0, -1) })}
        onClearDrawing={() => setConfirming({ kind: 'drawing' })}
      />

      {confirming?.kind === 'postit' && (
        <Dialog
          title="Remove this post-it?"
          confirmLabel="Remove"
          danger
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            removePostit(confirming.id);
            setConfirming(null);
          }}
        >
          <p>The writing on it will be lost.</p>
        </Dialog>
      )}

      {confirming?.kind === 'drawing' && (
        <Dialog
          title="Clear the drawing?"
          confirmLabel="Clear"
          danger
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            onChange({ strokes: [] });
            setConfirming(null);
          }}
        >
          <p>Everything drawn on this page will be erased. Your typed text and post-its stay.</p>
        </Dialog>
      )}
    </div>
  );
}
