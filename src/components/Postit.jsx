import { useRef } from 'react';
import { POSTIT_COLORS, byId } from '../constants';

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * A sticky note on the page. Drag it by the strip along the top; the strip
 * also holds the colour and remove buttons. It grows taller as you write.
 */
export default function Postit({ postit, sheetRef, onChange, onRemove }) {
  const dragRef = useRef(null);
  const colorIndex = Math.max(0, POSTIT_COLORS.findIndex((c) => c.id === postit.color));
  const nextColor = POSTIT_COLORS[(colorIndex + 1) % POSTIT_COLORS.length];

  const startDrag = (event) => {
    if (event.target.closest('button')) return; // the buttons are not a handle
    const note = event.currentTarget.parentElement;
    const sheet = sheetRef.current.getBoundingClientRect();
    dragRef.current = {
      // Where inside the note the pointer grabbed it.
      dx: event.clientX - sheet.left - note.offsetLeft,
      dy: event.clientY - sheet.top - note.offsetTop,
      width: note.offsetWidth,
      height: note.offsetHeight,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const drag = (event) => {
    const grab = dragRef.current;
    if (!grab) return;
    const sheet = sheetRef.current.getBoundingClientRect();
    const left = clamp(event.clientX - sheet.left - grab.dx, 0, sheet.width - grab.width);
    const top = clamp(event.clientY - sheet.top - grab.dy, 0, sheet.height - grab.height);
    onChange({ x: left / sheet.width, y: top });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div
      className="postit"
      style={{
        '--postit': byId(POSTIT_COLORS, postit.color).bg,
        '--rot': `${postit.rot}deg`,
        '--x': postit.x,
        top: postit.y,
      }}
    >
      <div
        className="postit-bar"
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title="Drag to move"
      >
        <button
          type="button"
          className="postit-color"
          aria-label="Change post-it colour"
          title="Change colour"
          style={{ background: nextColor.bg }}
          onClick={() => onChange({ color: nextColor.id })}
        />
        <button type="button" className="postit-remove" aria-label="Remove post-it" title="Remove" onClick={onRemove}>
          ×
        </button>
      </div>
      {/* The hidden ::after mirrors the text so the post-it grows with it. */}
      <div className="postit-body" data-value={postit.text}>
        <textarea
          value={postit.text}
          placeholder="Post-it…"
          aria-label="Post-it text"
          maxLength={600}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
    </div>
  );
}
