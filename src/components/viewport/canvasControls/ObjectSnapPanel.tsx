/**
 * NAV-24: Object Snaps settings panel.
 * Shown in a popover from the CanvasControls snap button.
 * Provides a master toggle + per-type toggles for all 6 snap modes.
 */
import { useCADStore } from '../../../store/cadStore';

export default function ObjectSnapPanel({ onClose }: { onClose: () => void }) {
  void onClose;

  const objectSnapEnabled = useCADStore((s) => s.objectSnapEnabled);
  const setObjectSnapEnabled = useCADStore((s) => s.setObjectSnapEnabled);
  const snapToEndpoint = useCADStore((s) => s.snapToEndpoint);
  const setSnapToEndpoint = useCADStore((s) => s.setSnapToEndpoint);
  const snapToMidpoint = useCADStore((s) => s.snapToMidpoint);
  const setSnapToMidpoint = useCADStore((s) => s.setSnapToMidpoint);
  const snapToCenter = useCADStore((s) => s.snapToCenter);
  const setSnapToCenter = useCADStore((s) => s.setSnapToCenter);
  const snapToIntersection = useCADStore((s) => s.snapToIntersection);
  const setSnapToIntersection = useCADStore((s) => s.setSnapToIntersection);
  const snapToPerpendicular = useCADStore((s) => s.snapToPerpendicular);
  const setSnapToPerpendicular = useCADStore((s) => s.setSnapToPerpendicular);
  const snapToTangent = useCADStore((s) => s.snapToTangent);
  const setSnapToTangent = useCADStore((s) => s.setSnapToTangent);

  const SNAP_TYPES = [
    { label: 'Endpoint', value: snapToEndpoint, set: setSnapToEndpoint, indicator: '⬛', color: '#ff8844' },
    { label: 'Midpoint', value: snapToMidpoint, set: setSnapToMidpoint, indicator: '◆', color: '#ffcc44' },
    { label: 'Center', value: snapToCenter, set: setSnapToCenter, indicator: '⊕', color: '#44aaff' },
    { label: 'Intersection', value: snapToIntersection, set: setSnapToIntersection, indicator: '✕', color: '#44ff88' },
    { label: 'Perpendicular', value: snapToPerpendicular, set: setSnapToPerpendicular, indicator: '⊾', color: '#cc88ff' },
    { label: 'Tangent', value: snapToTangent, set: setSnapToTangent, indicator: '◯', color: '#ff88cc' },
  ] as const;

  return (
    <div className="cc-panel" style={{ minWidth: 170 }}>
      <div className="cc-panel-title">Object Snaps</div>
      <div className="cc-panel-section">
        {/* Master toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
          <input
            type="checkbox"
            checked={objectSnapEnabled}
            onChange={(e) => setObjectSnapEnabled(e.target.checked)}
          />
          Enable Object Snaps
        </label>
        <div style={{ height: 1, background: '#333355', margin: '4px 0' }} />
        {/* Per-type toggles */}
        {SNAP_TYPES.map(({ label, value, set, indicator, color }) => (
          <label
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 4px',
              cursor: objectSnapEnabled ? 'pointer' : 'not-allowed',
              opacity: objectSnapEnabled ? 1 : 0.45,
              fontSize: 11,
            }}
          >
            <input
              type="checkbox"
              checked={value}
              disabled={!objectSnapEnabled}
              onChange={(e) => set(e.target.checked)}
            />
            <span style={{ color, fontSize: 12, fontFamily: 'monospace', width: 14 }}>{indicator}</span>
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
