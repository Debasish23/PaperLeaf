import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FONTS, INKS, LINE_HEIGHT, PAPER_COLORS, byId, styleVars } from '../constants';
import { continueList, toggleCheckboxAtCaret, toggleList } from '../lists';
import { countWords, formatDate } from '../utils';
import { BackIcon } from './Icons.jsx';
import PenGraphic from './Pen.jsx';
import Toolbar from './Toolbar.jsx';

// How far below the text baseline the ruled line sits, in px.
const BASELINE_GAP = 3;

/**
 * Every handwriting font places its baseline at a different height inside
 * the line box, so the ruled background is shifted per font to keep the
 * writing resting on the lines. Measured from the real font metrics.
 */
function measureRuleShift(font) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${font.size}px ${font.family}`;
  const m = ctx.measureText('Hxg');
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

export default function Editor({ note, saveState, toolbarCollapsed, onToggleToolbar, onChange, onBack }) {
  const { style } = note;
  const font = byId(FONTS, style.font);
  const dark = Boolean(byId(PAPER_COLORS, style.paperColor).dark);
  const ruleShift = useRuleShift(font);
  const words = countWords(note.content);

  // --- Writing pen: follows the caret while you type ---
  const textRef = useRef(null);
  const caretMirrorRef = useRef(null);
  const penRef = useRef(null);
  const typedRef = useRef(false);
  const [penPos, setPenPos] = useState({ x: 0, y: 0 });
  const [penDown, setPenDown] = useState(false);

  // Put the pen tip where the caret is.
  const placePen = useCallback(() => {
    const textarea = textRef.current;
    const mirror = caretMirrorRef.current;
    if (!textarea || !mirror) return;

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
      x: at.left - box.left,
      y: line * LINE_HEIGHT + ruleShift + LINE_HEIGHT - 1 - BASELINE_GAP,
    });
  }, [ruleShift]);

  useLayoutEffect(() => {
    if (!typedRef.current) return; // only react to real keystrokes
    typedRef.current = false;
    placePen();
    // The pen appears with the first keystroke and then stays on the page.
    setPenDown(true);

    // A quick scribble for every keystroke.
    penRef.current?.animate(
      [
        { transform: 'rotate(30deg)' },
        { transform: 'translate(1px, -4px) rotate(23deg)' },
        { transform: 'translate(2.5px, -1px) rotate(34deg)' },
        { transform: 'rotate(30deg)' },
      ],
      { duration: 220, easing: 'ease-out' }
    );
  }, [note.content, placePen]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
          <span className={`save-state is-${saveState}`}>{SAVE_LABEL[saveState]}</span>
          <span className="word-count">
            {words} {words === 1 ? 'word' : 'words'}
          </span>
        </div>
      </header>

      <main className="desk">
        <div className={`sheet ${style.paper === 'ruled' ? 'is-ruled' : ''}`}>
          <div className="sheet-head">
            <input
              className="title-input ink-text"
              value={note.title}
              placeholder="Untitled note"
              aria-label="Note title"
              maxLength={120}
              onChange={(e) => onChange({ title: e.target.value })}
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
              autoFocus={!note.content && !note.title}
              onChange={(e) => {
                typedRef.current = true;
                onChange({ content: e.target.value });
              }}
              onKeyDown={(e) => {
                const plainEnter = e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing;
                if (plainEnter && continueList(e.currentTarget)) e.preventDefault();
              }}
              onClick={(e) => {
                toggleCheckboxAtCaret(e.currentTarget);
                placePen();
              }}
              // Arrow keys, Home/End and so on move the caret; the pen follows.
              onKeyUp={placePen}
            />
            <div className="caret-mirror" ref={caretMirrorRef} aria-hidden="true" />
            <div
              className={`writing-pen ${penDown ? 'is-down' : ''}`}
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
          </div>
        </div>
      </main>

      <Toolbar
        style={style}
        collapsed={toolbarCollapsed}
        onToggle={onToggleToolbar}
        onStyle={(patch) => onChange({ style: patch })}
        onList={(type) => textRef.current && toggleList(textRef.current, type)}
      />
    </div>
  );
}
