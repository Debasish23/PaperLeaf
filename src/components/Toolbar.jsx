import { FONTS, INKS, PAPER_COLORS, PAPER_TYPES, PENS } from '../constants';
import { LIST_TYPES } from '../lists';
import { ChevronDownIcon, SlidersIcon } from './Icons.jsx';

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="tb-group">
      <span className="tb-label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            title={opt.hint || opt.label}
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ label, options, value, colorOf, onChange }) {
  return (
    <div className="tb-group">
      <span className="tb-label">{label}</span>
      <div className="swatches" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className="swatch"
            style={{ '--swatch': colorOf(opt) }}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Toolbar({ style, collapsed, onToggle, onStyle, onList }) {
  if (collapsed) {
    return (
      <button className="toolbar toolbar-collapsed" onClick={onToggle} aria-expanded="false" aria-label="Show writing tools">
        <SlidersIcon /> Tools
      </button>
    );
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Writing tools">
      <div className="tb-group">
        <label className="tb-label" htmlFor="font-select">
          Handwriting
        </label>
        <select
          id="font-select"
          className="font-select"
          value={style.font}
          style={{ fontFamily: FONTS.find((f) => f.id === style.font)?.family }}
          onChange={(e) => onStyle({ font: e.target.value })}
        >
          {FONTS.map((font) => (
            <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>
              {font.label}
            </option>
          ))}
        </select>
      </div>
      <Segmented label="Pen" options={PENS} value={style.pen} onChange={(pen) => onStyle({ pen })} />
      <Swatches
        label="Ink"
        options={INKS}
        value={style.ink}
        colorOf={(c) => c.color}
        onChange={(ink) => onStyle({ ink })}
      />
      <div className="tb-group">
        <span className="tb-label">List</span>
        <div className="segmented list-buttons" role="group" aria-label="List">
          {LIST_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              title={type.title}
              aria-label={type.title}
              // Keep the caret in the note while the button is pressed.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onList(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      <Segmented label="Paper" options={PAPER_TYPES} value={style.paper} onChange={(paper) => onStyle({ paper })} />
      <Swatches
        label="Paper colour"
        options={PAPER_COLORS}
        value={style.paperColor}
        colorOf={(c) => c.bg}
        onChange={(paperColor) => onStyle({ paperColor })}
      />
      <button className="tb-collapse" onClick={onToggle} aria-expanded="true" aria-label="Hide writing tools" title="Hide tools">
        <ChevronDownIcon />
      </button>
    </div>
  );
}
