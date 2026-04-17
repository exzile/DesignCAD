/**
 * FastenerDialog — D194
 * Fastener library browser that inserts bolts/screws as solid body features.
 */

import { useState } from 'react';
import { X, Check, Wrench } from 'lucide-react';
import '../common/ToolPanel.css';
import { FASTENER_LIBRARY } from '../../../data/FastenerLibrary';
import type { FastenerType, FastenerStandard } from '../../../data/FastenerLibrary';
import { useCADStore } from '../../../store/cadStore';

const TYPE_LABELS: Record<FastenerType, string> = {
  'hex-bolt': 'Hex Bolt',
  'socket-cap': 'Socket Cap Screw',
  'flat-head': 'Flat Head Screw',
  'button-head': 'Button Head Screw',
  'hex-nut': 'Hex Nut',
  'washer': 'Washer',
};

export function FastenerDialog({ onClose }: { onClose: () => void }) {
  const insertFastener = useCADStore((s) => s.insertFastener);
  const [standard, setStandard] = useState<FastenerStandard>('metric');
  const [type, setType] = useState<FastenerType>('hex-bolt');
  const [sizeKey, setSizeKey] = useState('M6');
  const [length, setLength] = useState(20);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);

  const types = [...new Set(FASTENER_LIBRARY.filter(f => f.standard === standard).map(f => f.type))];
  const sizes = FASTENER_LIBRARY.filter(f => f.standard === standard && f.type === type);
  const selected = sizes.find(f => f.size === sizeKey) ?? sizes[0];
  const lengths = selected?.lengths ?? [20];

  const handleTypeChange = (t: FastenerType) => {
    setType(t);
    const first = FASTENER_LIBRARY.find(f => f.standard === standard && f.type === t);
    if (first) { setSizeKey(first.size); setLength(first.lengths[0]); }
  };

  const handleSizeChange = (sz: string) => {
    setSizeKey(sz);
    const spec = FASTENER_LIBRARY.find(f => f.standard === standard && f.type === type && f.size === sz);
    if (spec) setLength(spec.lengths[0]);
  };

  const handleOK = () => {
    if (!selected) return;
    insertFastener({
      type: selected.type,
      size: selected.size,
      diameter: selected.diameter,
      headDiameter: selected.headDiameter,
      headHeight: selected.headHeight,
      length: selected.type === 'hex-nut' || selected.type === 'washer' ? selected.headHeight : length,
      x, y, z,
    });
    onClose();
  };

  return (
    <div className="tool-panel" style={{ width: 280 }}>
      <div className="tp-header">
        <div className="tp-header-icon"><Wrench size={12} /></div>
        <span className="tp-header-title">Insert Fastener</span>
        <button className="tp-close" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="tp-body">
        <div className="tp-section">
          <div className="tp-section-title">Standard</div>
          <div className="tp-row">
            {(['metric', 'imperial'] as FastenerStandard[]).map(s => (
              <button
                key={s}
                className={`tp-btn ${standard === s ? 'tp-btn-ok' : 'tp-btn-cancel'}`}
                style={{ flex: 1, marginRight: s === 'metric' ? 4 : 0 }}
                onClick={() => setStandard(s)}
              >
                {s === 'metric' ? 'Metric' : 'Imperial'}
              </button>
            ))}
          </div>
        </div>
        <div className="tp-section">
          <div className="tp-section-title">Type</div>
          <select className="tp-select" value={type} onChange={e => handleTypeChange(e.target.value as FastenerType)}>
            {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="tp-section">
          <div className="tp-section-title">Size</div>
          <select className="tp-select" value={sizeKey} onChange={e => handleSizeChange(e.target.value)}>
            {sizes.map(s => <option key={s.size} value={s.size}>{s.size}</option>)}
          </select>
        </div>
        {selected && selected.type !== 'hex-nut' && selected.type !== 'washer' && (
          <div className="tp-section">
            <div className="tp-section-title">Length (mm)</div>
            <select className="tp-select" value={length} onChange={e => setLength(Number(e.target.value))}>
              {lengths.map(l => <option key={l} value={l}>{l} mm</option>)}
            </select>
          </div>
        )}
        {selected && (
          <div className="tp-section">
            <div className="tp-section-title" style={{ marginBottom: 4 }}>Dimensions (read-only)</div>
            <div style={{ fontSize: 10, color: '#aaa', padding: '0 2px' }}>
              Ø{selected.diameter} mm shank · Ø{selected.headDiameter} mm head · {selected.headHeight} mm head height
            </div>
          </div>
        )}
        <div className="tp-section">
          <div className="tp-section-title">Insert Position (mm)</div>
          {([['X', x, setX], ['Y', y, setY], ['Z', z, setZ]] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
            <div key={label} className="tp-row">
              <label className="tp-label">{label}</label>
              <div className="tp-input-group">
                <input
                  type="number"
                  value={val}
                  step={1}
                  onChange={e => setter(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="tp-actions">
        <button className="tp-btn tp-btn-cancel" onClick={onClose}><X size={13} /> Cancel</button>
        <button className="tp-btn tp-btn-ok" onClick={handleOK} disabled={!selected}><Check size={13} /> Insert</button>
      </div>
    </div>
  );
}
