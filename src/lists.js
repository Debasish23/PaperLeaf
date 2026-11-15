// Lists and checkboxes for the plain-text editor. A list item is simply a
// line that starts with a marker ("1. ", "IV. ", "a. ", "• ", "→ ", "☐ ").

export const LIST_TYPES = [
  { id: 'number', label: '1.', title: 'Numbered list' },
  { id: 'roman', label: 'I.', title: 'Roman numeral list' },
  { id: 'alpha', label: 'a.', title: 'Lettered list' },
  { id: 'dot', label: '•', title: 'Dot list' },
  { id: 'arrow', label: '→', title: 'Arrow list' },
  { id: 'check', label: '☐', title: 'Checkbox list' },
];

const UNCHECKED = '☐';
const CHECKED = '☑';

const ROMAN = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
const ROMAN_VALUE = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function toRoman(n) {
  let rest = Math.max(1, n);
  let out = '';
  for (const [value, glyph] of ROMAN) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

function fromRoman(text) {
  let total = 0;
  for (let i = 0; i < text.length; i += 1) {
    const value = ROMAN_VALUE[text[i]];
    total += value < (ROMAN_VALUE[text[i + 1]] || 0) ? -value : value;
  }
  return total;
}

function marker(type, n) {
  switch (type) {
    case 'number':
      return `${n}. `;
    case 'roman':
      return `${toRoman(n)}. `;
    case 'alpha':
      return `${String.fromCharCode(97 + ((n - 1) % 26))}. `;
    case 'dot':
      return '• ';
    case 'arrow':
      return '→ ';
    default:
      return `${UNCHECKED} `;
  }
}

const PATTERNS = [
  ['number', /^(\s*)(\d+)\. /, (m) => parseInt(m[2], 10)],
  ['roman', /^(\s*)([IVXLCDM]+)\. /, (m) => fromRoman(m[2])],
  ['alpha', /^(\s*)([a-z])\. /, (m) => m[2].charCodeAt(0) - 96],
  ['dot', /^(\s*)• /],
  ['arrow', /^(\s*)→ /],
  ['check', /^(\s*)[☐☑] /],
];

/** Describe the list marker a line starts with, or null if it has none. */
function parseLine(line) {
  for (const [type, pattern, position] of PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      return { type, indent: match[1], n: position ? position(match) : 1, length: match[0].length };
    }
  }
  return null;
}

/**
 * Replace part of the textarea as if the user had typed it, so the browser's
 * undo history and React's onChange both keep working.
 */
function replaceRange(textarea, start, end, text) {
  if (start === end && text === '') return;
  textarea.focus();
  textarea.setSelectionRange(start, end);
  const done = text === ''
    ? document.execCommand?.('delete')
    : document.execCommand?.('insertText', false, text);
  if (!done) {
    textarea.setRangeText(text, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function lineBounds(value, start, end = start) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const next = value.indexOf('\n', end);
  return [from, next === -1 ? value.length : next];
}

/** Turn the current line (or every selected line) into a list, or back. */
export function toggleList(textarea, type) {
  const { value, selectionStart, selectionEnd } = textarea;
  const [from, to] = lineBounds(value, selectionStart, selectionEnd);
  const lines = value.slice(from, to).split('\n');
  const many = lines.length > 1;
  const parsed = lines.map(parseLine);
  const isBlank = (line) => many && !line.trim();
  // Pressing the same list button again removes the markers.
  const removing = lines.every((line, i) => isBlank(line) || parsed[i]?.type === type);

  let count = 0;
  const next = lines.map((line, i) => {
    if (isBlank(line)) return line;
    const found = parsed[i];
    const indent = found ? found.indent : line.match(/^\s*/)[0];
    const body = line.slice(found ? found.length : indent.length);
    if (removing) return indent + body;
    count += 1;
    return indent + marker(type, count) + body;
  });

  replaceRange(textarea, from, to, next.join('\n'));
}

/**
 * Enter inside a list starts the next item; Enter on an empty item ends the
 * list. Returns true when it handled the key.
 */
export function continueList(textarea) {
  const { value, selectionStart: caret, selectionEnd } = textarea;
  if (caret !== selectionEnd) return false;
  const [from, to] = lineBounds(value, caret);
  const line = value.slice(from, to);
  const found = parseLine(line);
  if (!found || caret < from + found.length) return false;

  if (!line.slice(found.length).trim()) {
    replaceRange(textarea, from, to, '');
  } else {
    replaceRange(textarea, caret, caret, `\n${found.indent}${marker(found.type, found.n + 1)}`);
  }
  return true;
}

/** Clicking a checkbox at the start of a line ticks or unticks it. */
export function toggleCheckboxAtCaret(textarea) {
  const { value, selectionStart: caret, selectionEnd } = textarea;
  if (caret !== selectionEnd) return;
  const [from] = lineBounds(value, caret);
  const match = value.slice(from).match(/^([^\S\n]*)([☐☑]) /);
  if (!match) return;
  const box = from + match[1].length;
  if (caret < box || caret > box + 1) return;
  replaceRange(textarea, box, box + 1, match[2] === UNCHECKED ? CHECKED : UNCHECKED);
  textarea.setSelectionRange(box + 2, box + 2);
}
