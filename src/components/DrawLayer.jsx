import { useEffect, useMemo, useRef, useState } from 'react';
import { INKS, byId } from '../constants';

// How each writing tool draws: line width (px on an 800px-wide page) and opacity.
const TOOL = {
  ink: { width: 3, opacity: 1 },
  ball: { width: 1.9, opacity: 0.92 },
  pencil: { width: 2.3, opacity: 0.72 },
};
const REFERENCE_WIDTH = 800;
// Ignore pointer moves smaller than this (px) to keep saved strokes small.
const MIN_STEP = 1.5;

/** Smooth line through the points: quadratic curves between midpoints. */
function toPath(points, scale) {
  if (points.length < 2) return '';
  const x = (i) => (points[i] * scale).toFixed(1);
  const y = (i) => (points[i + 1] * scale).toFixed(1);
  if (points.length === 2) return `M${x(0)} ${y(0)}l0.01 0`; // a single tap is a dot
  let d = `M${x(0)} ${y(0)}`;
  for (let i = 2; i < points.length - 2; i += 2) {
    const midX = (((points[i] + points[i + 2]) / 2) * scale).toFixed(1);
    const midY = (((points[i + 1] + points[i + 3]) / 2) * scale).toFixed(1);
    d += `Q${x(i)} ${y(i)} ${midX} ${midY}`;
  }
  const last = points.length - 2;
  return `${d}L${x(last)} ${y(last)}`;
}

/**
 * Freehand drawing over the page. Strokes are stored as flat [x, y, x, y…]
 * lists in units of the page width, so a drawing keeps its shape when the
 * page is narrower (phone) or wider (desktop).
 */
export default function DrawLayer({ strokes, active, pen, ink, dark, onAddStroke, onPenMove }) {
  const svgRef = useRef(null);
  const liveRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [live, setLive] = useState(null); // points of the stroke being drawn, in px

  useEffect(() => {
    const svg = svgRef.current;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const colorOf = (inkId) => byId(INKS, inkId)[dark ? 'onDark' : 'color'];
  const widthOf = (penId) => Math.max(1, (TOOL[penId] || TOOL.ink).width * (width / REFERENCE_WIDTH));

  const saved = useMemo(
    () => strokes.map((stroke) => ({ ...stroke, d: toPath(stroke.pts, width) })),
    [strokes, width]
  );

  const pointOf = (event) => {
    const box = svgRef.current.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  };

  const start = (event) => {
    if (!active || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    svgRef.current.setPointerCapture?.(event.pointerId);
    liveRef.current = pointOf(event);
    setLive(liveRef.current);
    onPenMove?.(...liveRef.current, false);
  };

  const move = (event) => {
    const points = liveRef.current;
    if (!points) return;
    const [x, y] = pointOf(event);
    const dx = x - points[points.length - 2];
    const dy = y - points[points.length - 1];
    if (dx * dx + dy * dy < MIN_STEP * MIN_STEP) return;
    liveRef.current = [...points, x, y];
    setLive(liveRef.current);
    onPenMove?.(x, y, false);
  };

  const end = () => {
    const points = liveRef.current;
    if (!points) return;
    liveRef.current = null;
    setLive(null);
    if (width > 0) {
      onAddStroke({ pen, ink, pts: points.map((value) => Math.round((value / width) * 10000) / 10000) });
    }
    onPenMove?.(points[points.length - 2], points[points.length - 1], true);
  };

  return (
    <svg
      ref={svgRef}
      className={`draw-layer ${active ? 'is-active' : ''}`}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      aria-hidden="true"
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {saved.map((stroke, i) => (
          <path
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            d={stroke.d}
            stroke={colorOf(stroke.ink)}
            strokeWidth={widthOf(stroke.pen)}
            opacity={(TOOL[stroke.pen] || TOOL.ink).opacity}
          />
        ))}
        {live && (
          <path d={toPath(live, 1)} stroke={colorOf(ink)} strokeWidth={widthOf(pen)} opacity={(TOOL[pen] || TOOL.ink).opacity} />
        )}
      </g>
    </svg>
  );
}
