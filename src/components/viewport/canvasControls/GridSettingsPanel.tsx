import { useState } from 'react';
import { useCADStore } from '../../../store/cadStore';

export default function GridSettingsPanel({ onClose }: { onClose: () => void }) {
  void onClose;
  const gridSize = useCADStore((s) => s.gridSize);
  const setGridSize = useCADStore((s) => s.setGridSize);
  const gridLocked = useCADStore((s) => s.gridLocked);
  const [localSize, setLocalSize] = useState(String(gridSize));

  const apply = () => {
    const val = parseFloat(localSize);
    if (!isNaN(val) && val > 0) {
      setGridSize(val);
    }
  };

  return (
    <div className="cc-panel">
      <div className="cc-panel-title">Grid Settings</div>
      {gridLocked && (
        <div style={{ padding: '4px 8px', fontSize: 10, color: '#888', fontStyle: 'italic' }}>
          Grid is locked. Unlock to change settings.
        </div>
      )}
      <div className="cc-panel-section">
        <div className="cc-panel-field">
          <label className="cc-panel-field-label">Grid Size</label>
          <div className="cc-panel-field-input-wrap">
            <input
              type="number"
              className="cc-panel-field-input"
              value={localSize}
              disabled={gridLocked}
              onChange={(e) => setLocalSize(e.target.value)}
              onBlur={apply}
              onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
              min={0.1}
              step={1}
              style={gridLocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            />
            <span className="cc-panel-field-unit">mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
