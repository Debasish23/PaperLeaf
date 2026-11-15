// Height of one ruled line, in px. Text line-height and the ruled background
// both use this value, which is what keeps writing sitting on the lines.
export const LINE_HEIGHT = 32;

export const PAPER_TYPES = [
  { id: 'plain', label: 'Plain' },
  { id: 'ruled', label: 'Ruled' },
];

export const PAPER_COLORS = [
  { id: 'white', label: 'Crisp White', bg: '#fdfdfb', rule: 'rgba(84, 128, 196, 0.38)', margin: 'rgba(226, 78, 98, 0.6)' },
  { id: 'cream', label: 'Warm Cream', bg: '#f5ecd7', rule: 'rgba(128, 104, 66, 0.32)', margin: 'rgba(206, 78, 78, 0.55)' },
  { id: 'legal', label: 'Yellow Legal Pad', bg: '#fbf2a4', rule: 'rgba(62, 118, 168, 0.42)', margin: 'rgba(222, 70, 80, 0.62)' },
  { id: 'blue', label: 'Pastel Blue', bg: '#dde9f6', rule: 'rgba(66, 106, 170, 0.36)', margin: 'rgba(222, 84, 110, 0.55)' },
  { id: 'charcoal', label: 'Charcoal', bg: '#2a2c31', rule: 'rgba(255, 255, 255, 0.13)', margin: 'rgba(255, 122, 134, 0.45)', dark: true },
];

export const PENS = [
  { id: 'ink', label: 'Ink pen', hint: 'Fountain / gel — rich and bold' },
  { id: 'ball', label: 'Ballpen', hint: 'Crisp, uniform strokes' },
  { id: 'pencil', label: 'Pencil', hint: 'Soft graphite' },
];

// `onDark` is the shade used on charcoal paper, where the regular inks
// would be unreadable (think gel pens on black paper).
export const INKS = [
  { id: 'black', label: 'Classic Black', color: '#1a1a1e', onDark: '#eceae4' },
  { id: 'blue', label: 'Royal Blue', color: '#1d3fb0', onDark: '#92b2ff' },
  { id: 'red', label: 'Crimson Red', color: '#b0142b', onDark: '#ff858d' },
  { id: 'green', label: 'Forest Green', color: '#1c6a39', onDark: '#82d69e' },
  { id: 'graphite', label: 'Graphite Grey', color: '#5b5e65', onDark: '#aaaeb6' },
];

// Handwriting fonts look very different at the same nominal size, so each
// gets its own size to feel equally "large" on a 32px line.
export const FONTS = [
  { id: 'caveat', label: 'Caveat', family: '"Caveat", cursive', size: 27 },
  { id: 'patrick', label: 'Patrick Hand', family: '"Patrick Hand", cursive', size: 23 },
  { id: 'indie', label: 'Indie Flower', family: '"Indie Flower", cursive', size: 22 },
  { id: 'shadows', label: 'Shadows Into Light', family: '"Shadows Into Light", cursive', size: 24 },
  { id: 'kalam', label: 'Kalam', family: '"Kalam", cursive', size: 21 },
  // Bundled fonts — see src/fonts.css and public/fonts.
  { id: 'runethia', label: 'Runethia', family: '"Runethia", cursive', size: 25 },
  { id: 'runiga', label: 'Runiga', family: '"Runiga", serif', size: 20 },
  { id: 'autography', label: 'Autography', family: '"Autography", cursive', size: 32 },
  { id: 'brother', label: 'Brother Signature', family: '"Brother Signature", cursive', size: 34 },
  { id: 'star', label: 'Always in the Star', family: '"Always in the Star", cursive', size: 31 },
  { id: 'rustic', label: 'Rustic Roadway', family: '"Rustic Roadway", cursive', size: 23 },
  { id: 'southern', label: 'Southern Beach', family: '"Southern Beach", cursive', size: 27 },
  { id: 'stylish', label: 'Stylish Handwriting Script', family: '"Stylish Handwriting Script", cursive', size: 26 },
];

export const DEFAULT_STYLE = {
  paper: 'ruled',
  paperColor: 'cream',
  pen: 'ink',
  ink: 'blue',
  font: 'caveat',
};

export const byId = (list, id) => list.find((item) => item.id === id) || list[0];

/** Resolve a note's style ids into CSS custom properties. */
export function styleVars(style) {
  const paper = byId(PAPER_COLORS, style.paperColor);
  const ink = byId(INKS, style.ink);
  const font = byId(FONTS, style.font);
  return {
    '--paper': paper.bg,
    '--rule': paper.rule,
    '--margin-line': paper.margin,
    '--ink': paper.dark ? ink.onDark : ink.color,
    '--hand': font.family,
    '--fs': `${font.size}px`,
  };
}
