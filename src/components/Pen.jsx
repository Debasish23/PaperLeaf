/**
 * The three writing tools, drawn upright with the tip at the bottom centre
 * (12, 120) so they can be rotated around the point that touches the paper.
 * `--pen-ink` colours the barrel (or the pencil lead).
 */
export default function PenGraphic({ type = 'ink', className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 120" aria-hidden="true">
      {type === 'ink' && (
        <>
          <rect x="7" y="2" width="10" height="70" rx="4" fill="var(--pen-ink)" />
          <rect x="9" y="5" width="2" height="62" rx="1" fill="#fff" opacity="0.28" />
          <rect x="6.5" y="70" width="11" height="4" rx="1" fill="#d9b65c" />
          <path d="M8 74h8l-1 22H9z" fill="#23252b" />
          <path d="M9 96h6l-3 24z" fill="#e2c26d" stroke="#a88a3a" strokeWidth="0.5" />
          <path d="M12 104v15" stroke="#7a6220" strokeWidth="0.6" />
          <circle cx="12" cy="103" r="0.9" fill="#7a6220" />
        </>
      )}
      {type === 'ball' && (
        <>
          <rect x="10" y="0" width="4" height="9" rx="1" fill="#9aa0a8" />
          <rect x="8" y="7" width="8" height="89" rx="2.5" fill="var(--pen-ink)" />
          <rect x="9.5" y="10" width="1.6" height="70" rx="0.8" fill="#fff" opacity="0.3" />
          <rect x="16" y="9" width="1.6" height="30" rx="0.8" fill="#c9ced6" />
          <rect x="8" y="82" width="8" height="14" fill="#2a2c31" opacity="0.85" />
          <path d="M8.5 96h7L13 114h-2z" fill="#c9ced6" />
          <path d="M11 114h2l-1 6z" fill="#6d7178" />
        </>
      )}
      {type === 'pencil' && (
        <>
          <rect x="7.5" y="0" width="9" height="10" rx="2" fill="#e58d8d" />
          <rect x="7.5" y="8" width="9" height="8" fill="#b9bec6" />
          <rect x="7.5" y="16" width="9" height="80" fill="#f0b429" />
          <rect x="10.5" y="16" width="3" height="80" fill="#f7cf5c" />
          <path d="M7.5 96h9l-3.1 17h-2.8z" fill="#ecd0a3" />
          <path d="M10.6 113h2.8L12 120z" fill="var(--pen-ink)" />
        </>
      )}
    </svg>
  );
}
