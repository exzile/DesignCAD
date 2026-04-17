import { X, Bold, Italic } from 'lucide-react';
import { useCADStore } from '../../store/cadStore';
import './SketchPalette.css';

// Available font families (SK-A6)
const FONT_OPTIONS = [
  { value: 'default',     label: 'Default' },
  { value: 'sans-serif',  label: 'Sans Serif' },
  { value: 'serif',       label: 'Serif' },
  { value: 'monospace',   label: 'Monospace' },
  { value: 'cursive',     label: 'Cursive' },
] as const;

// ── Sub-component: Bold/Italic toggle row ─────────────────────────────────
interface StyleToggleRowProps {
  bold: boolean;
  italic: boolean;
  onBoldChange: (v: boolean) => void;
  onItalicChange: (v: boolean) => void;
}
function StyleToggleRow({ bold, italic, onBoldChange, onItalicChange }: StyleToggleRowProps) {
  return (
    <div className="sketch-palette-row">
      <span className="sketch-palette-label">Style</span>
      <div className="sketch-palette-linetype">
        <button
          className={`spl-btn${bold ? ' active' : ''}`}
          title="Bold"
          onClick={() => onBoldChange(!bold)}
        >
          <Bold size={12} />
        </button>
        <button
          className={`spl-btn${italic ? ' active' : ''}`}
          title="Italic"
          onClick={() => onItalicChange(!italic)}
        >
          <Italic size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────
export default function SketchTextPanel() {
  const activeTool        = useCADStore((s) => s.activeTool);
  const textContent       = useCADStore((s) => s.sketchTextContent);
  const setTextContent    = useCADStore((s) => s.setSketchTextContent);
  const textHeight        = useCADStore((s) => s.sketchTextHeight);
  const setTextHeight     = useCADStore((s) => s.setSketchTextHeight);
  const textFont          = useCADStore((s) => s.sketchTextFont);
  const setTextFont       = useCADStore((s) => s.setSketchTextFont);
  const textBold          = useCADStore((s) => s.sketchTextBold);
  const setTextBold       = useCADStore((s) => s.setSketchTextBold);
  const textItalic        = useCADStore((s) => s.sketchTextItalic);
  const setTextItalic     = useCADStore((s) => s.setSketchTextItalic);
  const cancelSketchTextTool = useCADStore((s) => s.cancelSketchTextTool);

  if (activeTool !== 'sketch-text') return null;

  const lineCount = textContent.split('\n').length;

  return (
    <div className="sketch-palette">
      <div className="sketch-palette-header">
        <span className="sketch-palette-dot" />
        <span className="sketch-palette-title">SKETCH TEXT</span>
        <button className="sketch-palette-close" onClick={cancelSketchTextTool} title="Cancel">
          <X size={12} />
        </button>
      </div>

      <div className="sketch-palette-body">
        {/* SK-A5: multi-line textarea */}
        <div className="sketch-palette-row sketch-palette-row--col">
          <span className="sketch-palette-label">Text</span>
          <textarea
            className="sketch-palette-textarea"
            value={textContent}
            rows={3}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Enter text…"
            spellCheck={false}
          />
          {lineCount > 1 && (
            <span className="sketch-palette-hint">{lineCount} lines</span>
          )}
        </div>

        {/* Height */}
        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Height (mm)</span>
          <input
            className="sketch-palette-input--narrow"
            type="number"
            value={textHeight}
            min={0.1}
            step={1}
            onChange={(e) => setTextHeight(Math.max(0.1, Number(e.target.value)))}
          />
        </div>

        {/* SK-A6: Font family */}
        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Font</span>
          <select
            className="sketch-palette-input--narrow"
            value={textFont}
            onChange={(e) => setTextFont(e.target.value)}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* SK-A6: Bold / Italic toggles */}
        <StyleToggleRow
          bold={textBold}
          italic={textItalic}
          onBoldChange={setTextBold}
          onItalicChange={setTextItalic}
        />

        <div className="sketch-palette-hint">
          Click on the sketch to place text. Use Enter for new lines.
        </div>

        <div className="sketch-palette-footer">
          <button className="sketch-palette-finish" onClick={cancelSketchTextTool}>
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
