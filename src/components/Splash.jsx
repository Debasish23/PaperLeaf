import { useCallback, useEffect, useState } from 'react';
import PenGraphic from './Pen.jsx';
import '../splash.css';

// Length of the CSS timeline in splash.css. Keep the two in sync.
const SPLASH_MS = 2700;
const SKIP_FADE_MS = 200;
// Don't hold the app back if the font is slow to arrive.
const FONT_WAIT_MS = 1200;

/** Opening animation: an ink pen writes the app's name, then it fades. */
export default function Splash({ onDone }) {
  const [ready, setReady] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const skip = useCallback(() => setSkipping(true), []);

  // Start writing only once Runethia has loaded, so the name never appears
  // in a fallback font first.
  useEffect(() => {
    let live = true;
    const start = () => live && setReady(true);
    const fallback = setTimeout(start, FONT_WAIT_MS);
    (document.fonts?.load('64px Runethia', 'Paperleaf') ?? Promise.resolve()).then(start, start);
    return () => {
      live = false;
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!ready && !skipping) return undefined;
    const timer = setTimeout(onDone, skipping ? SKIP_FADE_MS : SPLASH_MS);
    return () => clearTimeout(timer);
  }, [ready, skipping, onDone]);

  useEffect(() => {
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [skip]);

  return (
    <div
      className={`splash ${ready ? 'is-ready' : ''} ${skipping ? 'is-skipping' : ''}`}
      onClick={skip}
      role="presentation"
    >
      <div className="splash-word">
        <span className="splash-word-text">Paperleaf</span>
        <div className="splash-pen" style={{ '--pen-ink': '#1d2f6f' }}>
          <div className="splash-pen-tilt">
            <PenGraphic type="ink" />
          </div>
        </div>
      </div>
    </div>
  );
}
