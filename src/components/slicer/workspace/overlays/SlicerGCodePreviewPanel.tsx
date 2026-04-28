import { useMemo, useState } from 'react';
import { Copy, FileCode2, Search, X } from 'lucide-react';
import { useSlicerStore } from '../../../../store/slicerStore';
import { parseGCodePreviewLines, type GCodeLine } from './gcodePreviewModel';
import './SlicerGCodePreviewPanel.css';

type CommandFilter = 'all' | 'motion' | 'extrusion' | 'travel' | 'temperature' | 'fan' | 'comments';
type PreviewScope = 'layer' | 'full';

const FILTERS: Array<{ id: CommandFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'motion', label: 'Motion' },
  { id: 'extrusion', label: 'Extrusion' },
  { id: 'travel', label: 'Travel' },
  { id: 'temperature', label: 'Temp' },
  { id: 'fan', label: 'Fan' },
  { id: 'comments', label: 'Comments' },
];

function lineMatchesFilter(line: GCodeLine, filter: CommandFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'comments') return line.isComment;
  if (filter === 'motion') return line.command === 'G0' || line.command === 'G1';
  if (filter === 'extrusion') return line.isExtrusion;
  if (filter === 'travel') return line.isTravel;
  if (filter === 'temperature') return ['M104', 'M109', 'M140', 'M190'].includes(line.command);
  if (filter === 'fan') return line.command === 'M106' || line.command === 'M107';
  return true;
}

function commandClass(line: GCodeLine): string {
  if (line.isComment) return 'is-comment';
  if (line.isExtrusion) return 'is-extrusion';
  if (line.isTravel) return 'is-travel';
  if (['M104', 'M109', 'M140', 'M190'].includes(line.command)) return 'is-temperature';
  if (line.command === 'M106' || line.command === 'M107') return 'is-fan';
  return '';
}

function summarize(lines: GCodeLine[]) {
  let extrusion = 0;
  let travel = 0;
  let fan = 0;
  let temp = 0;
  for (const line of lines) {
    if (line.isExtrusion) extrusion += 1;
    if (line.isTravel) travel += 1;
    if (line.command === 'M106' || line.command === 'M107') fan += 1;
    if (['M104', 'M109', 'M140', 'M190'].includes(line.command)) temp += 1;
  }
  return { extrusion, travel, fan, temp };
}

export function SlicerGCodePreviewPanel() {
  const sliceResult = useSlicerStore((s) => s.sliceResult);
  const previewLayer = useSlicerStore((s) => s.previewLayer);
  const setOpen = useSlicerStore((s) => s.setPreviewGCodeOpen);
  const [scope, setScope] = useState<PreviewScope>('layer');
  const [filter, setFilter] = useState<CommandFilter>('all');
  const [query, setQuery] = useState('');
  const [showComments, setShowComments] = useState(true);

  const parsed = useMemo(
    () => parseGCodePreviewLines(sliceResult?.gcode ?? ''),
    [sliceResult?.gcode],
  );
  const currentLayerZ = sliceResult?.layers[previewLayer]?.z ?? 0;
  const normalizedQuery = query.trim().toLowerCase();
  const lines = useMemo(() => parsed.filter((line) => {
    if (scope === 'layer' && line.layerIndex !== previewLayer) return false;
    if (!showComments && line.isComment) return false;
    if (!lineMatchesFilter(line, filter)) return false;
    if (normalizedQuery && !line.text.toLowerCase().includes(normalizedQuery)) return false;
    return true;
  }), [filter, normalizedQuery, parsed, previewLayer, scope, showComments]);
  const stats = useMemo(() => summarize(lines), [lines]);

  const copyVisible = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(lines.map((line) => line.text).join('\n'));
  };

  if (!sliceResult) return null;

  return (
    <section className="slicer-gcode-panel" aria-label="G-code preview">
      <div className="slicer-gcode-panel__header">
        <div className="slicer-gcode-panel__title">
          <FileCode2 size={14} />
          G-code Preview
        </div>
        <div className="slicer-gcode-panel__header-actions">
          <button type="button" onClick={copyVisible} title="Copy visible G-code" aria-label="Copy visible G-code">
            <Copy size={13} />
          </button>
          <button type="button" onClick={() => setOpen(false)} title="Close" aria-label="Close G-code preview">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="slicer-gcode-panel__meta">
        <span>Layer {previewLayer}/{sliceResult.layerCount - 1}</span>
        <span>Z {currentLayerZ.toFixed(2)} mm</span>
        <span>{lines.length} lines</span>
      </div>

      <div className="slicer-gcode-panel__scope" role="tablist" aria-label="G-code preview scope">
        <button type="button" className={scope === 'layer' ? 'is-active' : ''} onClick={() => setScope('layer')}>
          Current layer
        </button>
        <button type="button" className={scope === 'full' ? 'is-active' : ''} onClick={() => setScope('full')}>
          Full file
        </button>
      </div>

      <div className="slicer-gcode-panel__search">
        <Search size={12} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find command, coordinate, comment..."
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear G-code search">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="slicer-gcode-panel__filters" aria-label="G-code filters">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={filter === entry.id ? 'is-active' : ''}
            onClick={() => setFilter(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <label className="slicer-gcode-panel__toggle">
        <input
          type="checkbox"
          checked={showComments}
          onChange={() => setShowComments((value) => !value)}
        />
        Show comments
      </label>

      <div className="slicer-gcode-panel__stats">
        <span><b>{stats.extrusion}</b> extrude</span>
        <span><b>{stats.travel}</b> travel</span>
        <span><b>{stats.temp}</b> temp</span>
        <span><b>{stats.fan}</b> fan</span>
      </div>

      <div className="slicer-gcode-panel__body">
        {lines.length > 0 ? lines.map((line) => (
          <div key={line.lineNumber} className={`slicer-gcode-panel__line ${commandClass(line)}`}>
            <span className="slicer-gcode-panel__line-no">{line.lineNumber}</span>
            <code>{line.text || ' '}</code>
          </div>
        )) : (
          <div className="slicer-gcode-panel__empty">No G-code lines match this view.</div>
        )}
      </div>
    </section>
  );
}
